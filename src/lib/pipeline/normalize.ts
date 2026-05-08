import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { Signal } from "@/types";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY });

export async function normalizeSignals(rawSignals: Omit<Signal, 'summary' | 'evidence'>[]): Promise<Signal[]> {
  if (rawSignals.length === 0) return [];

  console.log(`[Normalize] Normalizing ${rawSignals.length} signals via LLM...`);

  const preFiltered = rawSignals.filter(s => {
    if (!s.value || s.value.length < 20) return false;
    if (s.value.includes("http://") || s.value.includes("https://")) return false;
    if (s.value.startsWith("[") && s.value.includes("]")) return false; // Markdown links/refs
    if (/cookie|privacy policy|terms of service|copyright|all rights reserved/i.test(s.value)) return false;
    if (s.value.split(/\s+/).length < 5) return false; // Too short
    if (/^[\d\s\.,$%]+$/.test(s.value)) return false; // Just numbers/symbols
    return true;
  });

  if (preFiltered.length === 0) return [];

  const prompt = `You are a data normalizer for a BFSI (Banking, Financial Services, Insurance) competitive intelligence pipeline.
Your job is to take raw text fragments extracted from web scraping and clean them into structured signals.

Rules:
1. 'summary' must be a concise, professional summary (MAX 15 words). Example: "Recent funding activity indicates growth focus"
2. 'evidence' must be the cleaned, grammatically correct version of the original sentence.
3. If the raw text is complete garbage (e.g., just navigation menus, cookie banners, meaningless numbers), you MUST set 'isValid' to false.

Raw Signals to process:
${preFiltered.map((s, i) => `[${i}] TYPE: ${s.type} | RAW: ${s.value}`).join("\n")}
`;

  try {
    const model = google("gemini-2.5-flash-lite");
    const result = await generateText({
      model,
      output: Output.object({
        schema: z.object({
          normalized: z.array(
            z.object({
              index: z.number().describe("The index of the signal in the provided list"),
              isValid: z.boolean().describe("False if the raw text is garbage, cookie banners, or meaningless"),
              summary: z.string().describe("Max 15 word professional summary"),
              evidence: z.string().describe("Cleaned, complete sentence representing the evidence"),
            })
          ),
        }),
      }),
      prompt,
      temperature: 0.1,
      maxOutputTokens: 12000,
    });

    const normalizedMap = new Map(result.output.normalized.map((n) => [n.index, n] as [number, { index: number; isValid: boolean; summary: string; evidence: string }]));
    const finalSignals: Signal[] = [];

    for (let i = 0; i < preFiltered.length; i++) {
      const raw = preFiltered[i];
      const norm = normalizedMap.get(i);

      if (norm && norm.isValid) {
        finalSignals.push({
          ...raw,
          summary: norm.summary,
          evidence: norm.evidence,
        });
      } else {
        console.log(`[Normalize] Dropped garbage signal: ${raw.value.slice(0, 40)}...`);
      }
    }

    console.log(`[Normalize] Retained ${finalSignals.length}/${rawSignals.length} normalized signals.`);
    return finalSignals;

  } catch (err) {
    console.error(`[Normalize] LLM normalization failed, falling back to heuristic:`, err);
    // Fallback: heuristic sentence-aware truncation
    return preFiltered.map(s => {
      const clean = s.value.replace(/\s+/g, " ").trim();
      // Try to find first sentence
      const firstSentence = clean.split(/[.!?]\s/)[0];
      const summary = firstSentence.length > 80 ? firstSentence.slice(0, 77) + "..." : firstSentence;
      return {
        ...s,
        summary: summary,
        evidence: clean,
      };
    });
  }
}
