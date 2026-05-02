import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { tavily } from "@tavily/core";
import type { PreprocessedData, ExtractedData } from "@/types";
import { needsFallback } from "./preprocess";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const RECENT_DAYS = 180;

async function fetchFallbackContent(url: string): Promise<string> {
  try {
    const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY! });
    const result = await tvly.search(`site:${url}`, { maxResults: 1, includeAnswer: true });
    return result.answer || result.results[0]?.content || "";
  } catch {
    return "";
  }
}

export async function extract(
  preprocessed: PreprocessedData,
  competitor: string,
  citations: Array<{ url: string }>
): Promise<ExtractedData> {
  let processedData = preprocessed;

  if (needsFallback(preprocessed)) {
    const urlsToFetch = citations.slice(0, 2).map(c => c.url);
    const fallbackContent = await Promise.all(urlsToFetch.map(fetchFallbackContent));
    const fallbackText = fallbackContent.filter(Boolean).join("\n");
    if (fallbackText) {
      processedData = {
        ...preprocessed,
        raw_content: (preprocessed.raw_content + "\n" + fallbackText).slice(0, 6000),
      };
    }
  }

  const model = google("gemini-2.5-flash-lite");

  const hints = [
    preprocessed.pricing_candidates.length > 0 ? `Pricing: ${preprocessed.pricing_candidates.slice(0, 5).join("; ")}` : null,
    preprocessed.review_blocks.length > 0 ? `Reviews: ${preprocessed.review_blocks.slice(0, 3).join("; ")}` : null,
    preprocessed.complaint_sentences.length > 0 ? `Complaints: ${preprocessed.complaint_sentences.slice(0, 5).join("; ")}` : null,
    preprocessed.feature_mentions.length > 0 ? `Features: ${preprocessed.feature_mentions.slice(0, 3).join("; ")}` : null,
  ].filter(Boolean).join("\n");

  const prompt = `You are a fintech competitive intelligence analyst. Extract structured data from research about "${competitor}".

Research context:
${processedData.raw_content}

Structured hints:
${hints}

IMPORTANT for recent_moves:
- Only include launches from the last ${RECENT_DAYS} days
- Only include if keywords: "launched", "announced", "released" are present
- If no recent launches found, return empty array for recent_moves
- Do NOT hallucinate product names

Return a JSON object:
{
  "competitor_summary": "2-3 sentence overview",
  "positioning": {
    "tagline": "value proposition in 1 sentence",
    "targetSegments": ["segment1"],
    "differentiators": ["diff1"]
  },
  "pricing_posture": {
    "model": "subscription|transaction|freemium|custom|unknown",
    "entryPrice": "starting price or 'opaque'",
    "tiers": [{"name": "tier", "price": "price", "features": ["f1"]}],
    "opacity": "clear|opaque"
  },
  "recent_moves": [{"name": "launch", "date": "2024-2025", "impact": "high|medium|low"}],
  "customer_truths": {
    "positives": ["praise"],
    "negatives": ["criticism"],
    "keyComplaints": ["complaint"]
  }
}

Return ONLY the JSON object.`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.2,
    maxOutputTokens: 1024,
  });

  try {
    const parsed = JSON.parse(text.trim());
    return parsed as ExtractedData;
  } catch {
    return {
      competitor_summary: preprocessed.raw_content.slice(0, 300) || "No data available",
      positioning: { tagline: "unknown", targetSegments: [], differentiators: [] },
      pricing_posture: { model: "unknown", entryPrice: "opaque", tiers: [], opacity: "opaque" },
      recent_moves: [],
      customer_truths: { positives: [], negatives: [], keyComplaints: [] },
    };
  }
}