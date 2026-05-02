import type { Citation, Signal, ExtractedIntelligence } from "@/types";
import { blostemProfile } from "@/lib/blostem-profile";

export type CompetitorType = "wallet" | "gateway" | "infra" | "NBFC" | "unknown";

export interface DealPrimitives {
  company_overview: string;
  competitor_type: CompetitorType;
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

// Detect competitor type from signals and intelligence
function detectCompetitorType(competitor: string, signals: Signal[], intelligence: ExtractedIntelligence): CompetitorType {
  const lower = competitor.toLowerCase();

  // Wallet indicators
  if (lower.includes("mobikwik") || lower.includes("paytm") || lower.includes("phonepe")) {
    return "wallet";
  }

  // Check signals for wallet-related content (wallet detection handled via competitor name)
  // Wallet detection happens below via competitor name matching

  // NBFC indicators from signals
  const nbfcSignals = signals.filter(s =>
    s.value.toLowerCase().includes("nbfc") ||
    s.value.toLowerCase().includes("lending") ||
    s.value.toLowerCase().includes("loan")
  );

  if (nbfcSignals.length > 0) {
    return "NBFC";
  }

  // Gateway indicators
  const gatewaySignals = signals.filter(s =>
    s.value.toLowerCase().includes("payment gateway") ||
    s.value.toLowerCase().includes("merchant") ||
    s.value.toLowerCase().includes("checkout")
  );

  if (gatewaySignals.length > 0) {
    return "gateway";
  }

  // Check intelligence for type hints
  const tagline = (intelligence.positioning?.tagline || "").toLowerCase();
  if (tagline.includes("wallet") || tagline.includes("upi")) return "wallet";
  if (tagline.includes("gateway") || tagline.includes("merchant")) return "gateway";
  if (tagline.includes("infrastructure") || tagline.includes("banking")) return "infra";

  return "unknown";
}

// Expand complaints to include implicit signals
function isImplicitComplaint(signal: Signal): boolean {
  const text = (signal.value + " " + (signal.normalizedType || "")).toLowerCase();
  return text.includes("fraud") ||
         text.includes("loss") ||
         text.includes("decline") ||
         text.includes("regulatory") ||
         text.includes("ban") ||
         text.includes("outage") ||
         text.includes("failure") ||
         text.includes("risk") ||
         text.includes("scam") ||
         text.includes("nbfc") ||
         text.includes("default") ||
         text.includes("lawsuit") ||
         text.includes(" RBI ");
}

function getImplicitComplaintType(signal: Signal): string | null {
  const text = signal.value.toLowerCase();

  if (text.includes("fraud") || text.includes("scam") || text.includes("risk") || text.includes("₹")) {
    return "trust_risk";
  }
  if (text.includes("loss") || text.includes("decline") || text.includes("default")) {
    return "financial_health";
  }
  if (text.includes("regulatory") || text.includes("RBI") || text.includes("ban")) {
    return "regulatory";
  }
  if (text.includes("outage") || text.includes("failure") || text.includes("down")) {
    return "reliability";
  }
  if (text.includes("lawsuit") || text.includes("legal") || text.includes("court")) {
    return "legal";
  }

  return null;
}

// Competitor-specific attack vectors
function getWalletAttacks(signals: Signal[]): string[] {
  const attacks: string[] = [];

  const fraudSignal = signals.find(s => s.value.toLowerCase().includes("fraud") || s.value.includes("₹"));
  if (fraudSignal) {
    attacks.push(`Trust risk: wallet providers face higher fraud exposure — how are you managing fraud liability?`);
  }

  const nbfcSignal = signals.find(s => s.value.toLowerCase().includes("nbfc"));
  if (nbfcSignal) {
    attacks.push(`NBFC partnerships add regulatory complexity — how does this affect your compliance overhead?`);
  }

  const mdrSignal = signals.find(s => s.value.toLowerCase().includes("mdr"));
  if (mdrSignal) {
    attacks.push(`Wallet MDR + settlement fees compound at scale — infra-layer pricing is typically 40-60% lower`);
  }

  return attacks;
}

function getGatewayAttacks(signals: Signal[]): string[] {
  const attacks: string[] = [];

  const settlementSignal = signals.find(s => s.value.toLowerCase().includes("settlement"));
  if (settlementSignal) {
    attacks.push(`Settlement delays impact working capital — T+1 vs same-day affects your cash flow directly`);
  }

  const pricingSignal = signals.find(s => s.normalizedType === "pricing_complaint");
  if (pricingSignal) {
    attacks.push(`Gateway % + per-transaction fees scale unpredictably — Blostem's infra model provides cost predictability`);
  }

  return attacks;
}

function getNBFCAttacks(signals: Signal[]): string[] {
  const attacks: string[] = [];

  const complianceSignal = signals.find(s => s.value.toLowerCase().includes("regulatory") || s.value.toLowerCase().includes("RBI"));
  if (complianceSignal) {
    attacks.push(`NBFC regulations require dedicated compliance infrastructure — Blostem handles this natively`);
  }

  const lendingSignal = signals.find(s => s.value.toLowerCase().includes("lending") || s.value.toLowerCase().includes("loan"));
  if (lendingSignal) {
    attacks.push(`Lending products require separate compliance tracks — Blostem's FD/RD infra supports credit-adjacent products`);
  }

  return attacks;
}

function generateTypeSpecificDismiss(competitor: string, compType: CompetitorType, signals: Signal[]): string {
  switch (compType) {
    case "wallet":
      const fraudSignal = signals.find(s => s.value.toLowerCase().includes("fraud") || s.value.includes("₹"));
      if (fraudSignal) {
        return `${competitor}'s wallet model introduces fraud liability and MDR complexity — Blostem's infra-layer removes this risk.`;
      }
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
  const source = citation ? citations.find(c => c.id === citation)?.source : null;

  // Trust/risk signals (highest value AE weapon)
  if (isImplicitComplaint(signal) && getImplicitComplaintType(signal) === "trust_risk") {
    return `${text}. This directly impacts your risk posture — Blostem's infra-layer separates your product from fraud liability [${citation || 'source'}].`;
  }

  // Financial health signals
  if (getImplicitComplaintType(signal) === "financial_health") {
    return `${text}. This signals product-market fit issues — Blostem is backed by Rainmatter (Zerodha), with proven platform scale [${citation || 'source'}].`;
  }

  // Regulatory signals
  if (getImplicitComplaintType(signal) === "regulatory") {
    return `${text}. For BFSI products, regulatory issues compound — Blostem handles compliance natively, so you avoid ${competitor}'s compliance burden [${citation || 'source'}].`;
  }

  // Standard complaint types
  const normalizedType = signal.normalizedType || "general";

  if (normalizedType === "pricing_complaint") {
    return `${competitor} appears cost-effective, but ${source || 'sources'} report ${text.toLowerCase()} — Blostem prices for transparency with no hidden compliance fees.`;
  }
  if (normalizedType === "support_issue") {
    return `${text.charAt(0).toUpperCase() + text.slice(1)}. For BFSI, this means routing delays through generic support — Blostem's team is BFSI-native [${citation || 'source'}].`;
  }
  if (normalizedType === "integration_issue") {
    return `${text.charAt(0).toUpperCase() + text.slice(1)}. Each bank partnership compounds this — Blostem's single API handles multi-bank complexity [${citation || 'source'}].`;
  }
  if (normalizedType === "onboarding_delay") {
    return `${text.charAt(0).toUpperCase() + text.slice(1)}. BFSI compliance timelines add weeks to this — Blostem's standardized flow is designed for speed [${citation || 'source'}].`;
  }

  // Generic fallback
  return `${text.charAt(0).toUpperCase() + text.slice(1)}. In BFSI context, this impacts compliance and time-to-market — Blostem is built specifically for this [${citation || 'source'}].`;
}

function generateAggressiveLandmine(signal: Signal, compType: CompetitorType): string | null {
  const text = signal.value.toLowerCase();
  const citation = signal.citationIds[0] ? `[${signal.citationIds[0]}]` : "";

  // Trust/risk landmines (Tier-1 AE weapons)
  if (text.includes("fraud") || text.includes("₹") || text.includes("scam")) {
    return `How are you handling fraud liability and reconciliation when wallet payouts fail? ${citation}`;
  }

  // Financial health landmines
  if (text.includes("loss") || text.includes("decline") || text.includes("default")) {
    return `Given ${signal.value.slice(0, 50)}... how does this affect your confidence in ${signal.normalizedType?.includes("provider") ? "their" : "their"} long-term viability as a partner? ${citation}`;
  }

  // Regulatory landmines
  if (text.includes("regulatory") || text.includes("rbi") || text.includes("ban")) {
    return `How are you managing regulatory compliance for this provider? What's your contingency if they face RBI action? ${citation}`;
  }

  // Standard landmines by type
  if (compType === "wallet") {
    if (text.includes("mdr") || text.includes("fee")) {
      return `When you factor in MDR + settlement fees, how does your effective cost per transaction compare to an infra-layer solution?`;
    }
  }

  if (compType === "gateway") {
    if (text.includes("settlement")) {
      return `How do you handle settlement failures or disputes? What's your recourse when payouts are delayed?`;
    }
  }

  // Default landmine for integration/complexity
  if (text.includes("integration") || text.includes("complex") || text.includes("api")) {
    return `How are you managing integration maintenance across bank partners? What's your team's bandwidth for API changes?`;
  }

  return null;
}

function generateWhyWeLoseForType(compType: CompetitorType, signals: Signal[]): string[] {
  const reasons: string[] = [];

  switch (compType) {
    case "wallet":
      reasons.push("Prospects already locked into wallet/upi ecosystem (Paytm, PhonePe)");
      reasons.push("Projects requiring deep wallet integrations (gift cards, recharges)");
      break;
    case "gateway":
      reasons.push("Merchants already integrated with Razorpay/Cashfree ecosystem");
      reasons.push("Projects prioritizing gateway familiarity over infra sophistication");
      break;
    case "NBFC":
      reasons.push("Prospects with existing NBFC relationships and compliance teams");
      reasons.push("Deals where lending product roadmap is more important than banking infra");
      break;
    case "infra":
      reasons.push("Prospects with dedicated integration teams and bank partnerships already in place");
      reasons.push("Enterprises prioritizing in-house control over third-party abstraction");
      break;
    default:
      reasons.push("Very large enterprises (500+ seats) with existing bank relationships");
      reasons.push("Prospects prioritizing speed-to-market over long-term maintainability");
  }

  return reasons;
}

function getCompeteAggressivelyTriggers(compType: CompetitorType, signals: Signal[]): string[] {
  const triggers: string[] = [];

  // Universal triggers
  triggers.push("Prospect complains about reconciliation overhead with multiple bank partners");
  triggers.push("Prospect is building wealth management or savings product");
  triggers.push("Risk and compliance is a top priority for the prospect");

  // Type-specific triggers
  switch (compType) {
    case "wallet":
      triggers.push("Prospect concerned about MDR costs and transaction fee opacity");
      triggers.push("Prospect worried about wallet fraud liability and settlement risk");
      break;
    case "gateway":
      triggers.push("Prospect experiencing settlement delays or payout issues");
      triggers.push("Prospect frustrated with per-transaction fee scaling");
      break;
    case "NBFC":
      triggers.push("Prospect building FD/RD products and needs regulatory-compliant infra");
      triggers.push("Prospect frustrated with point-to-point bank integrations for credit products");
      break;
    case "infra":
      triggers.push("Prospect is a fintech startup looking to launch BFSI products quickly");
      triggers.push("Prospect values developer experience and API simplicity");
      break;
  }

  // Signal-based triggers
  const fraudSignal = signals.find(s => s.value.toLowerCase().includes("fraud") || s.value.includes("₹"));
  if (fraudSignal) {
    triggers.push("Prospect is risk-averse and concerned about payment reliability");
  }

  const complianceSignal = signals.find(s => s.value.toLowerCase().includes("regulatory") || s.value.toLowerCase().includes("rbi"));
  if (complianceSignal) {
    triggers.push("Prospect has had RBI compliance issues with current provider");
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

  // Detect competitor type
  const compType = detectCompetitorType(competitor, signals, intelligence);
  console.log(`[DealPrimitives] Detected competitor type: ${compType}`);

  // Expand signals with implicit complaints (fraud, regulatory, financial health)
  const expandedSignals = signals.map(signal => {
    if (isImplicitComplaint(signal)) {
      const implicitType = getImplicitComplaintType(signal);
      console.log(`[DealPrimitives] Implicit complaint: ${signal.value.slice(0, 50)}... → ${implicitType}`);
    }
    return signal;
  });

  // Collect ALL complaint-adjacent signals (including implicit)
  const allComplaintSignals = signals.filter(s => {
    const normalized = s.normalizedType || "";
    const text = s.value.toLowerCase();
    return normalized.includes("complaint") ||
           normalized.includes("pricing") ||
           normalized.includes("support") ||
           normalized.includes("onboarding") ||
           normalized.includes("integration") ||
           isImplicitComplaint(s);
  });

  // Build signal trace for traceability
  const signal_trace = allComplaintSignals.slice(0, 5).map(signal => {
    let weapon = "";
    if (isImplicitComplaint(signal)) {
      const type = getImplicitComplaintType(signal);
      if (type === "trust_risk") weapon = "Objection: 'They seem reliable' → Counter: Trust risk evidence";
      else if (type === "financial_health") weapon = "Objection: 'They seem stable' → Counter: Financial decline evidence";
      else if (type === "regulatory") weapon = "Objection: 'They seem compliant' → Counter: Regulatory issue evidence";
      else weapon = "Objection: 'They seem capable' → Counter: Operational failure evidence";
    } else if (signal.normalizedType === "pricing_complaint") {
      weapon = "Objection: 'They're cheaper' → Counter: Hidden costs evidence";
    } else if (signal.normalizedType === "support_issue") {
      weapon = "Objection: 'They have better support' → Counter: Support failure evidence";
    } else if (signal.normalizedType === "integration_issue") {
      weapon = "Objection: 'They're easier to integrate' → Counter: Complexity evidence";
    }

    return {
      signal: signal.value.slice(0, 80),
      weapon,
      type: signal.normalizedType || "unknown"
    };
  });

  // Generate objection handling (prioritize trust/risk signals)
  const sortedComplaints = [...allComplaintSignals].sort((a, b) => {
    const aIsRisk = isImplicitComplaint(a) && getImplicitComplaintType(a) === "trust_risk";
    const bIsRisk = isImplicitComplaint(b) && getImplicitComplaintType(b) === "trust_risk";
    if (aIsRisk && !bIsRisk) return -1;
    if (!aIsRisk && bIsRisk) return 1;
    return 0;
  });

  const objection_handling = sortedComplaints.slice(0, 4).map(signal => {
    const normalizedType = signal.normalizedType || "general";

    let baseObjection = "";
    if (isImplicitComplaint(signal)) {
      const type = getImplicitComplaintType(signal);
      if (type === "trust_risk") baseObjection = "They seem trustworthy";
      else if (type === "financial_health") baseObjection = "They seem financially stable";
      else if (type === "regulatory") baseObjection = "They seem compliant";
      else baseObjection = "They seem reliable";
    } else if (normalizedType === "pricing_complaint") {
      baseObjection = "They seem cheaper";
    } else if (normalizedType === "support_issue") {
      baseObjection = "They have better support";
    } else if (normalizedType === "integration_issue") {
      baseObjection = "They're easier to integrate";
    } else if (normalizedType === "onboarding_delay") {
      baseObjection = "They onboard faster";
    } else {
      baseObjection = "They seem like a better option";
    }

    return {
      objection: baseObjection,
      counter: generateCounterForSignal(signal, competitor, citations, compType),
      evidence: signal.citationIds.slice(0, 2),
    };
  });

  // Quick dismisses (competitor-specific, not template)
  const quick_dismisses = [
    generateTypeSpecificDismiss(competitor, compType, signals),
    ...getWalletAttacks(signals),
    ...getGatewayAttacks(signals),
    ...getNBFCAttacks(signals),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);

  // Why we win (outcome-focused, type-specific)
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
  const riskSignals = signals.filter(s => isImplicitComplaint(s) && getImplicitComplaintType(s) === "trust_risk");

  for (const signal of riskSignals.slice(0, 1)) {
    fudResponses.push(`Blostem separates you from fraud liability — ${signal.value.slice(0, 100)}. ${competitor} absorbed this risk; you would too with their wallet model.`);
  }

  fudResponses.push(`Blostem is built by BFSI infrastructure veterans — Rainmatter backing provides capital + market credibility through Zerodha's ecosystem.`);

  // Proof points
  const proof_points = [
    `Zerodha integrates Blostem for FD booking on Coin — proven at Indian fintech scale`,
    `Single API replaces N bank integrations — reduces integration maintenance by ~80%`,
    `Purpose-built for FD, RD, and compliance-heavy banking products — not a general payments tool adapted`,
  ];

  // Company overview (competitor-specific, no context contamination)
  const company_overview = intelligence.competitor_summary
    ? intelligence.competitor_summary.split(".").slice(0, 2).join(".").trim()
    : `${competitor} is a BFSI competitor serving Indian wealth and fintech platforms.`;

  // When to compete aggressively
  const compete_aggressively_when = getCompeteAggressivelyTriggers(compType, signals);

  const primitives: DealPrimitives = {
    company_overview,
    competitor_type: compType,
    quick_dismisses,
    objection_handling,
    why_we_win: whyWeWin,
    why_we_lose: why_we_lose,
    pricing_positioning,
    landmines,
    FUD_responses: fudResponses,
    proof_points,
    compete_aggressively_when,
    signal_trace,
  };

  console.log(`[DealPrimitives] Generated: ${objection_handling.length} objections, ${landmines.length} landmines, compete_when: ${compete_aggressively_when.length} triggers`);

  return primitives;
}