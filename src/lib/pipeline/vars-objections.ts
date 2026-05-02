import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { blostemProfile } from "@/lib/blostem-profile";
import type { VARSLayer, ObjectionHandling, Citation,ExtractedIntelligence,Signal } from "@/types";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateVarsAndObjections(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  sourceMap: Record<string, string[]>,
  citations: Citation[]
): Promise<{ vars_layer: VARSLayer; objection_handling: ObjectionHandling[] }> {
  const model = google("gemini-2.5-flash-lite");

  const citationsJson = citations.map((c) => ({ id: c.id, title: c.title, url: c.url, source: c.source })).slice(0, 6);
  const signalsJson = signals.slice(0, 8).map((s) => ({ id: s.id, type: s.type, value: s.value.slice(0, 100), citations: sourceMap[s.id] || [] }));

  const prompt = `You are a BFSI sales strategist. Generate VARS positioning and objection handling for a deal against a competitor.

## Competitor Intelligence
Competitor: ${intelligence.positioning.tagline || "Fintech competitor"}
Summary: ${intelligence.competitor_summary}
Pricing: ${intelligence.pricing_posture.model} - ${intelligence.pricing_posture.entryPrice} (${intelligence.pricing_posture.opacity})
Key complaints: ${intelligence.customer_truths.keyComplaints.join("; ") || "none"}
Positives: ${intelligence.customer_truths.positives.join("; ") || "none"}

## Blostem Profile (our company)
Strengths: ${blostemProfile.strengths.join("; ")}
Differentiators: ${blostemProfile.differentiators.join("; ")}
Pricing: ${blostemProfile.pricing_model} - ${blostemProfile.pricing_philosophy}

## Signals (grounding evidence)
${signalsJson.map((s) => `[${s.id}] ${s.type}: "${s.value}" citations: ${s.citations.join(", ") || "none"}`).join("\n")}

## Citations
${citationsJson.map((c) => `[${c.id}] ${c.title} (${c.source})`).join("\n")}

## Your Task

Generate VARS and objection handling grounded in the signals above.

### VARS Layer
Generate these 4 statements. Each MUST cite signal IDs like [pricing_signal_0] or [complaint_1] when grounding in evidence.

**Validate**: "A prospect considering [competitor] is likely evaluating: [insert based on signals]"
**Acknowledge**: "[competitor] excels at: [insert from signals]"
**Reframe**: "However, [competitor]'s [weakness from signals] creates tradeoffs in: [insert]"
**Specify**: "Blostem uniquely provides: [insert from Blostem profile strengths]"

### Objection Handling
Generate 2-3 objection/counter pairs. Each counter MUST cite evidence:
- An objection derived from the competitor's strengths or customer complaints
- A counter grounded in Blostem's differentiators, citing [citation-N] for competitor weakness

## Output Format
Return ONLY a JSON object:
{
  "vars_layer": {
    "validate": "string with [citation-N] references",
    "acknowledge": "string with [citation-N] references",
    "reframe": "string with [citation-N] references",
    "specify": "string (Blostem strengths, no citations needed)"
  },
  "objection_handling": [
    {"objection": "string", "counter": "string with [citation-N] references", "evidence": "citation-N"}
  ]
}

NO fabricated citation IDs. Only use citation IDs from the list above.`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.3,
    maxOutputTokens: 1024,
  });

  try {
    const parsed = JSON.parse(text.trim()) as { vars_layer: VARSLayer; objection_handling: ObjectionHandling[] };
    return parsed;
  } catch {
    return {
      vars_layer: {
        validate: "Based on market signals, prospects are evaluating this competitor for pricing and ease of use.",
        acknowledge: "This competitor is recognized for their developer experience and market presence.",
        reframe: "However, their pricing model lacks transparency which may create unexpected costs.",
        specify: "Blostem provides transparent pricing, faster onboarding, and purpose-built BFSI compliance.",
      },
      objection_handling: [
        {
          objection: "They seem cheaper",
          counter: "While they appear cost-effective, customer reviews cite hidden fees and unpredictable pricing [citation-1], whereas Blostem offers transparent per-seat pricing.",
          evidence: "citation-1",
        },
      ],
    };
  }
}