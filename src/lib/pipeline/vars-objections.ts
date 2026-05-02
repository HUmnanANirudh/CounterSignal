import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { blostemProfile } from "@/lib/blostem-profile";
import type { VARSLayer, ObjectionHandling, Citation, ExtractedIntelligence, Signal } from "@/types";
import { validateCitationIntegrity } from "./signals";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

function parseJsonResponse(text: string): { vars_layer: VARSLayer; objection_handling: ObjectionHandling[] } | null {
  let cleaned = text.trim();

  // Find the first { and last } to extract JSON
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    console.error(`[Vars] Could not find valid JSON boundaries`);
    return null;
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  // Count braces to check balance
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    console.error(`[Vars] Unbalanced braces: { = ${openBraces}, } = ${closeBraces}`);
    return null;
  }

  try {
    return JSON.parse(cleaned) as { vars_layer: VARSLayer; objection_handling: ObjectionHandling[] };
  } catch (e: unknown) {
    console.error(`[Vars] JSON parse failed: ${(e as Error).message}`);
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

// Strip hallucinated pricing patterns from VARS text
function sanitizeVarsText(text: string): string {
  // Remove patterns like "8% capped at $5" or "9% plus $0"
  return text
    .replace(/\d+\s*%\s*capped\s*at\s*\$\d+/gi, "[specific pricing not available]")
    .replace(/\d+\s*percent\s*(plus|\+)\s*\$0/gi, "[specific pricing not available]")
    .replace(/\$\d+\s*percent/gi, "[specific pricing not available]");
}

export async function generateVarsAndObjections(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  sourceMap: Record<string, string[]>,
  citations: Citation[]
): Promise<{ vars_layer: VARSLayer; objection_handling: ObjectionHandling[] }> {
  const model = google("gemini-2.5-flash-lite");

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

  const prompt = `Create VARS sales positioning for Blostem vs a competitor.

COMPETITOR INTELLIGENCE:
- Summary: ${intelligence.competitor_summary || "General fintech competitor"}
- Positioning: ${intelligence.positioning?.tagline || "Payment processing company"}
- Pricing: ${intelligence.pricing_posture?.model || "unknown"} - ${intelligence.pricing_posture?.entryPrice || "opaque"} (${intelligence.pricing_posture?.opacity || "unknown"})
- Complaints: ${intelligence.customer_truths?.keyComplaints?.join("; ") || "Various complaints"}

BLOSTEM CONTEXT:
- Strengths: ${blostemProfile.strengths.join("; ")}
- Differentiators: ${blostemProfile.differentiators.join("; ")}

IMPORTANT PRICING RULES:
- Do NOT cite specific percentage fees (e.g., "9%", "8%") unless they appear in a citation
- Do NOT claim "capped at $X" unless explicitly in source data
- If competitor pricing is opaque or unclear, say "complex pricing structure" not specific numbers

GROUNDING SIGNALS:
${signalsJson.map((s) => `[${s.id}] (${s.normalizedType}): "${s.value}"`).join("\n")}

CITATIONS:
${citationsList}

Generate VARS + objection handling. Return ONLY JSON:
{
  "vars_layer": {
    "validate": "Why prospect considers competitor",
    "acknowledge": "What competitor does well",
    "reframe": "Competitor weaknesses/tradeoffs",
    "specify": "What Blostem provides"
  },
  "objection_handling": [
    {"objection": "concern", "counter": "response with [citation-N]", "evidence": "citation-N"}
  ]
}`;

  console.log(`[Vars] Calling LLM...`);

  const { text } = await generateText({
    model,
    prompt,
    temperature: 0.3,
  });

  console.log(`[Vars] LLM response preview: ${text.slice(0, 150)}...`);

  const parsed = parseJsonResponse(text);

  if (parsed) {
    // Sanitize VARS text to remove hallucinated pricing patterns
    parsed.vars_layer = {
      validate: sanitizeVarsText(parsed.vars_layer.validate),
      acknowledge: sanitizeVarsText(parsed.vars_layer.acknowledge),
      reframe: sanitizeVarsText(parsed.vars_layer.reframe),
      specify: sanitizeVarsText(parsed.vars_layer.specify),
    };

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
