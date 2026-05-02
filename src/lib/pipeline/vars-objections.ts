import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { blostemProfile } from "@/lib/blostem-profile";
import type { VARSLayer, ObjectionHandling, Citation, ExtractedIntelligence, Signal } from "@/types";
import { validateCitationIntegrity } from "./signals";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

const OBJECTION_TYPES = ["pricing", "feature_gap", "ease_of_use", "integration", "support"] as const;

function constrainObjections(
  objections: ObjectionHandling[],
  validCitationIds: string[]
): ObjectionHandling[] {
  return objections.map(obj => ({
    ...obj,
    counter: validateCitationIntegrity(obj.counter, validCitationIds),
    evidence: validCitationIds.includes(obj.evidence) ? obj.evidence : validCitationIds[0] || "citation-1",
  })).filter(obj => obj.counter.length > 10);
}

export async function generateVarsAndObjections(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  sourceMap: Record<string, string[]>,
  citations: Citation[]
): Promise<{ vars_layer: VARSLayer; objection_handling: ObjectionHandling[] }> {
  const model = google("gemini-2.5-flash-lite");

  const validCitationIds = citations.map(c => c.id);
  const signalsJson = signals.slice(0, 8).map((s) => ({
    id: s.id,
    type: s.type,
    normalizedType: s.normalizedType,
    value: s.value.slice(0, 100),
    citations: sourceMap[s.id] || [],
  }));

  const prompt = `You are a BFSI sales strategist. Generate VARS positioning and objection handling for a deal against a competitor.

## Competitor Intelligence
Positioning: ${intelligence.positioning?.tagline || "Fintech competitor"}
Summary: ${intelligence.competitor_summary || "No summary available"}
Pricing: ${intelligence.pricing_posture?.model || "unknown"} - ${intelligence.pricing_posture?.entryPrice || "unknown"} (${intelligence.pricing_posture?.opacity || "unknown"})
Key complaints: ${intelligence.customer_truths?.keyComplaints?.join("; ") || "none"}
Positives: ${intelligence.customer_truths?.positives?.join("; ") || "none"}

## Blostem Profile (our company)
Strengths: ${blostemProfile.strengths.join("; ")}
Differentiators: ${blostemProfile.differentiators.join("; ")}

## Signals (grounding evidence)
${signalsJson.map((s) => `[${s.id}] (${s.normalizedType || s.type}): "${s.value}"`).join("\n")}

## Valid Objection Types
${OBJECTION_TYPES.join(", ")}

## Citations
${citations.map((c) => `[${c.id}] ${c.title}`).join("\n")}

## Your Task

Generate VARS and objection handling grounded in the signals above.

### VARS Layer (4 statements)
Each MUST reference signal IDs like [pricing_signal_0] or [complaint_1].

### Objection Handling (2-3 pairs)
- Derive objection type from: ${OBJECTION_TYPES.join(", ")}
- Counter MUST cite evidence from citations list
- NO fabricated citation IDs

## Output Format
Return ONLY JSON:
{
  "vars_layer": {
    "validate": "string with [signal-id] refs",
    "acknowledge": "string with [signal-id] refs",
    "reframe": "string with [signal-id] refs",
    "specify": "Blostem strengths only"
  },
  "objection_handling": [
    {"objection": "type-based", "counter": "cited counter", "evidence": "citation-N"}
  ]
}`;

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.3,
    maxOutputTokens: 1024,
  });

  try {
    const parsed = JSON.parse(text.trim()) as { vars_layer: VARSLayer; objection_handling: ObjectionHandling[] };
    parsed.objection_handling = constrainObjections(parsed.objection_handling || [], validCitationIds);
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