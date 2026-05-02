import type { Citation, Signal, ExtractedIntelligence } from "@/types";
import { blostemProfile } from "@/lib/blostem-profile";

export interface DealPrimitives {
  company_overview: string;
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
}

// Map signal types to deal primitives
const OBJECTION_MAP: Record<string, string> = {
  pricing_complaint: "They're cheaper",
  onboarding_delay: "They onboard faster",
  integration_issue: "They're easier to integrate",
  support_issue: "They have better support",
  quality_issue: "They have better uptime",
  reliability_issue: "They have better reliability",
  payout_issue: "They payout faster",
  account_issue: "They have fewer account issues",
  refund_issue: "They handle refunds better",
  general: "They offer better value",
};

function extractDealImplication(signal: Signal): string | null {
  const text = signal.value.toLowerCase();

  // Pricing complaints → cost implication
  if (signal.normalizedType === "pricing_complaint") {
    if (text.includes("fee") || text.includes("charge") || text.includes("cost")) {
      return "increases effective total cost";
    }
    if (text.includes("expensive") || text.includes("overpriced")) {
      return "overprices for the value";
    }
  }

  // Onboarding delays → time-to-market implication
  if (signal.normalizedType === "onboarding_delay") {
    if (text.includes("week") || text.includes("month")) {
      return "delays your time-to-market";
    }
    if (text.includes("slow") || text.includes("long")) {
      return "slows down your launch";
    }
  }

  // Support issues → risk implication
  if (signal.normalizedType === "support_issue") {
    if (text.includes("unresponsive") || text.includes("no response")) {
      return "leaves you stranded when issues arise";
    }
    if (text.includes("poor") || text.includes("bad")) {
      return "compromises your customer experience";
    }
  }

  // Integration issues → complexity implication
  if (signal.normalizedType === "integration_issue") {
    if (text.includes("difficult") || text.includes("complex")) {
      return "adds integration complexity";
    }
    if (text.includes("broken") || text.includes("bug")) {
      return "creates technical debt";
    }
  }

  return null;
}

function generateQuickDismiss(competitor: string, signals: Signal[]): string {
  const pricingSignals = signals.filter(s => s.normalizedType === "pricing_complaint");
  const onboardingSignals = signals.filter(s => s.normalizedType === "onboarding_delay");
  const supportSignals = signals.filter(s => s.normalizedType === "support_issue");

  // Pick the strongest signal type
  if (pricingSignals.length > 0) {
    return `${competitor} may appear cost-effective, but Indian BFSI requirements add compliance and settlement costs that compound — Blostem prices for predictability.`;
  }
  if (onboardingSignals.length > 0) {
    return `${competitor} works for global-first teams — Indian BFSI compliance and multi-bank onboarding typically requires days-to-weeks more time than Blostem.`;
  }
  if (supportSignals.length > 0) {
    return `${competitor} has good global support, but Indian BFSI-specific queries often get routed to delayed tiers — Blostem provides dedicated BFSI expertise.`;
  }

  return `${competitor} is built for global simplicity — Blostem is purpose-built for Indian BFSI compliance and multi-bank complexity.`;
}

function generateCounter(
  signal: Signal,
  competitor: string,
  citations: Citation[]
): string {
  const implication = extractDealImplication(signal);
  const evidence = signal.citationIds[0]
    ? citations.find(c => c.id === signal.citationIds[0])?.source || "source"
    : "Indian BFSI clients report";

  const text = signal.value;

  if (signal.normalizedType === "pricing_complaint") {
    return `While ${competitor} appears competitive, ${evidence} report that ${text.toLowerCase()} — Blostem prices for transparency with no hidden compliance fees.`;
  }
  if (signal.normalizedType === "onboarding_delay") {
    return `True for global use cases, but Indian compliance + multi-bank onboarding adds ${text.toLowerCase()} vs Blostem's standardized BFSI flow.`;
  }
  if (signal.normalizedType === "support_issue") {
    return `${text.charAt(0).toUpperCase() + text.slice(1)}. For Indian BFSI, this means routing delays through global support queues — Blostem's BFSI team is local.`;
  }
  if (signal.normalizedType === "integration_issue") {
    return `${text.charAt(0).toUpperCase() + text.slice(1)}. For multi-bank BFSI products, this compounds across each bank partnership — Blostem's single API handles this.`;
  }

  return `${text.charAt(0).toUpperCase() + text.slice(1)}. In BFSI context, this impacts compliance and time-to-market differently than global markets — Blostem is built for this.`;
}

