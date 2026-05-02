import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { blostemProfile } from "@/lib/blostem-profile";
import type { VARSLayer, ObjectionHandling, Citation, ExtractedIntelligence, Signal } from "@/types";
import { validateCitationIntegrity } from "./signals";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

function parseJsonResponse(text: string): { vars_layer: VARSLayer; objection_handling: ObjectionHandling[] } | null {
  let cleaned = text.trim();

  // Try to extract from code blocks first
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1];

  // Find JSON object - find first { and last }
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }

  try {
    return JSON.parse(cleaned) as { vars_layer: VARSLayer; objection_handling: ObjectionHandling[] };
  } catch (e) {
    console.error(`[Vars] JSON parse failed: ${e}`);
    return null;
  }
}

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
  const model = google("gemini-2.5-flash");

  const validCitationIds = citations.map(c => c.id);

  console.log(`[Vars] Starting VARS generation`);
  console.log(`[Vars] Signals: ${signals.length}`);
  console.log(`[Vars] Citations: ${citations.length}`);

  const signalsJson = signals.slice(0, 6).map((s) => ({
    id: s.id,
    type: s.type,
    normalizedType: s.normalizedType || "general",
    value: s.value.slice(0, 80),
  }));

  const citationsList = citations.map((c) => `[${c.id}] ${c.title} (${c.source})`).join("\n");

  const prompt = `You are a BFSI sales strategist. Create VARS positioning and objection handling for a deal against a competitor.

## Intelligence about competitor
Summary: ${intelligence.competitor_summary || "General fintech competitor"}
Positioning: ${intelligence.positioning?.tagline || "Payment processing company"}
Pricing: ${intelligence.pricing_posture?.model || "unknown"} - ${intelligence.pricing_posture?.entryPrice || "unknown"} (${intelligence.pricing_posture?.opacity || "unknown"})
Key complaints: ${intelligence.customer_truths?.keyComplaints?.join("; ") || "Various complaints"}
Positives: ${intelligence.customer_truths?.positives?.join("; ") || "Positive feedback"}

## Blostem (our company)
Strengths: ${blostemProfile.strengths.join("; ")}
Differentiators: ${blostemProfile.differentiators.join("; ")}

## Grounding signals
${signalsJson.map((s) => `[${s.id}] (${s.normalizedType}): "${s.value}"`).join("\n")}

## Citations
${citationsList}

## Instructions

Generate VARS layer (4 statements) and objection handling.

VARS Layer:
- Validate: Why would a prospect consider this competitor? Base on signals.
- Acknowledge: What does this competitor do well? Base on signals.
- Reframe: What tradeoffs or weaknesses exist? Base on signals.
- Specify: What does Blostem uniquely provide? Use Blostem's strengths.

Objection Handling:
- Generate 2-3 objection/counter pairs
- Counter must reference a citation: e.g. [citation-1]
- Counter must explain Blostem's advantage

Return ONLY a JSON object:
{
  "vars_layer": {
    "validate": "statement referencing signals",
    "acknowledge": "statement referencing signals",
    "reframe": "statement referencing signals",
    "specify": "Blostem advantages statement"
  },
  "objection_handling": [
    {"objection": "pricing concern", "counter": "counter with [citation-N]", "evidence": "citation-N"}
  ]
}`;

  console.log(`[Vars] Calling LLM...`);

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.3,
  });

  console.log(`[Vars] LLM response: ${text.slice(0, 300)}...`);

  const parsed = parseJsonResponse(text);

  if (parsed) {
    parsed.objection_handling = constrainObjections(parsed.objection_handling || [], validCitationIds);
    console.log(`[Vars] Successfully parsed`);
    return parsed;
  }

  console.error(`[Vars] Failed to parse JSON`);

  return {
    vars_layer: {
      validate: `Prospects considering ${intelligence.positioning?.tagline || "this competitor"} typically evaluate pricing and ease of use.`,
      acknowledge: `${intelligence.positioning?.tagline || "This competitor"} is recognized for developer experience.`,
      reframe: `However, ${intelligence.pricing_posture?.opacity === "opaque" ? "their pricing model lacks transparency" : "there may be hidden costs"} that could impact total cost.`,
      specify: `Blostem provides transparent pricing, faster onboarding, and purpose-built BFSI compliance.`,
    },
    objection_handling: [
      {
        objection: "They seem cheaper",
        counter: `While competitors may appear cost-effective, customers report hidden fees and unpredictable pricing. Blostem offers transparent per-seat pricing with no hidden costs.`,
        evidence: "citation-1",
      },
    ],
  };
}