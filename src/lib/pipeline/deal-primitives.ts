import type { Citation, Signal, ExtractedIntelligence, PreprocessedData } from "@/types";
import { blostemProfile } from "@/lib/blostem-profile";

export type CompetitorType = "wallet" | "gateway" | "infra" | "NBFC" | "unknown";

export interface DealPrimitives {
  company_overview: string;
  competitor_type: CompetitorType;
  category_contrast: string;
  quick_dismisses: string[];
  objection_handling: Array<{
    objection: string;
    counter: string;
    evidence: string[];
  }>;
  why_we_win: string[];
  why_we_lose: string[];
  pricing_positioning: string;
  landmines: string[];
  FUD_responses: string[];
  proof_points: string[];
  compete_aggressively_when: string[];
  signal_trace: Array<{
    signal: string;
    weapon: string;
    type: string;
  }>;
}

// Auto-classify negative signals using regex patterns - works for any company
function classifyNegativeSignal(text: string): string {
  const lower = text.toLowerCase();

  // Trust/risk patterns
  if (/fraud|scam|₹\s*\d+\s*(?:cr|crore)|money.*launder|security.*breach|sanction.*popup|data.*breach|credential.*leak|class.*action|lawsuit/i.test(lower)) {
    return "trust_risk";
  }
  // Regulatory patterns
  if (/rbi|regulatory|ban|suspended|compliance.*issue|penalty|fine|sec.*fine|enforcement.*action|investigation/i.test(lower)) {
    return "regulatory";
  }
  // Financial health patterns
  if (/loss|declin|revenue.*drop|widen.*loss|net.*loss|operating.*loss|default|bankrupt|insolven/i.test(lower)) {
    return "financial_health";
  }
  // Reliability/outage patterns
  if (/outage|service.*disrupt|downtime|system.*fail|breach|leak/i.test(lower)) {
    return "reliability";
  }
  // Strategy drift patterns
  if (/pivot|restructur|shut.*down|close.*operation|layoff/i.test(lower)) {
    return "strategy_drift";
  }

  return "general";
}

// Check if a signal is an implicit complaint using auto-classification
function isImplicitComplaint(signal: Signal): boolean {
  const classification = classifyNegativeSignal(signal.value);
  return classification !== "general";
}

// Get complaint type using auto-classification
function getImplicitComplaintType(signal: Signal): string {
  return classifyNegativeSignal(signal.value);
}

// Detect competitor type dynamically from signals and tagline - no hardcoded company names
function detectCompetitorType(competitor: string, signals: Signal[], intelligence: ExtractedIntelligence): CompetitorType {
  const competitorLower = competitor.toLowerCase();

  // Check tagline for type hints
  const tagline = (intelligence.positioning?.tagline || "").toLowerCase();

  // Auto-detect wallet vs gateway vs NBFC vs infra from tagline
  if (/wallet|upi|paytm|phonepe|mobikwik/i.test(tagline + " " + competitorLower)) {
    return "wallet";
  }
  if (/gateway|merchant.*payment|payment.*gateway/i.test(tagline)) {
    return "gateway";
  }
  if (/nbfc|lending|loan|credit/i.test(tagline + " " + competitorLower)) {
    return "NBFC";
  }
  if (/infrastructure|infra|banking.*as.*a.*service|baas/i.test(tagline)) {
    return "infra";
  }

  // Check signals for type indicators
  const allText = signals.map(s => s.value).join(" ").toLowerCase();

  if (/wallet|upi|paytm|phonepe|mobikwik/i.test(allText)) {
    return "wallet";
  }
  if (/payment.*gateway|merchant.*checkout/i.test(allText)) {
    return "gateway";
  }
  if (/nbfc|lending|loan|credit.*product/i.test(allText)) {
    return "NBFC";
  }
  if (/infrastructure|infra.*layer|banking.*as.*service/i.test(allText)) {
    return "infra";
  }

  return "unknown";
}