function generateLandmine(signal: Signal): string | null {
  if (signal.normalizedType === "onboarding_delay") {
    return "How are you handling compliance and bank onboarding timelines today — what's your current T+1 settlement capability?";
  }
  if (signal.normalizedType === "pricing_complaint") {
    return "When you factor in compliance overhead and settlement fees, how does your total cost compare to a unified BFSI infrastructure layer?";
  }
  if (signal.normalizedType === "support_issue") {
    return "Who handles your BFSI-specific compliance questions when they arise — is it the same team as your main integration support?";
  }
  if (signal.normalizedType === "integration_issue") {
    return "How are you managing integration maintenance across multiple bank partners? What's your team's bandwidth for bank API changes?";
  }
  if (signal.normalizedType === "payout_issue") {
    return "What's your current settlement timeline requirement? How critical is T+0 or same-day settlement for your ops?";
  }
  return null;
}

function generateWhyWeLose(signals: Signal[]): string[] {
  const reasons: string[] = [];
  const hasIntegrationSignals = signals.some(s => s.normalizedType === "integration_issue");
  const hasOnboardingSignals = signals.some(s => s.normalizedType === "onboarding_delay");
  const pricingSignals = signals.filter(s => s.normalizedType === "pricing_complaint");

  // If competitor has strong integration story, we may lose to them
  if (!hasIntegrationSignals) {
    reasons.push("Global-first teams prioritizing ecosystem integrations over BFSI-specific compliance");
  }

  // If competitor has fast onboarding for global, we lose when prospects don't need Indian compliance
  if (!hasOnboardingSignals) {
    reasons.push("Platforms already integrated with major bank networks where point-to-point integration is already solved");
  }

  // If no pricing complaints found for competitor, they may have clearer pricing
  if (pricingSignals.length === 0) {
    reasons.push("Enterprises with existing bank partnerships may prefer predictable contract pricing over Blostem's usage model");
  }

  // Default loss scenarios
  if (reasons.length === 0) {
    reasons.push("Very large enterprises (500+ seats) with dedicated integration teams and existing bank relationships");
    reasons.push("Prospects prioritizing speed-to-market over long-term maintainability");
    reasons.push("Platforms already locked into specific bank ecosystems");
  }

  return reasons;
}

function generatePricingPositioning(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  competitor: string
): string {
  const model = intelligence.pricing_posture?.model || "unknown";
  const opacity = intelligence.pricing_posture?.opacity || "unknown";

  if (opacity === "opaque" || model === "unknown") {
    return `${model === "unknown" ? "Pricing model unclear" : "Complex " + model + " structure"} makes it hard to predict total cost — Blostem offers transparent B2B SaaS pricing with no hidden compliance fees.`;
  }

  if (model === "transaction") {
    return `${competitor}'s transaction model with ${intelligence.pricing_posture?.entryPrice || "opaque pricing"} adds up with volume — Blostem provides predictable per-transaction pricing without per-bank overhead.`;
  }
  if (model === "subscription") {
    return `${competitor}'s subscription model ${intelligence.pricing_posture?.entryPrice ? "at " + intelligence.pricing_posture.entryPrice : ""} may not scale for multi-bank BFSI — Blostem's model is designed for BFSI infrastructure at scale.`;
  }

  return `Blostem provides transparent B2B SaaS pricing vs ${competitor}'s ${model} model — designed for Indian BFSI complexity without surprise costs.`;
}

function generateFUDResponse(signal: Signal, competitor: string): string | null {
  // Common FUD: "Blostem is new / smaller"
  if (signal.normalizedType === "quality_issue" || signal.normalizedType === "reliability_issue") {
    return `Blostem is backed by Rainmatter (Zerodha's VC) with proven multi-bank FD infrastructure — ${competitor} may have global scale but Blostem is built specifically for Indian BFSI compliance.`;
  }

  // FUD: "Blostem doesn't have as many integrations"
  if (signal.normalizedType === "integration_issue") {
    return `${competitor} may have more integrations, but each requires separate compliance and maintenance — Blostem's bank partner network is purpose-built for Indian regulatory requirements.`;
  }

  return null;
}

