import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { blostemProfile } from "@/lib/blostem-profile";
import type { VARSLayer, ObjectionHandling, Citation, ExtractedIntelligence, Signal } from "@/types";
import { validateCitationIntegrity } from "./signals";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

// Signal types for VARS context building
type SignalType = "trust_risk" | "financial_health" | "regulatory" | "reliability" | "strategy_drift" | "pricing_complaint" | "support_issue" | "integration_issue" | "onboarding_delay" | "quality_issue" | "general";

function classifySignalType(signal: Signal): SignalType {
  if (signal.normalizedType && signal.normalizedType !== "general") {
    return signal.normalizedType as SignalType;
  }
  const lower = signal.value.toLowerCase();
  if (/fraud|scam|₹\s*\d+\s*(?:cr|crore)|money.*launder|security.*breach/i.test(lower)) return "trust_risk";
  if (/rbi|regulatory|ban|suspended|compliance.*issue|penalty/i.test(lower)) return "regulatory";
  if (/loss|declin|revenue.*drop|widen.*loss|net.*loss/i.test(lower)) return "financial_health";
  if (/outage|service.*disrupt|downtime/i.test(lower)) return "reliability";
  if (/pivot|restructur|shut.*down|layoff/i.test(lower)) return "strategy_drift";
  if (/pricing|fee|expensive|overpriced|mdr/i.test(lower)) return "pricing_complaint";
  if (/support|unresponsive|delay/i.test(lower)) return "support_issue";
  if (/integration|api|difficult/i.test(lower)) return "integration_issue";
  if (/onboard|slow.*start|weeks/i.test(lower)) return "onboarding_delay";
  if (/buggy|broken|glitch/i.test(lower)) return "quality_issue";
  return "general";
}

// Build structured VARS context from signals (deterministic, no LLM)
function buildVarsContext(signals: Signal[], competitor: string): {
  strengths: string[];
  risks: string[];
  costIssues: string[];
  supportIssues: string[];
  integrationIssues: string[];
  regulatoryIssues: string[];
} {
  const strengths: string[] = [];
  const risks: string[] = [];
  const costIssues: string[] = [];
  const supportIssues: string[] = [];
  const integrationIssues: string[] = [];
  const regulatoryIssues: string[] = [];

  for (const signal of signals) {
    const signalType = classifySignalType(signal);
    const snippet = signal.value.length > 80 ? signal.value.slice(0, 80) + "..." : signal.value;

    switch (signalType) {
      case "trust_risk":
        risks.push(`Trust: ${snippet}`);
        break;
      case "regulatory":
        regulatoryIssues.push(`Regulatory: ${snippet}`);
        risks.push(`Regulatory: ${snippet}`);
        break;
      case "financial_health":
        risks.push(`Financial: ${snippet}`);
        break;
      case "reliability":
        risks.push(`Reliability: ${snippet}`);
        break;
      case "strategy_drift":
        risks.push(`Strategy: ${snippet}`);
        break;
      case "pricing_complaint":
        costIssues.push(`Pricing: ${snippet}`);
        break;
      case "support_issue":
        supportIssues.push(`Support: ${snippet}`);
        break;
      case "integration_issue":
        integrationIssues.push(`Integration: ${snippet}`);
        break;
      case "onboarding_delay":
        integrationIssues.push(`Onboarding: ${snippet}`);
        break;
      case "quality_issue":
        risks.push(`Quality: ${snippet}`);
        break;
    }
  }

  return { strengths, risks, costIssues, supportIssues, integrationIssues, regulatoryIssues };
}

// Parse LLM JSON response safely
function parseJsonResponse(text: string): { vars_layer: VARSLayer; objection_handling: ObjectionHandling[] } | null {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(cleaned) as { vars_layer: VARSLayer; objection_handling: ObjectionHandling[] };
  } catch {
    return null;
  }
}

// Strip hallucinated patterns from VARS text
function sanitizeVarsText(text: string): string {
  if (!text) return "";
  let cleaned = text
    .replace(/\[signal_\d+\]/gi, "")
    .replace(/\d+\s*%\s*capped\s*at\s*\$\d+/gi, "[specific pricing not available]")
    .replace(/\d+\s*percent\s*(plus|\+)\s*\$0/gi, "[specific pricing not available]")
    .replace(/\$\d+\s*percent/gi, "[specific pricing not available]")
    .replace(/\.\s+(for|with|when|then|so|but|because)/gi, ". ")
    .replace(/\s+\.\s*$/g, ".")
    .trim();
  if (!/[.!?]$/.test(cleaned)) cleaned += ".";
  return cleaned;
}

