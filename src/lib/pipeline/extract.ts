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

  // Strip markdown code blocks if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  // Handle LLM error responses
  if (cleaned.toLowerCase().includes("error") || cleaned.toLowerCase().includes("unable to") || cleaned.toLowerCase().includes("no competitor")) {
    console.error(`[Extract] LLM returned error text: ${cleaned.slice(0, 100)}...`);
    return null;
  }

  // Find the first { and last } to extract JSON
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error(`[Extract] Could not find valid JSON boundaries`);
    return null;
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  // Try parsing - if fails, try progressively removing problematic trailing content
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    // Count braces to check balance
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;

    if (openBraces === closeBraces) {
      try {
        return JSON.parse(cleaned) as ExtractedData;
      } catch {
        // Try removing trailing problematic content
      }
    }

    // Try trimming problematic trailing content
    cleaned = cleaned.slice(0, -1);
    attempts++;
  }

  // Final attempt with trimmed version
  const trimmed = cleaned.trim();
  try {
    return JSON.parse(trimmed) as ExtractedData;
  } catch (e: unknown) {
    console.error(`[Extract] JSON parse failed after ${attempts} attempts: ${(e as Error).message}`);
    console.error(`[Extract] Sample: ${trimmed.slice(0, 200)}...`);
    return null;
  }
}

// Schema guard: ensure extracted data has required structure
function safeExtract(data: ExtractedData | null, competitor: string): ExtractedData {
  if (!data) {
    return fallbackExtractedData(competitor);
  }

  return {
    positioning: data.positioning || { tagline: "unknown", targetSegments: [], differentiators: [] },
    pricing_posture: data.pricing_posture || { model: "unknown", entryPrice: "opaque", tiers: [], opacity: "opaque" },
    recent_moves: data.recent_moves || [],
    customer_truths: data.customer_truths || { positives: [], negatives: [], keyComplaints: [] },
  };
}

function fallbackExtractedData(competitor: string): ExtractedData {
  return {
    positioning: {
      tagline: `${competitor} operates in fintech. Limited public pricing data available.`,
      targetSegments: [],
      differentiators: [],
    },
    pricing_posture: {
      model: "opaque",
      entryPrice: "unknown",
      tiers: [],
      opacity: "opaque",
    },
    recent_moves: [],
    customer_truths: {
      positives: [],
      negatives: [],
      keyComplaints: [],
    },
  };
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

  // Pattern: "9 percent" or "8 percent" is likely hallucinated for any competitor
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

const EXTRACTION_MAX_RETRIES = 0; // Single attempt for latency

const MAX_CONTEXT_CHARS = 4000; // Cap context for latency

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

  const pricingInfo = preprocessed.pricing_candidates.slice(0, 4).join("\n") || "None found";
  const complaintInfo = preprocessed.complaint_sentences.slice(0, 4).join("\n") || "None found";
  const reviewInfo = preprocessed.review_blocks.slice(0, 3).join("\n") || "None found";

  // Include negative signals (fraud, regulatory, financial) in the prompt
  const v2Preprocessed = preprocessed as { negative_signals?: Array<{ text: string; type: string }> };
  const negativeSignalsInfo = v2Preprocessed.negative_signals?.map(s => `[${s.type}] ${s.text}`).join("\n") || "None found";

  const prompt = `Extract fintech competitor data for "${competitor}". Return ONLY valid JSON.

CRITICAL RULES - VIOLATION = REJECTED OUTPUT:
1. DIFFERENTIATORS: Must be product capabilities or GTM advantages, NOT credentials (funding, G2 ratings, unicorn status). E.g. "API-first architecture" NOT "unicorn status".
2. TAGLINE: Must describe what the competitor actually does as a product, NOT generic descriptors. E.g. "Payment gateway for Indian businesses" NOT "a leading fintech platform".
3. PRICING MODEL: Must be ONE of: subscription, transaction, transaction+MDR, transaction+volume-linked, freemium, custom, unknown. For wallets/gateways use "transaction+MDR" not just "transaction".
4. ENTRY PRICE:
   - For transaction models: must be percentage + fixed fee (e.g., "2.9% + ₹0.30"). NEVER a fixed dollar amount alone.
   - If no clear pricing found: set to "opaque". Do NOT guess.
5. CATEGORIES MUST BE SEPARATE: payments pricing, issuing fees, and subscription plans are DIFFERENT. Never merge them.
6. INVALID PATTERNS (will cause rejection):
   - "9%" or "8%" without specific context (Stripe doesn't publish these rates)
   - Any price with "capped" that includes a percentage (e.g., "8% capped at $5")
   - Multiple conflicting dollar amounts in entryPrice

7. CUSTOMER TRUTHS MUST INCLUDE: Include any fraud incidents, regulatory issues, financial instability signals as keyComplaints. Example: "₹40Cr fraud incident" should appear in keyComplaints, not just negatives.
8. REVIEW SENTIMENT INTERPRETATION: 3-3.9 stars = "moderate/mixed sentiment" NOT "high satisfaction". 4+ stars = "positive sentiment". Below 3 = "negative sentiment". Do not overstate satisfaction.

Data:
${processedData.raw_content.slice(0, MAX_CONTEXT_CHARS)}

Pricing candidates: ${pricingInfo}
Complaints: ${complaintInfo}
Reviews: ${reviewInfo}
Negative signals (fraud/regulatory/financial): ${negativeSignalsInfo}

JSON (only one model, one entryPrice):
{"positioning":{"tagline":"string","targetSegments":[],"differentiators":[]},"pricing_posture":{"model":"subscription|transaction|transaction+MDR|transaction+volume-linked|freemium|custom|unknown","entryPrice":"string","tiers":[],"opacity":"clear|opaque"},"recent_moves":[],"customer_truths":{"positives":[],"negatives":[],"keyComplaints":[]}}

Return ONLY the JSON object. No markdown, no explanation.`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= EXTRACTION_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[Extract] Retry attempt ${attempt}...`);
    }

    console.log(`[Extract] Calling LLM...`);

    let text: string;
    try {
      const result = await generateText({
        model,
        prompt,
        temperature: 0.05,
        maxOutputTokens: 4096, // Reduced for latency
      });
      text = result.text;
    } catch (err) {
      console.error(`[Extract] LLM call failed: ${err instanceof Error ? err.message : String(err)}`);
      lastError = err instanceof Error ? err : new Error(String(err));
      continue; // Try again or fall through to fallback
    }

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

  // FALLBACK: Never crash the pipeline. Return safe fallback data.
  console.error(`[Extract] FAILED after ${EXTRACTION_MAX_RETRIES + 1} attempts. Using fallback data.`);
  return safeExtract(null, competitor);
}