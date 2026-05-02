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

  // Strip markdown code fences (both ```json and plain ```)
  cleaned = cleaned.replace(/^```json\s*/m, '').replace(/```\s*$/m, '');
  cleaned = cleaned.replace(/^```\s*/m, '').replace(/```\s*$/m, '');

  // Handle single backticks if present
  if (cleaned.startsWith('`') && !cleaned.startsWith('``')) {
    cleaned = cleaned.replace(/^`+/, '').replace(/`+$/, '');
  }

  // Find JSON object - find first { and last }
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  try {
    return JSON.parse(cleaned) as ExtractedData;
  } catch (e) {
    console.error(`[Extract] JSON parse failed: ${e}`);
    return null;
  }
}

function validatePricingData(pricing: ExtractedData["pricing_posture"]): ExtractedData["pricing_posture"] {
  if (pricing.model?.toLowerCase().includes("transaction")) {
    if (pricing.entryPrice && pricing.entryPrice.includes("$")) {
      console.warn(`[Extract] Invalid pricing: transaction model shouldn't have fixed dollar price: ${pricing.entryPrice}`);
      return { ...pricing, entryPrice: "Percentage + fixed per-transaction fee" };
    }
  }
  return pricing;
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

  const prompt = `You are a fintech competitive intelligence analyst. Extract STRICTLY VALIDATED information about "${competitor}".

CRITICAL VALIDATION RULES:
1. PRICING: Only extract pricing if explicitly stated. If model is "transaction", entryPrice should be percentage-based (e.g., "2.9% + $0.30"), never a fixed dollar amount like "$99/month". If no clear pricing found, set opacity to "opaque".
2. CATEGORIES: Never merge different pricing categories. Payments pricing, issuing fees, and optional features must be separate. If you cannot distinguish, mark as "opaque".
3. COMPLAINTS: Only include complaints from ≥2 independent sources (review, news, forum types). Single-source complaints are noise.
4. HONESTY: If data is insufficient or conflicting, set fields to "limited_data" or "opaque". Do NOT merge conflicting data.

Research Data (prioritized by signal type):
${processedData.raw_content.slice(0, 4000)}

Extracted Pricing Data:
${pricingInfo}

Extracted Complaints (keep only cross-validated ones):
${complaintInfo}

Extracted Reviews:
${reviewInfo}

Return ONLY a valid JSON object with this structure:
{
  "competitor_summary": "2-3 sentence overview based ONLY on the research data",
  "positioning": {
    "tagline": "1 sentence value proposition from research",
    "targetSegments": ["segment1", "segment2"],
    "differentiators": ["diff1", "diff2"]
  },
  "pricing_posture": {
    "model": "subscription|transaction|freemium|custom|unknown",
    "entryPrice": "only if clearly and consistently stated, otherwise 'opaque'",
    "tiers": [],
    "opacity": "clear|opaque"
  },
  "recent_moves": [],
  "customer_truths": {
    "positives": ["only if mentioned in review data"],
    "negatives": ["only if complaint appears in multiple sources"],
    "keyComplaints": ["only cross-validated complaints (≥2 sources)"]
  }
}

IMPORTANT: Be conservative. If pricing is unclear or conflicting, mark as opaque. Do not hallucinate merged pricing.`;

  // Retry loop for extraction
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= EXTRACTION_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[Extract] Retry attempt ${attempt}...`);
    }

    console.log(`[Extract] Calling LLM...`);

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.1,
      maxOutputTokens: 4096,
    });

    console.log(`[Extract] LLM response preview: ${text.slice(0, 200)}...`);

    const parsed = parseJsonResponse(text);

    if (parsed) {
      parsed.pricing_posture = validatePricingData(parsed.pricing_posture);

      const complaintCount = parsed.customer_truths?.keyComplaints?.length || 0;
      console.log(`[Extract] Extracted ${complaintCount} complaints, ${parsed.customer_truths?.positives?.length || 0} positives`);

      return parsed;
    }

    lastError = new Error(`JSON parse failed after ${attempt + 1} attempt(s)`);
    console.error(`[Extract] Attempt ${attempt + 1} failed`);
  }

  // All retries exhausted - throw error to abort pipeline
  console.error(`[Extract] FAILED after ${EXTRACTION_MAX_RETRIES + 1} attempts. Aborting pipeline.`);
  throw lastError;
}