// Validate VARS has signal grounding (not generic fluff)
function isVarsGrounded(vars: VARSLayer): boolean {
  const text = [vars.validate, vars.acknowledge, vars.reframe, vars.specify].join(" ");
  // Must reference actual competitor signal content (not generic fintech terms)
  const genericTerms = ["fintech", "payment gateway", "digital payment", "financial service", "payment platform"];
  const isGeneric = genericTerms.some(term => text.toLowerCase().includes(term) && !text.includes("[citation"));
  return !isGeneric;
}

// Constrain objections to valid citations
function constrainObjections(
  objections: ObjectionHandling[],
  validCitationIds: string[]
): ObjectionHandling[] {
  return objections.map(obj => ({
    ...obj,
    counter: validateCitationIntegrity(obj.counter, validCitationIds),
    evidence: validCitationIds.includes(obj.evidence) ? obj.evidence : validCitationIds[0] || "",
  })).filter(obj => obj.counter.length > 10);
}

export async function generateVarsAndObjections(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  sourceMap: Record<string, string[]>,
  citations: Citation[],
  competitor?: string
): Promise<{ vars_layer: VARSLayer; objection_handling: ObjectionHandling[] }> {
  const validCitationIds = citations.map(c => c.id);

  console.log(`[Vars] Processing ${signals.length} signals for ${competitor}`);

  // SIGNAL GATE: If insufficient signals, return null VARS (not generic content)
  if (signals.length < 2) {
    console.log(`[Vars] Insufficient signals (${signals.length}) — returning null VARS`);
    return {
      vars_layer: {
        validate: `Insufficient validated signals for ${competitor} — VARS withheld.`,
        acknowledge: `Limited public data — recommend direct research.`,
        reframe: `Cannot reliably identify tradeoffs without signal grounding.`,
        specify: `Blostem infra-layer differentiation requires competitor signal data.`,
      },
      objection_handling: [],
    };
  }

  // Build structured context from signals (deterministic, pre-LLM)
  const ctx = buildVarsContext(signals, competitor || "competitor");
  console.log(`[Vars] Context: ${ctx.risks.length} risks, ${ctx.costIssues.length} cost issues, ${ctx.regulatoryIssues.length} regulatory issues`);

  // Use LLM only for compression/formatting, not ideation
  const model = google("gemini-2.5-flash-lite");

  const prompt = `Create compressed VARS for Blostem vs ${competitor}. Output must be 1-2 lines per section MAX.

COMPETITOR DATA (from signals):
${ctx.risks.length > 0 ? `RISKS:\n${ctx.risks.slice(0, 3).map(r => `- ${r}`).join("\n")}` : ""}
${ctx.costIssues.length > 0 ? `COST ISSUES:\n${ctx.costIssues.slice(0, 2).map(c => `- ${c}`).join("\n")}` : ""}
${ctx.supportIssues.length > 0 ? `SUPPORT ISSUES:\n${ctx.supportIssues.slice(0, 2).map(s => `- ${s}`).join("\n")}` : ""}
${ctx.integrationIssues.length > 0 ? `INTEGRATION ISSUES:\n${ctx.integrationIssues.slice(0, 2).map(i => `- ${i}`).join("\n")}` : ""}
${ctx.regulatoryIssues.length > 0 ? `REGULATORY ISSUES:\n${ctx.regulatoryIssues.slice(0, 2).map(r => `- ${r}`).join("\n")}` : ""}

INTELLIGENCE:
- Positioning: ${intelligence.positioning?.tagline || "unknown"}
- Pricing: ${intelligence.pricing_posture?.model || "unknown"} (${intelligence.pricing_posture?.entryPrice || "opaque"})

RULES (CRITICAL):
1. Each section = 1-2 lines MAX (under 50 words total for VARS)
2. Reference specific signal content above — NOT generic fintech claims
3. No repetition from other sections
4. Validate: WHY buyer considers ${competitor} (from signals)
5. Acknowledge: What ${competitor} actually does well (from positioning)
6. Reframe: Where signals expose structural weakness
7. Specify: Blostem wedge mapped to that weakness
8. Citation format: [citation-N] for any claim

CITATIONS:
${citations.slice(0, 5).map(c => `[${c.id}] ${c.title}`).join("\n")}

Return ONLY JSON (no markdown):
{"vars_layer":{"validate":"1-2 lines","acknowledge":"1-2 lines","reframe":"1-2 lines","specify":"1-2 lines"},"objection_handling":[{"objection":"string","counter":"string [citation-N]","evidence":"citation-N"}]}`;

  console.log(`[Vars] Calling LLM...`);

  let text: string;
  try {
    const result = await generateText({
      model,
      prompt,
      temperature: 0.15, // Very low for deterministic compression
      maxOutputTokens: 1024, // Capped for compression
    });
    text = result.text;
  } catch (err) {
    console.error(`[Vars] LLM call failed: ${err instanceof Error ? err.message : String(err)}`);
    return {
      vars_layer: {
        validate: `LLM call failed — VARS unavailable.`,
        acknowledge: `Recommend direct research.`,
        reframe: `Signal data exists but VARS generation failed.`,
        specify: `Blostem infra-layer remains differentiated.`,
      },
      objection_handling: [],
    };
  }

  console.log(`[Vars] LLM response: ${text.slice(0, 200)}...`);

  const parsed = parseJsonResponse(text);

  if (parsed) {
    // Sanitize and validate
    parsed.vars_layer = {
      validate: sanitizeVarsText(parsed.vars_layer.validate),
      acknowledge: sanitizeVarsText(parsed.vars_layer.acknowledge),
      reframe: sanitizeVarsText(parsed.vars_layer.reframe),
      specify: sanitizeVarsText(parsed.vars_layer.specify),
    };

    parsed.objection_handling = constrainObjections(parsed.objection_handling || [], validCitationIds);

    // Check if VARS is grounded (not generic fluff)
    if (!isVarsGrounded(parsed.vars_layer)) {
      console.warn(`[Vars] VARS appears generic — attempting rescue with signal-derived content`);
      // Override with signal-derived VARS
      parsed.vars_layer = deriveVarsFromSignals(signals, competitor || "competitor", citations);
    }

    console.log(`[Vars] Generated grounded VARS`);
    return parsed;
  }

  // Parse failed — use deterministic signal-derived VARS
  console.warn(`[Vars] Parse failed — using signal-derived VARS`);
  return {
    vars_layer: deriveVarsFromSignals(signals, competitor || "competitor", citations),
    objection_handling: [],
  };
}

