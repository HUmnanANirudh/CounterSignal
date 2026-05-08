import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { PreprocessedData, ExtractedIntelligence } from "@/types";
import { isValidSignalText } from "./sanitize";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });


function parseJsonResponse(text: string): ExtractedIntelligence | null {
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

  // Extract candidate JSON string
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  // Try parsing first - if it works, return immediately
  try {
    return JSON.parse(cleaned) as ExtractedIntelligence;
  } catch {
    // Continue to retry logic
  }

  // Try progressively removing trailing content to find valid JSON
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    // Count braces to check balance
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;

    if (openBraces === closeBraces) {
      try {
        return JSON.parse(cleaned) as ExtractedIntelligence;
      } catch {
        // Continue trimming
      }
    }

    // Remove last character and try again
    cleaned = cleaned.slice(0, -1);
    attempts++;
  }

  // Final attempt with trimmed version
  const trimmed = cleaned.trim();
  try {
    return JSON.parse(trimmed) as ExtractedIntelligence;
  } catch (e: unknown) {
    console.error(`[Extract] JSON parse failed after ${attempts} attempts: ${(e as Error).message}`);
    console.error(`[Extract] Sample: ${trimmed.slice(0, 200)}...`);
    return null;
  }
}


function validatePricingData(pricing: ExtractedIntelligence["pricing_posture"]): ExtractedIntelligence["pricing_posture"] {
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
function validateExtractedIntelligence(data: ExtractedIntelligence): ExtractedIntelligence {
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
): Promise<ExtractedIntelligence> {
  console.log(`[Extract] Starting extraction for ${competitor}`);
  console.log(`[Extract] Pricing candidates: ${preprocessed.pricing_candidates.length}`);
  console.log(`[Extract] Complaints: ${preprocessed.complaint_sentences.length}`);
  console.log(`[Extract] Reviews: ${preprocessed.review_blocks.length}`);

  const processedData = preprocessed;

  // NO FALLBACK: If extraction is weak, we STOP - not fill with additional content
  // Fallback content injects noise and produces hallucinated battlecards
  const hasWeakData = preprocessed.pricing_candidates.length === 0 && preprocessed.complaint_sentences.length === 0 && (!preprocessed.negative_signals || preprocessed.negative_signals.length === 0);
  if (hasWeakData) {
    console.log(`[Extract] Weak data detected (no pricing, no complaints, no negative signals) — extraction will likely produce minimal results`);
  }

  const model = google("gemini-2.5-flash-lite");

  // Clean pricing candidates before synthesis to avoid leaking OCR noise
  const pricingInfo = preprocessed.pricing_candidates
    .filter(isValidSignalText)
    .slice(0, 4)
    .join("\n") || "None found";
  
  const complaintInfo = preprocessed.complaint_sentences
    .filter(isValidSignalText)
    .slice(0, 4)
    .join("\n") || "None found";
    
  const reviewInfo = preprocessed.review_blocks
    .filter(isValidSignalText)
    .slice(0, 3)
    .join("\n") || "None found";

  const negativeSignalsInfo = preprocessed.negative_signals?.map(s => `[${s.type}] ${s.text}`).join("\n") || "None found";

  const prompt = `Extract fintech competitor data for "${competitor}". Return ONLY valid JSON.
Extract ALL significant moves, product launches, regulatory events, and strategic updates identified in the data. Do not limit the count.

CRITICAL RULES - VIOLATION = REJECTED OUTPUT:
1. DIFFERENTIATORS: Must be product capabilities or GTM advantages, NOT credentials (funding, G2 ratings, unicorn status).
2. DATES: Every move MUST have a date. Use the Year (e.g. "2024") if specific day/month is missing. Avoid "unknown" if a year can be inferred from context.
3. PRICING POSTURE: Do NOT render raw evidence or fragments. SYNTHESIZE a commercial posture from the data (e.g. "Transitioning toward fee-based monetization", "Push toward transaction monetization"). Return as an array of 2-3 professional bullets in a "synthesis" field within pricing_posture.
4. CUSTOMER SENTIMENT: Extract specific operational patterns (e.g. "unresponsive support", "seamless integration") rather than generic adjectives.
5. REVIEW INTERPRETATION: 3-3.9 stars = "moderate/mixed sentiment". 4+ stars = "positive". Below 3 = "negative".
6. TARGET SEGMENTS: Be specific (e.g., "Series A fintechs") not generic ("Enterprise").
7. CUSTOMER TRUTHS: Include fraud incidents, regulatory issues, and financial signals in keyComplaints.
8. BUYER-OPERATIONAL TRUTHS: Strengths/Weaknesses must be operational (e.g. "Simplifies global tax" NOT "Easy to use").
9. STRATEGIC OVERLAP: Map the COMPETITOR'S capabilities: "payment_routing", "deposit_lifecycle", "kyc_kyb", "banking_compliance", "tax_handling", "reg_orchestration". Values: "native", "partnered", "partial", "none".
10. EVENT TAXONOMY: Categorize strictly as: "PRODUCT_LAUNCH", "REGULATORY_ENFORCEMENT", "LICENSE_ACTION", "STRATEGIC_RESTRUCTURE", "FUNDING", "MARKET_EXPANSION".
11. NOISE REJECTION: REJECT any fragments containing "Datalabs_in-article-icon", malformed HTML, or dangling punctuation.
12. STRATEGIC RELEVANCE: Provide analytical GTM implications, not news-dumps.
13. VARS ACKNOWLEDGE: Transform features into executive-level operational implications.

Data:
${processedData.raw_content.slice(0, MAX_CONTEXT_CHARS)}

Pricing candidates: ${pricingInfo}
Complaints: ${complaintInfo}
Reviews: ${reviewInfo}
Negative signals (fraud/regulatory/financial): ${negativeSignalsInfo}

JSON (only one model, one entryPrice):
{"positioning":{"tagline":"string","targetSegments":[],"differentiators":[]},"pricing_posture":{"model":"string","entryPrice":"string","tiers":[],"opacity":"clear|opaque","synthesis":["bullet1","bullet2"]},"recent_moves":[{"name":"string","date":"string","impact":"high|medium|low","type":"PRODUCT_LAUNCH|REGULATORY_ENFORCEMENT|LICENSE_ACTION|STRATEGIC_RESTRUCTURE|FUNDING|MARKET_EXPANSION","strategic_relevance":"string"}],"customer_truths":{"positives":[],"negatives":[],"keyComplaints":[]},"strategic_overlap":{"payment_routing":"native|partnered|partial|none","deposit_lifecycle":"native|partnered|partial|none","kyc_kyb":"native|partnered|partial|none","banking_compliance":"native|partnered|partial|none","tax_handling":"native|partnered|partial|none","reg_orchestration":"native|partnered|partial|none"},"decision_orientation":{"compete_aggressively_when":[],"do_not_compete_when":[],"why_this_appears_in_deals":[]},"VARS":{"validate":"string","acknowledge":"string"}}

Return ONLY the JSON object. No markdown, no explanation.`;
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
        maxOutputTokens: 8192, // Increased to ensure full JSON completion
      });
      text = result.text;
    } catch (err) {
      console.error(`[Extract] LLM call failed: ${err instanceof Error ? err.message : String(err)}`);
      continue; // Try again or fall through to fallback
    }

    console.log(`[Extract] LLM response preview: ${text.slice(0, 150)}...`);

    const parsed = parseJsonResponse(text);

    if (parsed) {
      // Validate and sanitize pricing
      const validated = validateExtractedIntelligence(parsed);
      const finalPricing = validatePricingData(validated.pricing_posture);
      validated.pricing_posture = finalPricing;

      const complaintCount = validated.customer_truths?.keyComplaints?.length || 0;
      console.log(`[Extract] Extracted ${complaintCount} complaints`);

      return validated;
    }


    console.error(`[Extract] Attempt ${attempt + 1} failed`);
  }

  // EXTRACTION GATE: No fallback - fail hard on invalid JSON
  // This prevents hallucinated structure from propagating
  console.error(`[Extract] EXTRACTION FAILED - returning error for pipeline gate`);
  throw new Error(`Extraction incomplete: JSON parse failed. Entity may lack sufficient data.`);
}