import type { Citation, Signal, ExtractedIntelligence} from "@/types";
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

// Detect competitor type dynamically from signals and tagline - no hardcoded company names
function detectCompetitorType(competitor: string, signals: Signal[], intelligence: ExtractedIntelligence): CompetitorType {
  const tagline = (intelligence.positioning?.tagline || "").toLowerCase();

  // Auto-detect wallet vs gateway vs NBFC vs infra from tagline - category patterns only
  if (/wallet|mobile.*wallet|digital.*wallet|prepaid.*wallet/i.test(tagline)) {
    return "wallet";
  }
  if (/gateway|merchant.*payment|payment.*processor|checkout.*solution/i.test(tagline)) {
    return "gateway";
  }
  if (/nbfc|non.*banking.*financial/i.test(tagline)) {
    return "NBFC";
  }
  if (/infrastructure|infra|banking.*as.*a.*service|baas/i.test(tagline)) {
    return "infra";
  }

  // Check signals for type indicators - category patterns only
  const allText = signals.map(s => s.value).join(" ").toLowerCase();

  if (/wallet|digital.*wallet|mobile.*wallet|wallet.*balance|upi.*payment|qr.*code.*payment/i.test(allText)) {
    return "wallet";
  }
  if (/payment.*gateway|merchant.*checkout|payment.*processor/i.test(allText)) {
    return "gateway";
  }
  if (/nbfc|lending|loan.*product|credit.*product/i.test(allText)) {
    return "NBFC";
  }
  if (/infrastructure|infra.*layer|banking.*as.*service/i.test(allText)) {
    return "infra";
  }

  return "unknown";
}

