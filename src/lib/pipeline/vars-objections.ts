import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { blostemProfile } from "@/lib/blostem-profile";
import type { VARSLayer, ObjectionHandling, Citation, ExtractedIntelligence, Signal } from "@/types";
import { validateCitationIntegrity } from "./signals";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

function parseJsonResponse(text: string): { vars_layer: VARSLayer; objection_handling: ObjectionHandling[] } | null {
  let cleaned = text.trim();

  // Strip markdown code blocks if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

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
  if (!text) return "";

  let cleaned = text
    // Remove patterns like "8% capped at $5" or "9% plus $0"
    .replace(/\d+\s*%\s*capped\s*at\s*\$\d+/gi, "[specific pricing not available]")
    .replace(/\d+\s*percent\s*(plus|\+)\s*\$0/gi, "[specific pricing not available]")
    .replace(/\$\d+\s*percent/gi, "[specific pricing not available]")
    // Fix broken sentence fragments
    .replace(/\.\s+(for|with|when|then|so|but|because)/gi, ". ")
    // Ensure complete sentences
    .replace(/\s+\.\s*$/g, ".")
    .trim();

  // Ensure trailing period
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += ".";
  }

  return cleaned;
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

  const prompt = `Create VARS sales positioning for Blostem vs a fintech competitor.

CONTEXT: Blostem is BFSI infrastructure (FD/RD/banking products), not a payment gateway. The competitor likely serves payment/payment orchestration use cases.

COMPETITOR INTELLIGENCE:
- Positioning: ${intelligence.positioning?.tagline || "Payment processing company"}
- Pricing: ${intelligence.pricing_posture?.model || "unknown"} - ${intelligence.pricing_posture?.entryPrice || "opaque"} (${intelligence.pricing_posture?.opacity || "unknown"})
- Complaints: ${intelligence.customer_truths?.keyComplaints?.join("; ") || "Various complaints"}

BLOSTEM CONTEXT:
- Strengths: ${blostemProfile.strengths.join("; ")}
- Differentiators: ${blostemProfile.differentiators.join("; ")}

CATEGORY-AWARE VARS RULES:
- Validate: Why prospects choose the competitor for payment/payment orchestration needs
- Acknowledge: What they do well in the payment layer
- Reframe: Where payment-layer complexity creates hidden costs (MDR, settlement, reconciliation)
- Specify: How infra-layer removes payment complexity for BFSI products

CRITICAL COUNTER RULES:
- All counters MUST include [citation-N] references where N is a valid citation ID from the CITATIONS section
- Counters must reference real customer pain points from signals, not generic statements
- Structure: acknowledge → concrete risk (signal-backed) → Blostem contrast
- Example: "That works early, but as volumes grow MDR + settlement layers compound costs and reconciliation overhead — infra models remove both"

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
    maxOutputTokens: 2048, // Reduced for latency
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

  // Category-aware fallback VARS
  const isGateway = intelligence.pricing_posture?.model?.includes("transaction") ||
    (intelligence.positioning?.tagline || "").toLowerCase().includes("gateway");

  if (isGateway) {
    return {
      vars_layer: {
        validate: `Prospects choose Razorpay for fast payment setup and broad UPI/card coverage.`,
        acknowledge: `Strong gateway with solid developer experience and wide payment ecosystem reach.`,
        reframe: `Transaction + MDR pricing compounds at scale and adds reconciliation overhead for multi-bank BFSI products.`,
        specify: `Blostem replaces payment-layer complexity with infra-layer control — predictable costs, single API, native BFSI compliance.`,
      },
      objection_handling: [
        {
          objection: "We already use Razorpay",
          counter: `That works early, but at scale MDR + settlement layers increase total cost and reconciliation overhead — infra models remove both cost unpredictability and operational drag.`,
          evidence: "citation-1",
        },
        {
          objection: "They seem cheaper",
          counter: `Perceived competitive pricing at low volume, but costs scale with MDR + settlement layers — infra-layer provides predictable B2B pricing.`,
          evidence: "citation-1",
        },
      ],
    };
  }

  return {
    vars_layer: {
      validate: `Prospects considering ${intelligence.positioning?.tagline || "this competitor"} evaluate pricing and ease of use.`,
      acknowledge: `${intelligence.positioning?.tagline || "This competitor"} offers payment/payment orchestration capabilities.`,
      reframe: `Transaction pricing plus settlement complexity compounds at scale for BFSI products.`,
      specify: `Blostem provides infra-layer control with predictable costs, single API integration, and native BFSI compliance.`,
    },
    objection_handling: [
      {
        objection: "They seem cheaper",
        counter: `Pricing complexity compounds at volume — infra-layer provides predictable B2B pricing without MDR overhead.`,
        evidence: "citation-1",
      },
    ],
  };
}
