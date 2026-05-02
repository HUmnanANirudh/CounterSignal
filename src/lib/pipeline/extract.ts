import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { tavily } from "@tavily/core";
import type { PreprocessedData, ExtractedData } from "@/types";
import { needsFallback } from "./preprocess";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

async function fetchFallbackContent(url: string): Promise<string> {
  try {
    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
    const result = await tvly.search(`site:${url}`, { maxResults: 1, includeAnswer: true });
    return result.answer || result.results[0]?.content || "";
  } catch {
    return "";
  }
}

function parseJsonResponse(text: string): ExtractedData | null {
  let cleaned = text.trim();

  // Find the first { and last } to extract JSON
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error(`[Extract] Could not find valid JSON boundaries`);
    return null;
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  // Count braces to check balance
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    console.error(`[Extract] Unbalanced braces: { = ${openBraces}, } = ${closeBraces}`);
    return null;
  }

  try {
    return JSON.parse(cleaned) as ExtractedData;
  } catch (e: unknown) {
    console.error(`[Extract] JSON parse failed: ${(e as Error).message}`);
    return null;
  }
}

function validatePricingData(pricing: ExtractedData["pricing_posture"]): ExtractedData["pricing_posture"] {
  // Reject transaction model with fixed dollar entry price
  if (pricing.model?.toLowerCase().includes("transaction")) {
    if (pricing.entryPrice && pricing.entryPrice.includes("$") && !pricing.entryPrice.includes("%")) {
      console.warn(`[Extract] Invalid pricing: transaction model with fixed dollar price: ${pricing.entryPrice}`);
      return { ...pricing, entryPrice: "opaque" };
    }
  }
  return pricing;
}

// Validate extracted data for hallucinations
function validateExtractedData(data: ExtractedData): ExtractedData {
  // Check for hallucinated pricing patterns
  const entryPrice = data.pricing_posture?.entryPrice || "";

  // Pattern: percentage + "capped" together is suspicious for payment gateways
  if (entryPrice.match(/\d+\s*%.*capped/i) || entryPrice.match(/capped.*\d+\s*%/i)) {
    console.warn(`[Extract] Suspicious pricing pattern detected: ${entryPrice}`);
    data.pricing_posture = { ...data.pricing_posture, entryPrice: "opaque", opacity: "opaque" };
  }

  // Pattern: multiple conflicting $ amounts in entry price
  const dollarMatches = entryPrice.match(/\$\d+/g);
  if (dollarMatches && dollarMatches.length > 2) {
    console.warn(`[Extract] Too many dollar amounts in entryPrice: ${entryPrice}`);
    data.pricing_posture = { ...data.pricing_posture, entryPrice: "opaque", opacity: "opaque" };
  }

  // Pattern: "9 percent" or "8 percent" is likely hallucinated for Stripe
  if (entryPrice.match(/9\s*percent/) || entryPrice.match(/8\s*percent/)) {
    console.warn(`[Extract] Generic percentage pricing likely hallucinated: ${entryPrice}`);
    data.pricing_posture = { ...data.pricing_posture, entryPrice: "opaque", opacity: "opaque" };
  }

  // Reject merged pricing models (transaction + subscription + per-item)
  const model = data.pricing_posture?.model || "";
  if (model.includes(",") || (model.includes("transaction") && model.includes("subscription"))) {
    console.warn(`[Extract] Merged pricing models detected: ${model}`);
    data.pricing_posture = { ...data.pricing_posture, model: "unknown" };
  }

  return data;
}

const EXTRACTION_MAX_RETRIES = 1;

export async function extract(
  preprocessed: PreprocessedData,
  competitor: string,
  citations: Array<{ url: string; source?: string }>
): Promise<ExtractedData> {
  console.log(`[Extract] Starting extraction for ${competitor}`);
  console.log(`[Extract] Pricing candidates: ${preprocessed.pricing_candidates.length}`);
  console.log(`[Extract] Complaints: ${preprocessed.complaint_sentences.length}`);
  console.log(`[Extract] Reviews: ${preprocessed.review_blocks.length}`);

  let processedData = preprocessed;

  if (needsFallback(preprocessed)) {
    console.log(`[Extract] Using fallback for additional content`);
    const urlsToFetch = citations.slice(0, 3).map(c => c.url);
    const fallbackContent = await Promise.all(urlsToFetch.map(fetchFallbackContent));
    const fallbackText = fallbackContent.filter(Boolean).join("\n\n");
    if (fallbackText) {
      processedData = {
        ...preprocessed,
        raw_content: (preprocessed.raw_content + "\n\n---ADDITIONAL DATA---\n" + fallbackText).slice(0, 8000),
      };
    }
  }

  const model = google("gemini-2.5-flash");

  const pricingInfo = preprocessed.pricing_candidates.slice(0, 8).join("\n") || "None found";
  const complaintInfo = preprocessed.complaint_sentences.slice(0, 8).join("\n") || "None found";
  const reviewInfo = preprocessed.review_blocks.slice(0, 5).join("\n") || "None found";

  const prompt = `Extract fintech competitor data for "${competitor}". Return ONLY valid JSON.

CRITICAL RULES - VIOLATION = REJECTED OUTPUT:
1. PRICING MODEL: Must be ONE of: subscription, transaction, freemium, custom, unknown. NOT multiple merged models.
2. ENTRY PRICE:
   - For transaction models: must be percentage + fixed fee (e.g., "2.9% + $0.30"). NEVER a fixed dollar amount alone.
   - If no clear pricing found: set to "opaque". Do NOT guess.
3. CATEGORIES MUST BE SEPARATE: payments pricing, issuing fees, and subscription plans are DIFFERENT. Never merge them.
4. INVALID PATTERNS (will cause rejection):
   - "9%" or "8%" without specific context (Stripe doesn't publish these rates)
   - Any price with "capped" that includes a percentage (e.g., "8% capped at $5")
   - Multiple conflicting dollar amounts in entryPrice

Data:
${processedData.raw_content.slice(0, 2000)}

Pricing candidates: ${pricingInfo}
Complaints: ${complaintInfo}
Reviews: ${reviewInfo}

JSON (only one model, one entryPrice):
{"competitor_summary":"string","positioning":{"tagline":"string","targetSegments":[],"differentiators":[]},"pricing_posture":{"model":"subscription|transaction|freemium|custom|unknown","entryPrice":"string","tiers":[],"opacity":"clear|opaque"},"recent_moves":[],"customer_truths":{"positives":[],"negatives":[],"keyComplaints":[]}}

Return ONLY the JSON object. No markdown, no explanation.`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= EXTRACTION_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[Extract] Retry attempt ${attempt}...`);
    }

    console.log(`[Extract] Calling LLM...`);

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.05, // Lower temperature for more deterministic output
      maxOutputTokens: 8192,
    });

    console.log(`[Extract] LLM response preview: ${text.slice(0, 150)}...`);

    const parsed = parseJsonResponse(text);

    if (parsed) {
      // Validate and sanitize pricing
      const validated = validateExtractedData(parsed);
      const finalPricing = validatePricingData(validated.pricing_posture);
      validated.pricing_posture = finalPricing;

      const complaintCount = validated.customer_truths?.keyComplaints?.length || 0;
      console.log(`[Extract] Extracted ${complaintCount} complaints`);

      return validated;
    }

    lastError = new Error(`JSON parse failed after ${attempt + 1} attempt(s)`);
    console.error(`[Extract] Attempt ${attempt + 1} failed`);
  }

  console.error(`[Extract] FAILED after ${EXTRACTION_MAX_RETRIES + 1} attempts. Aborting pipeline.`);
  throw lastError;
}