// Competitor-specific attack vectors - auto-generated from signal types
function generateAttacksFromSignals(signals: Signal[]): string[] {
  const attacks: string[] = [];

  // Group signals by type
  const trustRiskSignals = signals.filter(s => classifyNegativeSignal(s.value) === "trust_risk");
  const regulatorySignals = signals.filter(s => classifyNegativeSignal(s.value) === "regulatory");
  const financialSignals = signals.filter(s => classifyNegativeSignal(s.value) === "financial_health");
  const reliabilitySignals = signals.filter(s => classifyNegativeSignal(s.value) === "reliability");

  // Generate attacks based on detected signal types
  if (trustRiskSignals.length > 0) {
    const signal = trustRiskSignals[0];
    attacks.push(`${signal.value.slice(0, 80)} — how does this affect your confidence in their long-term reliability?`);
  }

  if (regulatorySignals.length > 0) {
    const signal = regulatorySignals[0];
    attacks.push(`${signal.value.slice(0, 80)} — how are you managing compliance risk with this provider?`);
  }

  if (financialSignals.length > 0) {
    const signal = financialSignals[0];
    attacks.push(`${signal.value.slice(0, 80)} — does this affect their ability to invest in the platform?`);
  }

  if (reliabilitySignals.length > 0) {
    const signal = reliabilitySignals[0];
    attacks.push(`${signal.value.slice(0, 80)} — what's your contingency when this happens?`);
  }

  return attacks;
}

// Generate competitor-specific dismiss based on detected type
function generateTypeSpecificDismiss(competitor: string, compType: CompetitorType, signals: Signal[]): string {
  const trustRiskSignals = signals.filter(s => classifyNegativeSignal(s.value) === "trust_risk");

  // If there's a trust risk signal, lead with that
  if (trustRiskSignals.length > 0) {
    return `${competitor}'s wallet model introduces fraud liability and MDR complexity — Blostem's infra-layer removes this risk.`;
  }

  // Otherwise, use type-based dismiss
  switch (compType) {
    case "wallet":
      return `${competitor}'s wallet-based model means MDR + settlement layers that compound at scale — Blostem prices for predictability, not transaction volume.`;
    case "gateway":
      return `${competitor}'s gateway model charges % per transaction + fixed fees — at scale, this becomes your largest variable cost — Blostem's infra model is designed for predictable B2B pricing.`;
    case "NBFC":
      return `${competitor}'s NBFC model adds regulatory compliance overhead your team absorbs — Blostem handles BFSI compliance natively, so you can focus on product.`;
    case "infra":
      return `${competitor} addresses integration complexity — but Blostem's single API for multi-bank FD/RD access is purpose-built for Indian wealth platforms.`;
    default:
      return `${competitor} may solve immediate needs, but Blostem is purpose-built for Indian BFSI compliance and multi-bank complexity.`;
  }
}

function generateCounterForSignal(
  signal: Signal,
  competitor: string,
  citations: Citation[],
  compType: CompetitorType
): string {
  const text = signal.value;
  const citation = signal.citationIds[0];
  const signalType = classifyNegativeSignal(signal.value);

  const citationRef = citation ? `[${citation}]` : "";

  // Auto-generate counter based on signal classification
  switch (signalType) {
    case "trust_risk":
      return `${text}. This directly impacts your risk posture — Blostem's infra-layer separates your product from fraud liability ${citationRef}.`;

    case "financial_health":
      return `${text}. This signals product-market fit issues — Blostem is backed by Rainmatter (Zerodha), with proven platform scale ${citationRef}.`;

    case "regulatory":
      return `${text}. For BFSI products, regulatory issues compound — Blostem handles compliance natively, so you avoid ${competitor}'s compliance burden ${citationRef}.`;

    case "reliability":
      return `${text}. How would your ops handle this? Blostem's infra provides SLA-backed reliability ${citationRef}.`;

    case "strategy_drift":
      return `${text}. This suggests instability — Blostem's focused BFSI infra strategy is purpose-built for the long term ${citationRef}.`;

    default:
      // Standard complaint types
      const normalizedType = signal.normalizedType || "general";

      if (normalizedType === "pricing_complaint") {
        return `${competitor} appears cost-effective, but ${text.toLowerCase()} — Blostem prices for transparency with no hidden compliance fees ${citationRef}.`;
      }
      if (normalizedType === "support_issue") {
        return `${text.charAt(0).toUpperCase() + text.slice(1)}. For BFSI, this means routing delays through generic support — Blostem's team is BFSI-native ${citationRef}.`;
      }
      if (normalizedType === "integration_issue") {
        return `${text.charAt(0).toUpperCase() + text.slice(1)}. Each bank partnership compounds this — Blostem's single API handles multi-bank complexity ${citationRef}.`;
      }
      if (normalizedType === "onboarding_delay") {
        return `${text.charAt(0).toUpperCase() + text.slice(1)}. BFSI compliance timelines add weeks to this — Blostem's standardized flow is designed for speed ${citationRef}.`;
      }

      return `${text.charAt(0).toUpperCase() + text.slice(1)}. In BFSI context, this impacts compliance and time-to-market — Blostem is built specifically for this ${citationRef}.`;
  }
}