export function deriveDealPrimitives(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  citations: Citation[],
  competitor: string
): DealPrimitives {
  console.log(`[DealPrimitives] Processing ${signals.length} signals for ${competitor}`);

  // Generate objections from complaint signals
  const complaintSignals = signals.filter(s =>
    (s.normalizedType || "").includes("complaint") ||
    (s.normalizedType || "").includes("pricing") ||
    (s.normalizedType || "").includes("support") ||
    (s.normalizedType || "").includes("onboarding")
  );

  const objection_handling = complaintSignals.slice(0, 5).map(signal => {
    const normalizedType = signal.normalizedType || "general";
    const objectionType = OBJECTION_MAP[normalizedType] || OBJECTION_MAP.general;
    const baseObjection = normalizedType === "pricing_complaint"
      ? "They seem cheaper"
      : normalizedType === "onboarding_delay"
      ? "They onboard faster"
      : normalizedType === "support_issue"
      ? "They have better support"
      : normalizedType === "integration_issue"
      ? "They're easier to integrate"
      : `${normalizedType.replace(/_/g, " ")} concerns`;

    return {
      objection: baseObjection,
      counter: generateCounter(signal, competitor, citations),
      evidence: signal.citationIds.slice(0, 2),
    };
  });

  // Generate quick dismisses (1-liners for fast call use)
  const quick_dismisses = [
    generateQuickDismiss(competitor, signals),
    `Built for global scale ≠ built for Indian BFSI complexity — Blostem handles compliance, multi-bank reconciliation, and regulatory changes natively.`,
    `Point-to-point bank integrations work until you need to change banks — Blostem's abstraction layer future-proofs your banking infrastructure.`,
  ];

  // Generate why we win (outcomes, not features)
  const whyWeWin = [
    `Onboard BFSI products in days not months — standardized compliance and single API for multi-bank access`,
    `No per-bank reconciliation overhead — Blostem handles settlement across bank partners through one API`,
    `Purpose-built for Indian regulatory requirements — RBI compliance handles natively, not as an afterthought`,
    `Backed by Rainmatter (Zerodha's VC) — proven infrastructure trusted by leading Indian wealth platforms`,
  ];

  // Generate why we lose
  const why_we_lose = generateWhyWeLose(signals);

  // Generate pricing positioning
  const pricing_positioning = generatePricingPositioning(intelligence, signals, competitor);

  // Generate landmines (questions that expose competitor gaps)
  const landmines: string[] = [];
  const seenLandmines = new Set<string>();

  for (const signal of complaintSignals.slice(0, 4)) {
    const landmine = generateLandmine(signal);
    if (landmine && !seenLandmines.has(landmine)) {
      seenLandmines.add(landmine);
      landmines.push(landmine);
    }
  }

  // Default landmines if none derived from signals
  if (landmines.length === 0) {
    landmines.push("How are you handling multi-bank reconciliation today? What's your current settlement timeline?");
    landmines.push("What's your compliance overhead per bank partnership? How does that scale as you add more banks?");
  }

  // Generate FUD responses
  const fudResponses: string[] = [];
  const qualitySignals = signals.filter(s =>
    s.normalizedType === "quality_issue" || s.normalizedType === "reliability_issue"
  );

  for (const signal of qualitySignals.slice(0, 2)) {
    const fud = generateFUDResponse(signal, competitor);
    if (fud) fudResponses.push(fud);
  }

  // Add default FUD response
  if (fudResponses.length === 0) {
    fudResponses.push(`Blostem is built by BFSI infrastructure veterans — Rainmatter backing provides both capital and market credibility through Zerodha's ecosystem.`);
  }

  // Generate proof points (evidence-backed, speakable)
  const proof_points = [
    `Zerodha integrates Blostem for FD booking on Coin — proven at Indian fintech scale`,
    `Single API replaces N bank integrations — reduces integration maintenance by ~80%`,
    `Purpose-built for FD, RD, and compliance-heavy banking products — not a general payments tool adapted`,
  ];

  // Company overview (1-2 lines, AE-ready)
  const company_overview = intelligence.competitor_summary
    ? intelligence.competitor_summary.slice(0, 300)
    : `${competitor} is a BFSI competitor serving Indian wealth and fintech platforms.`;

  const primitives: DealPrimitives = {
    company_overview,
    quick_dismisses,
    objection_handling,
    why_we_win: whyWeWin,
    why_we_lose: why_we_lose,
    pricing_positioning,
    landmines,
    FUD_responses: fudResponses,
    proof_points,
  };

  console.log(`[DealPrimitives] Generated: ${objection_handling.length} objections, ${landmines.length} landmines, ${quick_dismisses.length} dismisses`);

  return primitives;
}