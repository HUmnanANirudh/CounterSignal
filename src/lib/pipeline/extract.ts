import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { PreprocessedData, ExtractedData } from "@/types";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function extract(
  preprocessed: PreprocessedData,
  competitor: string
): Promise<ExtractedData> {
  const model = google("gemini-2.5-flash-lite");

  const prompt = `You are a fintech competitive intelligence analyst. Extract structured data from research about "${competitor}".

Research context:
${preprocessed.raw_content}

Also extract from these structured hints:
- Pricing mentions: ${preprocessed.pricing_candidates.slice(0, 5).join("; ") || "none found"}
- Review blocks: ${preprocessed.review_blocks.slice(0, 3).join("; ") || "none found"}
- Complaints: ${preprocessed.complaint_sentences.slice(0, 5).join("; ") || "none found"}
- Feature mentions: ${preprocessed.feature_mentions.slice(0, 3).join("; ") || "none found"}

Return a JSON object with this exact structure:
{
  "competitor_summary": "2-3 sentence overview of the company",
  "positioning": {
    "tagline": "their main value proposition in 1 sentence",
    "targetSegments": ["segment1", "segment2"],
    "differentiators": ["diff1", "diff2", "diff3"]
  },
  "pricing_posture": {
    "model": "subscription|transaction|freemium|custom|unknown",
    "entryPrice": "what new customers pay starting price or 'opaque' if not found",
    "tiers": [{"name": "tier name", "price": "price", "features": ["f1", "f2"]}],
    "opacity": "clear if pricing found, opaque if not found"
  },
  "recent_moves": [{"name": "launch name", "date": "2024 or 2025", "impact": "high|medium|low"}],
  "customer_truths": {
    "positives": ["praise from customers"],
    "negatives": ["criticism from customers"],
    "keyComplaints": ["top 3 specific complaints"]
  }
}

Return ONLY the JSON object, no additional text.`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.2,
    maxOutputTokens: 1024,
  });

  try {
    const parsed = JSON.parse(text.trim()) as ExtractedData;
    return parsed;
  } catch {
    return {
      competitor_summary: preprocessed.raw_content.slice(0, 300) + "...",
      positioning: { tagline: "unknown", targetSegments: [], differentiators: [] },
      pricing_posture: { model: "unknown", entryPrice: "opaque", tiers: [], opacity: "opaque" },
      recent_moves: [],
      customer_truths: { positives: [], negatives: [], keyComplaints: [] },
    };
  }
}