function generateAggressiveLandmine(signal: Signal, compType: CompetitorType): string | null {
  const signalType = classifyNegativeSignal(signal.value);
  const citation = signal.citationIds[0] ? `[${signal.citationIds[0]}]` : "";

  // Auto-generate landmine based on signal type
  switch (signalType) {
    case "trust_risk":
      return `How are you handling fraud liability and reconciliation when wallet payouts fail? ${citation}`;

    case "financial_health":
      return `Given ${signal.value.slice(0, 50)}... how does this affect your confidence in their long-term viability as a partner? ${citation}`;

    case "regulatory":
      return `How are you managing regulatory compliance for this provider? What's your contingency if they face RBI action? ${citation}`;

    case "reliability":
      return `When ${signal.value.slice(0, 60)}... what's your SLA-backed recourse? ${citation}`;

    case "strategy_drift":
      return `How does ${signal.value.slice(0, 50)} affect your confidence in their continued platform investment? ${citation}`;

    default:
      // Standard landmines for generic types
      if (signal.normalizedType === "pricing_complaint") {
        return `When you factor in MDR + settlement fees, how does your effective cost per transaction compare to an infra-layer solution?`;
      }
      if (signal.normalizedType === "integration_issue") {
        return `How are you managing integration maintenance across bank partners? What's your team's bandwidth for API changes?`;
      }
      if (signal.normalizedType === "support_issue") {
        return `Who handles your BFSI-specific compliance questions when they arise — is it the same team as your main support?`;
      }

      return null;
  }
}

function generateWhyWeLoseForType(compType: CompetitorType, signals: Signal[]): string[] {
  const reasons: string[] = [];

  // Primary loss condition across ALL types
  reasons.push("Teams only needing payments (not BFSI infra) — if prospect only needs a payment gateway, Blostem is overkill");

  switch (compType) {
    case "wallet":
      reasons.push("Prospects already deeply integrated into wallet/upi ecosystem (Paytm, PhonePe)");
      reasons.push("Projects requiring specific wallet features (gift cards, recharges, bill payments)");
      break;
    case "gateway":
      reasons.push("Merchants already integrated with Razorpay/Cashfree ecosystem and resistant to switching");
      reasons.push("Projects prioritizing gateway familiarity over long-term infra cost");
      break;
    case "NBFC":
      reasons.push("Prospects with existing NBFC relationships and dedicated compliance teams");
      reasons.push("Deals where lending product roadmap dominates over banking infra needs");
      break;
    case "infra":
      reasons.push("Prospects with dedicated integration teams preferring in-house control");
      reasons.push("Enterprises prioritizing vendor lock-in avoidance over abstraction benefits");
      break;
    default:
      reasons.push("Very large enterprises (500+ seats) with existing bank relationships and negotiation leverage");
      reasons.push("Prospects prioritizing speed-to-market over long-term maintainability");
  }

  return reasons.slice(0, 3);
}

function getCompeteAggressivelyTriggers(compType: CompetitorType, signals: Signal[]): string[] {
  const triggers: string[] = [];

  // Universal triggers
  triggers.push("Prospect complains about reconciliation overhead with multiple bank partners");
  triggers.push("Prospect is building wealth management or savings product");
  triggers.push("Risk and compliance is a top priority for the prospect");
  triggers.push("Prospect is scaling transaction volume — cost optimization matters more at scale");

  // Auto-detect triggers from signal types
  const signalTypes = signals.map(s => classifyNegativeSignal(s.value));

  if (signalTypes.includes("trust_risk")) {
    triggers.push("Prospect is risk-averse and concerned about payment reliability");
  }
  if (signalTypes.includes("regulatory")) {
    triggers.push("Prospect has had RBI compliance issues with current provider");
  }
  if (signalTypes.includes("financial_health")) {
    triggers.push("Prospect is concerned about vendor financial stability");
  }
  if (signalTypes.includes("reliability")) {
    triggers.push("Prospect has experienced service disruptions with current provider");
  }

  return [...new Set(triggers)].slice(0, 6);
}

