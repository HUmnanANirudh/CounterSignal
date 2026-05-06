import type { Citation, ExtractedIntelligence, Signal, AE_BATTLECARD } from "@/types";
import { classifySignalType } from "./utils/signal-classify";

function isActualCustomerComplaint(signal: Signal): boolean {
  const complaintTypes = ["pricing_complaint", "support_issue", "integration_issue", "onboarding_delay", "quality_issue", "reliability_issue"];
  return complaintTypes.includes(signal.normalizedType || "");
}
function deriveObjectionFromSignal(signal: Signal): string {
  const signalType = signal.type && signal.type !== "general" ? signal.type : classifySignalType(signal.value, signal.normalizedType);
  switch (signalType) {
    case "regulatory": return "How do they handle compliance risk?";
    case "trust_risk": return "How do they isolate fraud liability?";
    case "financial_health": return "Are they financially stable enough for a long-term partnership?";
    case "pricing_complaint": return "What happens to costs at scale?";
    case "reliability": return "How reliable is their API infrastructure?";
    case "support_issue": return "How responsive is their technical support?";
    case "integration_issue": return "How complex is integration across banks?";
    case "onboarding_delay": return "How long does it take to go live?";
    default: return "How do they compare on infrastructure capabilities?";
  }
}

function deriveCounterFromSignal(signal: Signal, competitor: string, citationIds: string[]): string {
  const citationRef = citationIds[0] ? ` [${citationIds[0]}]` : "";
  const signalType = signal.type && signal.type !== "general" ? signal.type : classifySignalType(signal.value, signal.normalizedType);
  const summary = signal.summary || signal.value.slice(0, 60);

  switch (signalType) {
    case "regulatory": return `${competitor}'s regulatory history creates compliance risk your team inherits${citationRef}`;
    case "financial_health": return `${competitor}'s financial performance signals uneven product traction${citationRef}`;
    case "trust_risk": return `${competitor}'s fraud incidents expose partners to liability${citationRef}`;
    case "reliability": return `${competitor}'s service disruptions create settlement risk${citationRef}`;
    case "pricing_complaint": return `${competitor}'s pricing opacity creates hidden costs at scale${citationRef}`;
    case "support_issue": return `${competitor}'s support issues escalate for BFSI compliance needs${citationRef}`;
    case "integration_issue": return `${competitor}'s integration complexity compounds with each bank partnership${citationRef}`;
    case "onboarding_delay": return `${competitor}'s BFSI onboarding timelines add weeks to your launch${citationRef}`;
    default: return `${summary}... recommend validation${citationRef}`;
  }
}

function deriveLandmineFromSignal(signal: Signal): string | null {
  const signalType = signal.type && signal.type !== "general" ? signal.type : classifySignalType(signal.value, signal.normalizedType);
  switch (signalType) {
    case "regulatory": return "How do you handle regulatory exposure at scale?";
    case "trust_risk": return "Who owns fraud liability in your current stack?";
    case "financial_health": return "How does your cost scale with transaction volume?";
    case "pricing_complaint": return "What happens to your effective cost when MDR scales with volume?";
    case "reliability": return "What SLA-backed recourse do you have during service disruptions?";
    case "support_issue": return "How do you manage support escalations for critical payment flows?";
    case "integration_issue": return "How do you manage multi-bank integration complexity today?";
    case "onboarding_delay": return "How long can your product launch be delayed by onboarding timelines?";
    default: return "How do you manage multi-bank complexity today?";
  }
}

function deriveWinFromSignal(signal: Signal, competitor: string): string | null {
  const signalType = signal.type && signal.type !== "general" ? signal.type : classifySignalType(signal.value, signal.normalizedType);
  const summary = signal.summary || signal.value.slice(0, 80);

  switch (signalType) {
    case "pricing_complaint": return `${competitor}: ${summary}. Blostem offers transparent infra pricing.`;
    case "support_issue": return `${competitor}: ${summary}. Blostem provides BFSI-native support.`;
    case "integration_issue": return `${competitor}: ${summary}. Blostem's single API handles multi-bank complexity.`;
    case "onboarding_delay": return `${competitor}: ${summary}. Blostem standardizes BFSI onboarding.`;
    case "reliability": return `${competitor}: ${summary}. Blostem provides SLA-backed reliability.`;
    case "regulatory": return `${competitor}: ${summary}. Blostem handles compliance natively.`;
    case "trust_risk": return `${competitor}: ${summary}. Blostem isolates you from fraud liability.`;
    default: return null;
  }
}