// Competitor-specific attack vectors - auto-generated from signal types
function _generateAttacksFromSignals(signals: Signal[]): string[] {
  const attacks: string[] = [];

  // Group signals by type
  const trustRiskSignals = signals.filter(s => classifyNegativeSignal(s.value) === "trust_risk");
  const regulatorySignals = signals.filter(s => classifyNegativeSignal(s.value) === "regulatory");
  const financialSignals = signals.filter(s => classifyNegativeSignal(s.value) === "financial_health");
  const reliabilitySignals = signals.filter(s => classifyNegativeSignal(s.value) === "reliability");

  // Generate attacks based on detected signal types (using generic text, not raw signal)
  if (trustRiskSignals.length > 0) {
    attacks.push(`Wallet-layer fraud incidents — how does this affect your confidence in long-term reliability?`);
  }

  if (regulatorySignals.length > 0) {
    attacks.push(`Regulatory complexity expansion — how are you managing compliance risk with this provider?`);
  }

  if (financialSignals.length > 0) {
    attacks.push(`Financial instability signals — does this affect their ability to invest in the platform?`);
  }

  if (reliabilitySignals.length > 0) {
    attacks.push(`Service disruption history — what's your contingency when this happens?`);
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

// Detect compound pricing model from competitor type + signals (deterministic, never "unknown")
function detectPricingModel(compType: CompetitorType, signals: Signal[]): string {
  const allText = signals.map(s => s.value.toLowerCase()).join(" ");

  const hasWallet = compType === "wallet" || allText.includes("wallet") || allText.includes("upi");
  const hasPayments = allText.includes("payment") || allText.includes("gateway") || allText.includes("checkout") || allText.includes("mdr");
  const hasLending = allText.includes("lending") || allText.includes("loan") || allText.includes("credit") || allText.includes("nbfc");

  // Build compound model descriptor
  if (hasWallet && hasLending) return "transaction + wallet-based (MDR-driven) + lending cross-sell";
  if (hasWallet && hasPayments) return "transaction + wallet-based (MDR-driven)";
  if (hasWallet) return "transaction + wallet-based (MDR-driven)";
  if (hasLending) return "lending margin + transaction-based";
  if (hasPayments) return "transaction-based (MDR + per-txn fees)";

  // Type-based fallback (never "unknown")
  switch (compType) {
    case "gateway": return "transaction-based (% + per-txn fee)";
    case "NBFC": return "lending margin + transaction-based";
    case "infra": return "usage-based infrastructure";
    default: return "transaction-based (MDR-driven)";
  }
}

function generateCounterForSignal(
  signal: Signal,
): string {
  const citation = signal.citationIds[0];
  const signalType = classifyNegativeSignal(signal.value);
  const citationRef = citation ? ` [${citation}]` : "";

  // Forceful counters: acknowledge → concrete risk → Blostem contrast
  switch (signalType) {
    case "trust_risk":
      return `That works early, but wallet-layer fraud incidents expose partners to liability — infra-layer models isolate you from this risk${citationRef}.`;

    case "financial_health":
      return `Revenue decline in financial services signals uneven product traction — infra-layer avoids dependency on evolving business lines${citationRef}.`;

    case "regulatory":
      return `Expansion into lending + CBDC + cross-border flows increases regulatory surface area — infra-layer isolates compliance risk instead of inheriting it${citationRef}.`;

    case "reliability":
      return `Settlement delays and service disruptions compound at scale — infra-layer provides SLA-backed predictability for merchant settlements${citationRef}.`;

    case "strategy_drift":
      return `Product diversification dilutes focus — infra-layer ensures long-term platform alignment for BFSI products${citationRef}.`;

    default: {
      const normalizedType = signal.normalizedType || "general";

      if (normalizedType === "pricing_complaint") {
        return `MDR + settlement layers compound costs at volume — infra-layer provides predictable B2B pricing without transaction overhead${citationRef}.`;
      }
      if (normalizedType === "support_issue") {
        return `Generic support delays escalate for BFSI compliance — infra-layer provides BFSI-native team and faster resolution${citationRef}.`;
      }
      if (normalizedType === "integration_issue") {
        return `Each bank partnership compounds integration overhead — infra-layer's single API handles multi-bank complexity${citationRef}.`;
      }
      if (normalizedType === "onboarding_delay") {
        return `BFSI compliance timelines add weeks to onboarding — infra-layer's standardized flow is designed for speed${citationRef}.`;
      }

      return `Transaction complexity compounds at scale — infra-layer removes cost and compliance unpredictability for BFSI products${citationRef}.`;
    }
  }
}

function generateAggressiveLandmine(signal: Signal): string | null {
  const signalType = classifyNegativeSignal(signal.value);
  const citation = signal.citationIds[0] ? ` [${signal.citationIds[0]}]` : "";

  // Sharp, forceful landmine questions — pain-driven, no abstraction
  switch (signalType) {
    case "trust_risk":
      return `How do you isolate settlement risk when fraud incidents hit payment flows?${citation}`;

    case "financial_health":
      return `What happens to your margins when adjacent expansions introduce execution risk?${citation}`;

    case "regulatory":
      return `How do you handle multi-bank compliance when regulatory surface area expands?${citation}`;

    case "reliability":
      return `What SLA-backed recourse do you have when payment disruptions hit settlements?${citation}`;

    case "strategy_drift":
      return `How do you trust platform investment when product focus keeps shifting?${citation}`;

    default: {
      const normalizedType = signal.normalizedType || "general";

      if (normalizedType === "pricing_complaint") {
        return `How do you manage margin compression as MDR + settlement fees scale with volume?`;
      }
      if (normalizedType === "integration_issue") {
        return `How many FTEs maintain bank integrations, and what's the cost when APIs change?`;
      }
      if (normalizedType === "support_issue") {
        return `Who handles BFSI compliance questions when issues escalate?${citation}`;
      }
      return null;
    }
  }
}

function generateWhyWeLoseForType(compType: CompetitorType): string[] {
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

  const objection_handling: DealPrimitives["objection_handling"] = [];

  // Mandatory first objection: "We already use {competitor}" — weaponize real complaints
  const topComplaints = allComplaintSignals
    .filter(s => s.normalizedType === "support_issue" || s.normalizedType === "payout_issue" || s.normalizedType === "account_issue" || classifyNegativeSignal(s.value) === "trust_risk")
    .slice(0, 2);
  // Fallback default based on competitor type
  const defaultComplaintByType: Record<string, string> = {
    wallet: "wallet MDR + settlement complexity",
    gateway: "gateway pricing opacity and MDR compounding",
    NBFC: "lending margin overhead and compliance complexity",
    infra: "integration maintenance overhead",
    unknown: "pricing opacity and operational complexity",
  };
  const defaultComplaint = defaultComplaintByType[compType] || "pricing complexity and operational overhead";

  const complaintSummary = topComplaints.length > 0
    ? topComplaints.map(s => s.value.slice(0, 60).toLowerCase()).join(" and ")
    : defaultComplaint;
  const firstCitation = topComplaints[0]?.citationIds[0] || citations[0]?.id || "";

  objection_handling.push({
    objection: `We already use ${competitor}`,
    counter: `Many teams start there, but complaints around ${complaintSummary} become critical as volumes scale${firstCitation ? ` [${firstCitation}]` : ""}.`,
    evidence: topComplaints.flatMap(s => s.citationIds).slice(0, 2),
  });

  // Add unique signal-based objections (deduped from the mandatory one)
  const uniqueObjectionTypes = new Set<string>();
  uniqueObjectionTypes.add("already_use");

  if (sortedComplaints.length > 0) {
    for (const signal of sortedComplaints) {
      if (objection_handling.length >= 3) break;

      const signalType = classifyNegativeSignal(signal.value);
      if (uniqueObjectionTypes.has(signalType)) continue;
      uniqueObjectionTypes.add(signalType);

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
          else continue; // skip generic duplicates
      }

      objection_handling.push({
        objection: baseObjection,
        counter: generateCounterForSignal(signal),
        evidence: signal.citationIds.slice(0, 2),
      });
    }
  } else if (preprocessedNegSignals.length > 0) {
    console.log(`[DealPrimitives] Using ${preprocessedNegSignals.length} preprocessed negative signals as fallback`);
    for (const negSignal of preprocessedNegSignals.slice(0, 2)) {
      if (objection_handling.length >= 3) break;
      const signalType = negSignal.type as string;
      if (uniqueObjectionTypes.has(signalType)) continue;
      uniqueObjectionTypes.add(signalType);

      let baseObjection = "";
      switch (signalType) {
        case "trust_risk": baseObjection = "They seem trustworthy"; break;
        case "regulatory": baseObjection = "They seem compliant"; break;
        default: baseObjection = "They seem like a better option";
      }

      const syntheticSignal: Signal = {
        id: `fallback_${objection_handling.length}`,
        type: signalType as Signal["type"],
        value: negSignal.text,
        citationIds: [],
        normalizedType: signalType,
      };

      objection_handling.push({
        objection: baseObjection,
        counter: generateCounterForSignal(syntheticSignal),
        evidence: [],
      });
    }
  }

  console.log(`[DealPrimitives] Generated: ${objection_handling.length} objections`);

  // Quick dismisses - max 2, pain-driven
  const primaryDismiss = generateTypeSpecificDismiss(competitor, compType, signals);
  const typeDismiss = (() => {
    switch (compType) {
      case "wallet":
        return `MDR + settlement fees compound unpredictably as wallet volumes scale.`;
      case "gateway":
        return `Gateway handles payments, not multi-bank reconciliation or compliance complexity.`;
      case "NBFC":
        return `Lending margin models layer regulatory overhead your team absorbs.`;
      case "infra":
        return `Integration complexity doesn't equal BFSI compliance capability.`;
      default:
        return null;
    }
  })();

  const quick_dismisses = [primaryDismiss, typeDismiss].filter((v): v is string => v !== null).slice(0, 2);

  // Why we win (outcome-focused)
  const whyWeWin = [
    `Onboard BFSI products in days not months — standardized compliance and single API for multi-bank access`,
    `No per-bank reconciliation overhead — Blostem handles settlement across bank partners through one API`,
    `Purpose-built for Indian regulatory requirements — RBI compliance handled natively`,
    `Backed by Rainmatter (Zerodha's VC) — proven infrastructure trusted by leading Indian wealth platforms`,
  ];

  // Why we lose
  const why_we_lose = generateWhyWeLoseForType(compType);

  // Pricing classification — detect compound models instead of defaulting to "unknown"
  const pricingModel = intelligence.pricing_posture?.model || "unknown";
  const detectedModel = pricingModel === "unknown"
    ? detectPricingModel(compType, signals)
    : pricingModel;

  // Pricing positioning (directional framing, never just "opaque")
  const pricing_positioning = (() => {
    if (compType === "wallet") {
      return `Transaction-based pricing compounds with volume (MDR + settlement + wallet add-ons) vs Blostem's fixed infra cost model.`;
    }
    if (compType === "gateway") {
      return `Gateway % + per-transaction fees scale unpredictably at volume — Blostem's infra pricing is fixed and predictable.`;
    }
    if (compType === "NBFC") {
      return `Lending margin + compliance overhead creates variable cost — Blostem's infra model decouples from transaction volume.`;
    }
    if (intelligence.pricing_posture?.opacity === "opaque") {
      return `${competitor}'s pricing is opaque — ${detectedModel} models compound with volume (MDR + settlement + add-ons) vs Blostem's fixed infra cost model.`;
    }
    return `${competitor} uses ${detectedModel} model — this scales unpredictably for multi-bank BFSI products. Blostem provides predictable infra-layer pricing.`;
  })();

  // Landmines (aggressive, tied to real signals)
  const landmines: string[] = [];
  const seenLandmines = new Set<string>();

  for (const signal of sortedComplaints.slice(0, 4)) {
    const landmine = generateAggressiveLandmine(signal);
    if (landmine && !seenLandmines.has(landmine)) {
      seenLandmines.add(landmine);
      landmines.push(landmine);
    }
  }

  if (landmines.length === 0) {
    landmines.push("How do you handle reconciliation across multiple bank settlement flows today?");
    landmines.push("What happens to your margins when MDR + gateway fees scale with volume?");
    landmines.push("How do you manage compliance overhead as you add more bank partnerships?");
  }

  // FUD responses
  const fudResponses: string[] = [];

  // If trust risk signals exist, use generic FUD
  const hasTrustRisk = signals.some(s => classifyNegativeSignal(s.value) === "trust_risk");
  if (hasTrustRisk) {
    fudResponses.push(`Blostem separates you from fraud liability — wallet-layer incidents expose partners to liability that infra-layer solutions avoid.`);
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
    gateway: "payment gateway / payment orchestration layer",
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