export function deriveDealPrimitives(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  citations: Citation[],
  competitor: string
): DealPrimitives {
  console.log(`[DealPrimitives] Processing ${signals.length} signals for ${competitor}`);

  // Auto-detect competitor type
  const compType = detectCompetitorType(competitor, signals, intelligence);
  console.log(`[DealPrimitives] Detected competitor type: ${compType}`);

  // Collect ALL complaint signals (including implicit via auto-classification)
  const allComplaintSignals = signals.filter(s =>
    (s.normalizedType && ["pricing_complaint", "support_issue", "integration_issue", "onboarding_delay", "quality_issue", "reliability_issue"].includes(s.normalizedType)) ||
    isImplicitComplaint(s)
  );

  // Build signal trace for traceability
  const signal_trace = allComplaintSignals.slice(0, 5).map(signal => {
    const signalType = classifyNegativeSignal(signal.value);
    let weapon = "";

    if (signalType === "trust_risk") weapon = "Objection: 'They seem reliable' → Counter: Trust risk evidence";
    else if (signalType === "financial_health") weapon = "Objection: 'They seem stable' → Counter: Financial decline evidence";
    else if (signalType === "regulatory") weapon = "Objection: 'They seem compliant' → Counter: Regulatory issue evidence";
    else if (signalType === "reliability") weapon = "Objection: 'They seem reliable' → Counter: Reliability issue evidence";
    else if (signalType === "strategy_drift") weapon = "Objection: 'They seem focused' → Counter: Strategy drift evidence";
    else if (signal.normalizedType === "pricing_complaint") weapon = "Objection: 'They're cheaper' → Counter: Hidden costs evidence";
    else if (signal.normalizedType === "support_issue") weapon = "Objection: 'They have better support' → Counter: Support failure evidence";
    else if (signal.normalizedType === "integration_issue") weapon = "Objection: 'They're easier to integrate' → Counter: Complexity evidence";

    return {
      signal: signal.value.slice(0, 80),
      weapon,
      type: signalType
    };
  });

  // Generate objection handling (prioritize trust/risk signals)
  const sortedComplaints = [...allComplaintSignals].sort((a, b) => {
    const aType = classifyNegativeSignal(a.value);
    const bType = classifyNegativeSignal(b.value);
    const typePriority: Record<string, number> = { trust_risk: 0, regulatory: 1, financial_health: 2, reliability: 3, strategy_drift: 4, general: 5 };
    return (typePriority[aType] || 5) - (typePriority[bType] || 5);
  });

  // Fallback: if no validated signals, use preprocessed negative signals from intelligence
  // This ensures we always have at least some objections when HIGH severity signals were detected
  const v2Intelligence = intelligence as { negative_signals?: Array<{ text: string; type: string }> };
  const preprocessedNegSignals = v2Intelligence.negative_signals || [];

  let objection_handling: DealPrimitives["objection_handling"] = [];

  if (sortedComplaints.length > 0) {
    objection_handling = sortedComplaints.slice(0, 3).map(signal => {
      const signalType = classifyNegativeSignal(signal.value);

      let baseObjection = "";
      switch (signalType) {
        case "trust_risk": baseObjection = "They seem trustworthy"; break;
        case "financial_health": baseObjection = "They seem financially stable"; break;
        case "regulatory": baseObjection = "They seem compliant"; break;
        case "reliability": baseObjection = "They seem reliable"; break;
        case "strategy_drift": baseObjection = "They seem focused"; break;
        default:
          if (signal.normalizedType === "pricing_complaint") baseObjection = "They seem cheaper";
          else if (signal.normalizedType === "support_issue") baseObjection = "They have better support";
          else if (signal.normalizedType === "integration_issue") baseObjection = "They're easier to integrate";
          else if (signal.normalizedType === "onboarding_delay") baseObjection = "They onboard faster";
          else baseObjection = "They seem like a better option";
      }

      return {
        objection: baseObjection,
        counter: generateCounterForSignal(signal, competitor, citations, compType),
        evidence: signal.citationIds.slice(0, 2),
      };
    });
  } else if (preprocessedNegSignals.length > 0) {
    // Use preprocessed negative signals as fallback
    console.log(`[DealPrimitives] Using ${preprocessedNegSignals.length} preprocessed negative signals as fallback`);
    objection_handling = preprocessedNegSignals.slice(0, 3).map((negSignal, idx) => {
      const signalType = negSignal.type as string;
      let baseObjection = "";
      switch (signalType) {
        case "trust_risk": baseObjection = "They seem trustworthy"; break;
        case "financial_health": baseObjection = "They seem financially stable"; break;
        case "regulatory": baseObjection = "They seem compliant"; break;
        default: baseObjection = "They seem like a better option";
      }

      // Create synthetic signal for counter generation
      const syntheticSignal: Signal = {
        id: `fallback_${idx}`,
        type: signalType as Signal["type"],
        value: negSignal.text,
        citationIds: [],
        normalizedType: signalType,
      };

      return {
        objection: baseObjection,
        counter: generateCounterForSignal(syntheticSignal, competitor, citations, compType),
        evidence: [],
      };
    });
  }

  console.log(`[DealPrimitives] Generated: ${objection_handling.length} objections`);

  // Quick dismisses
  const quick_dismisses = [
    generateTypeSpecificDismiss(competitor, compType, signals),
    ...generateAttacksFromSignals(signals).slice(0, 2),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);

  // Why we win (outcome-focused)
  const whyWeWin = [
    `Onboard BFSI products in days not months — standardized compliance and single API for multi-bank access`,
    `No per-bank reconciliation overhead — Blostem handles settlement across bank partners through one API`,
    `Purpose-built for Indian regulatory requirements — RBI compliance handled natively`,
    `Backed by Rainmatter (Zerodha's VC) — proven infrastructure trusted by leading Indian wealth platforms`,
  ];

  // Why we lose
  const why_we_lose = generateWhyWeLoseForType(compType, signals);

  // Pricing positioning (relative, actionable)
  const pricing_positioning = intelligence.pricing_posture?.opacity === "opaque"
    ? `${competitor}'s pricing is opaque — wallet/gateway models often hide MDR + settlement fees that compound at scale. Blostem offers transparent B2B SaaS pricing with no per-bank overhead.`
    : `${competitor} uses ${intelligence.pricing_posture?.model || "unknown"} model at ${intelligence.pricing_posture?.entryPrice || "unclear pricing"} — this typically scales unpredictably for multi-bank BFSI products. Blostem provides predictable infra-layer pricing.`;

  // Landmines (aggressive, tied to real signals)
  const landmines: string[] = [];
  const seenLandmines = new Set<string>();

  for (const signal of sortedComplaints.slice(0, 4)) {
    const landmine = generateAggressiveLandmine(signal, compType);
    if (landmine && !seenLandmines.has(landmine)) {
      seenLandmines.add(landmine);
      landmines.push(landmine);
    }
  }

  if (landmines.length === 0) {
    landmines.push("How are you handling multi-bank reconciliation today? What's your current settlement timeline?");
    landmines.push("What's your compliance overhead per bank partnership? How does that scale as you add more banks?");
  }

  // FUD responses
  const fudResponses: string[] = [];
  const trustRiskSignals = signals.filter(s => classifyNegativeSignal(s.value) === "trust_risk");

  for (const signal of trustRiskSignals.slice(0, 1)) {
    fudResponses.push(`Blostem separates you from fraud liability — ${signal.value.slice(0, 100)}. With ${competitor}'s wallet model, you absorb this risk.`);
  }

  fudResponses.push(`Blostem is built by BFSI infrastructure veterans — Rainmatter backing provides capital + market credibility through Zerodha's ecosystem.`);

  // Proof points
  const proof_points = [
    `Zerodha integrates Blostem for FD booking on Coin — proven at Indian fintech scale`,
    `Single API replaces N bank integrations — reduces integration maintenance by ~80%`,
    `Purpose-built for FD, RD, and compliance-heavy banking products — not a general payments tool adapted`,
  ];

  // Company overview (1-2 lines from tagline)
  const tagline = intelligence.positioning?.tagline || "";
  const company_overview = tagline
    ? tagline.split(".").slice(0, 2).join(".").trim()
    : `${competitor} is a BFSI competitor serving Indian wealth and fintech platforms.`;

  // Category contrast
  const layerDescriptions: Record<CompetitorType, string> = {
    wallet: "wallet/payment layer",
    gateway: "payment gateway",
    infra: "integration layer",
    NBFC: "lending/NBFC layer",
    unknown: "BFSI solution",
  };
  const category_contrast = `${competitor} = ${layerDescriptions[compType]}; Blostem = BFSI infrastructure layer (FD/RD/banking products)`;

  // When to compete aggressively
  const compete_aggressively_when = getCompeteAggressivelyTriggers(compType, signals);

  const primitives: DealPrimitives = {
    company_overview,
    competitor_type: compType,
    category_contrast,
    quick_dismisses,
    objection_handling,
    why_we_win: whyWeWin.slice(0, 3),
    why_we_lose,
    pricing_positioning,
    landmines: landmines.slice(0, 3),
    FUD_responses: fudResponses.slice(0, 3),
    proof_points,
    compete_aggressively_when: compete_aggressively_when.slice(0, 3),
    signal_trace: signal_trace.slice(0, 3),
  };

  console.log(`[DealPrimitives] Generated: ${objection_handling.length} objections, ${landmines.length} landmines, compete_when: ${compete_aggressively_when.length} triggers`);

  return primitives;
}