export function deriveDealPrimitives(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  citations: Citation[],
  competitor: string,
  inferredCategory: string
): AE_BATTLECARD {
  console.log(`[DealPrimitives] Processing ${signals.length} signals for ${competitor}`);

  const compType = inferredCategory;
  console.log(`[DealPrimitives] Using pipeline category: ${compType}`);

  if (signals.length === 0) {
    console.log(`[DealPrimitives] No signals — deriving from extracted intelligence`);
    const tagline = intelligence.positioning?.tagline || "";
    const company_overview = tagline
      ? tagline.split(".").slice(0, 2).join(".").trim()
      : `${competitor} — limited public data available.`;
    const positives = intelligence.customer_truths?.positives || [];
    const differentiators = intelligence.positioning?.differentiators || [];

    const layerDescriptions: Record<string, string> = {
      wallet: "wallet/payment layer",
      gateway: "payment gateway / payment orchestration layer",
      merchant_of_record: "merchant of record / payment compliance layer",
      infra: "integration layer",
      NBFC: "lending/NBFC layer",
      unknown: "BFSI solution",
    };

    // Build minimal landmines from category
    const merchantOfRecordLandmines = [
      "How do you handle tax compliance across multiple states?",
      "What happens to your MoR obligations if you switch providers?",
      "How do you manage chargeback liability today?",
    ];

    // Build category-specific FUD responses
    const merchantOfRecordFud = [
      "MoR providers hold merchant funds — how do you verify segregation?",
      "Blostem provides infra-layer abstraction without MoR custody risk.",
    ];

    return {
      company_overview,
      competitor_type: compType,
      category_contrast: `${competitor} = ${layerDescriptions[compType] || "BFSI solution"}; Blostem = BFSI infrastructure layer (FD/RD/banking products)`,
      quick_dismisses: [],
      objection_handling: [
        {
          objection: "We prefer MoR providers for tax/compliance",
          counter: `MoR simplifies tax collection but creates custody risk. Blostem's infra layer handles compliance without taking custody.`,
          evidence: [],
        },
        {
          objection: "How do you compare on pricing transparency?",
          counter: `Blostem offers transparent infra-layer pricing vs. MoR margins that compound with volume.`,
          evidence: [],
        },
      ],
      why_we_win: differentiators.length > 0
        ? [`${competitor}: ${differentiators[0]}`, "Blostem: native BFSI infra without custody risk"]
        : ["Blostem: unified FD/RD infra layer without MoR custody complexity"],
      why_we_lose: positives.length > 0
        ? [`${competitor} strength: ${positives[0]}`]
        : [],
      pricing_positioning: `No public pricing found for ${competitor}.`,
      landmines: merchantOfRecordLandmines,
      FUD_responses: merchantOfRecordFud,
      proof_points: [
        `Blostem integrates with Zerodha for FD booking on Coin — proven at Indian fintech scale`,
      ],
      compete_aggressively_when: [
        "Prospect is concerned about MoR custody or tax compliance complexity",
        "Prospect wants BFSI infra without switching providers",
      ],
      signal_trace: [],
    };
  }

  const signal_trace = signals.slice(0, 5).map(signal => ({
    signal: signal.value.slice(0, 80),
    weapon: `Objection derived from signal`,
    type: classifySignalType(signal.value, signal.normalizedType),
  }));

  const objection_handling: AE_BATTLECARD["objection_handling"] = [];
  const seenObjections = new Set<string>();

  const actualComplaints = signals.filter(s => isActualCustomerComplaint(s));
  if (actualComplaints.length > 0) {
    const firstComplaint = actualComplaints[0];
    const objection = `We already use ${competitor}`;
    objection_handling.push({
      objection,
      counter: deriveCounterFromSignal(firstComplaint, competitor, firstComplaint.citationIds),
      evidence: firstComplaint.citationIds.slice(0, 2),
    });
    seenObjections.add(objection.toLowerCase());
  }

  for (const signal of signals) {
    if (objection_handling.length >= 3) break;
    const objectionText = deriveObjectionFromSignal(signal);
    const normalizedObjection = objectionText.toLowerCase();
    if (seenObjections.has(normalizedObjection)) continue;
    seenObjections.add(normalizedObjection);
    const counter = deriveCounterFromSignal(signal, competitor, signal.citationIds);
    if (counter.includes("recommend direct research") && !signal.citationIds.length) continue;
    objection_handling.push({ objection: objectionText, counter, evidence: signal.citationIds.slice(0, 2) });
  }

  console.log(`[DealPrimitives] Generated ${objection_handling.length} objections from signals`);

  const quick_dismisses: string[] = [];
  for (const signal of actualComplaints.slice(0, 2)) {
    const signalType = classifySignalType(signal.value, signal.normalizedType);
    switch (signalType) {
      case "pricing_complaint": quick_dismisses.push(`${competitor}'s pricing issues create hidden costs at scale.`); break;
      case "support_issue": quick_dismisses.push(`${competitor}'s support issues cause delays when problems escalate.`); break;
      case "integration_issue": quick_dismisses.push(`${competitor}'s integration complexity adds maintenance overhead.`); break;
      case "onboarding_delay": quick_dismisses.push(`${competitor}'s onboarding timelines delay BFSI product launches.`); break;
      case "reliability_issue": quick_dismisses.push(`${competitor}'s reliability issues create operational risk.`); break;
    }
  }

  const why_we_win: string[] = [];
  const seenWinReasons = new Set<string>();
  for (const signal of actualComplaints) {
    const winReason = deriveWinFromSignal(signal, competitor);
    if (winReason && !seenWinReasons.has(winReason)) {
      seenWinReasons.add(winReason);
      why_we_win.push(winReason);
    }
  }

  const why_we_lose: string[] = [];
  const positives = intelligence.customer_truths?.positives || [];
  const differentiators = intelligence.positioning?.differentiators || [];
  if (positives.length > 0) {
    why_we_lose.push(`${competitor} strength: ${positives[0]}`);
  } else if (differentiators.length > 0) {
    why_we_lose.push(`${competitor} differentiator: ${differentiators[0]}`);
  }

  let pricing_positioning = "";
  const extractedModel = intelligence.pricing_posture?.model || "";
  const extractedEntry = intelligence.pricing_posture?.entryPrice || "";
  if (extractedModel && extractedModel !== "unknown" && !extractedModel.includes("opaque")) {
    pricing_positioning = `${competitor} uses ${extractedModel}`;
    if (extractedEntry && extractedEntry !== "opaque") {
      pricing_positioning += ` (entry: ${extractedEntry})`;
    }
    pricing_positioning += " — Blostem offers transparent infra-layer pricing.";
  } else {
    pricing_positioning = `Pricing is not publicly disclosed (typical for infrastructure / MoR providers).`;
  }

  const landmines: string[] = [];
  const seenLandmines = new Set<string>();
  for (const signal of signals) {
    const landmine = deriveLandmineFromSignal(signal);
    if (landmine && !seenLandmines.has(landmine)) {
      seenLandmines.add(landmine);
      landmines.push(landmine);
    }
  }

  const fudResponses: string[] = [];
  const hasTrustRisk = signals.some(s => classifySignalType(s.value, s.normalizedType) === "trust_risk");
  if (hasTrustRisk) {
    fudResponses.push(`Blostem separates you from fraud liability — wallet-layer incidents expose partners to liability that infra-layer solutions avoid.`);
  }
  if (hasTrustRisk || signals.length > 0) {
    fudResponses.push(`Blostem is built by BFSI infrastructure veterans — Rainmatter backing provides capital + market credibility through Zerodha's ecosystem.`);
  }

  const proof_points: string[] = [];
  if (positives.length > 0) {
    proof_points.push(`${competitor}: ${positives[0]}`);
  }
  proof_points.push(`Blostem integrates with Zerodha for FD booking on Coin — proven at Indian fintech scale`);

  const tagline = intelligence.positioning?.tagline || "";
  const company_overview = tagline
    ? tagline.split(".").slice(0, 2).join(".").trim()
    : `${competitor} — direct research recommended for accurate positioning.`;

  const layerDescriptions: Record<string, string> = {
    wallet: "wallet/payment layer",
    gateway: "payment gateway / payment orchestration layer",
    infra: "integration layer",
    NBFC: "lending/NBFC layer",
    unknown: "BFSI solution",
  };
  const category_contrast = `${competitor} = ${layerDescriptions[compType] || "BFSI solution"}; Blostem = BFSI infrastructure layer (FD/RD/banking products)`;

  const compete_aggressively_when: string[] = [];
  const signalTypes = signals.map(s => classifySignalType(s.value, s.normalizedType));
  if (signalTypes.includes("pricing_complaint")) compete_aggressively_when.push("Prospect complains about pricing opacity or hidden MDR costs");
  if (signalTypes.includes("support_issue")) compete_aggressively_when.push("Prospect has experienced support delays or unresponsiveness");
  if (signalTypes.includes("integration_issue")) compete_aggressively_when.push("Prospect is struggling with multi-bank integration complexity");
  if (signalTypes.includes("reliability_issue") || signalTypes.includes("trust_risk")) compete_aggressively_when.push("Prospect is concerned about payment reliability or fraud risk");

  console.log(`[DealPrimitives] Generated: ${objection_handling.length} objections, ${landmines.length} landmines`);

  return {
    company_overview,
    competitor_type: compType,
    category_contrast,
    quick_dismisses: quick_dismisses.slice(0, 2),
    objection_handling: objection_handling.slice(0, 3),
    why_we_win: why_we_win.slice(0, 3),
    why_we_lose: why_we_lose.slice(0, 2),
    pricing_positioning,
    landmines: landmines.slice(0, 3),
    FUD_responses: fudResponses.slice(0, 2),
    proof_points: proof_points.slice(0, 2),
    compete_aggressively_when: compete_aggressively_when.slice(0, 3),
    signal_trace: signal_trace.slice(0, 3),
  };
}