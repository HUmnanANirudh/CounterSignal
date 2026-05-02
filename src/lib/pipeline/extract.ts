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
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1];
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  try {
    return JSON.parse(cleaned) as ExtractedData;
  } catch {
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

  const model = google("gemini-2.5-flash-lite");

  const pricingInfo = preprocessed.pricing_candidates.slice(0, 8).join("\n") || "None found";
  const complaintInfo = preprocessed.complaint_sentences.slice(0, 8).join("\n") || "None found";
  const reviewInfo = preprocessed.review_blocks.slice(0, 5).join("\n") || "None found";

  const prompt = `You are a fintech competitive intelligence analyst. Extract STRICTLY VALIDATED information about "${competitor}".

CRITICAL VALIDATION RULES:
1. PRICING: If the model is "transaction", do NOT assign a fixed entry price like "$59". Transaction models use % + fixed fee. If no clear pricing found, set entryPrice to "opaque".
2. COMPLAINTS: Only include complaints that are mentioned in multiple sources (≥2). Single-source complaints are anecdotal noise.
3. SOURCES: Track which source each piece of data comes from.

Research Data (prioritized by signal type):
${processedData.raw_content.slice(0, 5000)}

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
    "entryPrice": "only if clearly stated as fixed price (e.g., '$99/month'), otherwise 'opaque' for transaction models or percentage-based",
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

IMPORTANT: If you cannot find clear pricing data, set opacity to "opaque". Do not guess or generalize.`;

  console.log(`[Extract] Calling LLM...`);

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.1,
    maxOutputTokens: 2048,
  });

  console.log(`[Extract] LLM response preview: ${text.slice(0, 200)}...`);

  const parsed = parseJsonResponse(text);

  if (parsed) {
    parsed.pricing_posture = validatePricingData(parsed.pricing_posture);

    const complaintCount = parsed.customer_truths?.keyComplaints?.length || 0;
    console.log(`[Extract] Extracted ${complaintCount} complaints, ${parsed.customer_truths?.positives?.length || 0} positives`);

    return parsed;
  }

  console.error(`[Extract] Failed to parse JSON`);
  return {
    competitor_summary: preprocessed.raw_content.slice(0, 300) || `${competitor} is a fintech.`,
    positioning: { tagline: "unknown", targetSegments: [], differentiators: [] },
    pricing_posture: { model: "unknown", entryPrice: "opaque", tiers: [], opacity: "opaque" },
    recent_moves: [],
    customer_truths: { positives: [], negatives: [], keyComplaints: [] },
  };
}