// Deterministic VARS derivation from signals (fallback when LLM fails)
function deriveVarsFromSignals(signals: Signal[], competitor: string, citations: Citation[]): VARSLayer {
  const ctx = buildVarsContext(signals, competitor);

  // Validate: why buyer considers competitor
  let validate = `Teams consider ${competitor} for digital payments needs.`;
  if (ctx.risks.length > 0) {
    validate = `Buyer evaluating ${competitor} despite ${ctx.risks[0].split(":")[0].toLowerCase()} signals.`;
  }

  // Acknowledge: what competitor does well
  let acknowledge = `${competitor} provides payment infrastructure.`;
  if (ctx.integrationIssues.length > 0) {
    acknowledge = `${competitor} offers developer-friendly integration.`;
  }

  // Reframe: where signals expose weakness
  let reframe = "Signal data exposes specific risks — evaluate carefully.";
  if (ctx.risks.length > 0) {
    reframe = `${ctx.risks[0]}.`;
  } else if (ctx.costIssues.length > 0) {
    reframe = `${ctx.costIssues[0]}.`;
  } else if (ctx.regulatoryIssues.length > 0) {
    reframe = `${ctx.regulatoryIssues[0]}.`;
  }

  // Specify: Blostem wedge
  let specify = "Blostem provides BFSI infrastructure with transparent pricing.";
  if (ctx.costIssues.length > 0) {
    specify = "Blostem offers transparent infra-layer pricing vs MDR opacity.";
  } else if (ctx.regulatoryIssues.length > 0) {
    specify = "Blostem handles BFSI compliance natively.";
  } else if (ctx.integrationIssues.length > 0) {
    specify = "Blostem's single API standardizes multi-bank complexity.";
  }

  return { validate, acknowledge, reframe, specify };
}