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

// Signal types
type SignalType = "trust_risk" | "financial_health" | "regulatory" | "reliability" | "strategy_drift" | "pricing_complaint" | "support_issue" | "integration_issue" | "onboarding_delay" | "quality_issue" | "reliability_issue" | "general";

// Classify signal type from text
function classifySignalType(text: string, normalizedType?: string): SignalType {
  // First check explicit normalizedType if available
  if (normalizedType && normalizedType !== "general") {
    return normalizedType as SignalType;
  }

  // Otherwise derive from text content
  const lower = text.toLowerCase();

  if (/fraud|scam|₹\s*\d+\s*(?:cr|crore)|money.*launder|security.*breach|sanction.*popup|data.*breach|credential.*leak|class.*action|lawsuit/i.test(lower)) {
    return "trust_risk";
  }
  if (/rbi|regulatory|ban|suspended|compliance.*issue|penalty|fine|sec.*fine|enforcement.*action|investigation/i.test(lower)) {
    return "regulatory";
  }
  if (/loss|declin|revenue.*drop|widen.*loss|net.*loss|operating.*loss|default|bankrupt|insolven/i.test(lower)) {
    return "financial_health";
  }
  if (/outage|service.*disrupt|downtime|system.*fail|breach|leak/i.test(lower)) {
    return "reliability";
  }
  if (/pivot|restructur|shut.*down|close.*operation|layoff/i.test(lower)) {
    return "strategy_drift";
  }
  if (/high.*fee|expensive|overpriced|hidden.*cost|pricing.*issue|costly/i.test(lower)) {
    return "pricing_complaint";
  }
  if (/support.*delay|poor.*support|unresponsive|support.*issue/i.test(lower)) {
    return "support_issue";
  }
  if (/integration.*complex|difficult.*integration|api.*issue/i.test(lower)) {
    return "integration_issue";
  }
  if (/slow.*onboard|onboard.*delay|weeks.*to.*start/i.test(lower)) {
    return "onboarding_delay";
  }
  if (/buggy|broken|glitch|quality.*issue/i.test(lower)) {
    return "quality_issue";
  }

  return "general";
}

// Check if signal is an actual customer complaint (not news/inference)
function isActualCustomerComplaint(signal: Signal): boolean {
  const complaintTypes = ["pricing_complaint", "support_issue", "integration_issue", "onboarding_delay", "quality_issue", "reliability_issue"];
  return complaintTypes.includes(signal.normalizedType || "");
}

// Check if signal is news-based (negative signal about company, not customer complaint)
function isNewsBasedNegativeSignal(signal: Signal): boolean {
  const newsTypes = ["trust_risk", "regulatory", "financial_health", "reliability", "strategy_drift"];
  return newsTypes.includes(signal.normalizedType || "") || (!signal.normalizedType && classifySignalType(signal.value) !== "general");
}

// Derive objection text DIRECTLY from signal content
function deriveObjectionFromSignal(signal: Signal): string {
  const lower = signal.value.toLowerCase();

  // Use actual phrases from the signal to form objections
  if (/rbi.*penalty|penalty.*rbi|fine.*impose|regulatory.*action/i.test(lower)) {
    return "They seem compliant";
  }
  if (/fraud|scam|security.*breach|data.*leak/i.test(lower)) {
    return "They seem trustworthy";
  }
  if (/revenue.*drop|loss|declin|net.*loss|widen.*loss/i.test(lower)) {
    return "They seem financially stable";
  }
  if (/outage|service.*disrupt|downtime/i.test(lower)) {
    return "They seem reliable";
  }
  if (/pricing|fee|cost|expensive|overpriced|mdr/i.test(lower)) {
    return "They seem cheaper";
  }
  if (/support|service.*delay|unresponsive/i.test(lower)) {
    return "They have better support";
  }
  if (/integration|api|technical.*debt/i.test(lower)) {
    return "They're easier to integrate";
  }
  if (/onboard|slow.*start|weeks.*to.*launch/i.test(lower)) {
    return "They're faster to onboard";
  }

  // Default to "They seem..." based on signal type
  const signalType = classifySignalType(signal.value, signal.normalizedType);
  switch (signalType) {
    case "trust_risk": return "They seem trustworthy";
    case "financial_health": return "They seem financially stable";
    case "regulatory": return "They seem compliant";
    case "reliability": return "They seem reliable";
    case "strategy_drift": return "They seem focused";
    case "pricing_complaint": return "They seem cheaper";
    case "support_issue": return "They have better support";
    case "integration_issue": return "They're easier to integrate";
    case "onboarding_delay": return "They're faster to onboard";
    default: return "They seem like a good option";
  }
}

// Derive counter DIRECTLY from signal content - NO templates
function deriveCounterFromSignal(signal: Signal, competitor: string, citationIds: string[]): string {
  const citationRef = citationIds[0] ? ` [${citationIds[0]}]` : "";
  const signalValue = signal.value;

  // If no citation and no specific content, be honest
  if (!citationIds[0] && signalValue.length < 30) {
    return `Without validated customer evidence, cannot confirm specific risks — recommend direct research${citationRef}.`;
  }

  // Use ACTUAL signal content to create a specific counter
  // Extract key phrases from signal to make counter specific
  const lower = signalValue.toLowerCase();

  // Regulatory issues
  if (/rbi|regulatory|penalty|fine|compliance.*issue|ban|suspend/i.test(lower)) {
    // Extract specific regulatory issue
    if (/₹\s*\d+\s*(?:cr|crore)/i.test(signalValue)) {
      const amount = signalValue.match(/₹\s*\d+\s*(?:cr|crore)/i)?.[0];
      return `${competitor} faced RBI action (${amount}) — how does regulatory exposure affect your risk tolerance?${citationRef}`;
    }
    if (/crawl/i.test(lower)) {
      return `${competitor} is rebuilding payments trust after regulatory action — long-term stability uncertain${citationRef}`;
    }
    return `${competitor}'s regulatory history creates compliance risk your team inherits${citationRef}`;
  }

  // Financial issues
  if (/loss|revenue.*declin|widen.*loss|net.*loss/i.test(lower)) {
    // Extract specific financial phrase
    if (/loss.*₹|₹.*loss/i.test(signalValue)) {
      const lossMatch = signalValue.match(/loss.*₹[\d,]+|₹[\d,]+.*loss/i);
      if (lossMatch) {
        return `${lossMatch[0]} — does ${competitor}'s financial traction concern you?${citationRef}`;
      }
    }
    return `${competitor}'s financial performance signals uneven product traction${citationRef}`;
  }

  // Trust/fraud issues
  if (/fraud|scam|security.*breach|data.*leak/i.test(lower)) {
    return `${competitor}'s fraud incidents expose partners to liability${citationRef}`;
  }

  // Reliability issues
  if (/outage|service.*disrupt|downtime/i.test(lower)) {
    return `${competitor}'s service disruptions create settlement risk${citationRef}`;
  }

  // Pricing complaints
  if (/pricing|fee|cost|expensive|overpriced|mdr/i.test(lower)) {
    return `${competitor}'s pricing opacity creates hidden costs at scale${citationRef}`;
  }

  // Support complaints
  if (/support|service.*delay|unresponsive/i.test(lower)) {
    return `${competitor}'s support issues escalate for BFSI compliance needs${citationRef}`;
  }

  // Integration complaints
  if (/integration|api|difficult/i.test(lower)) {
    return `${competitor}'s integration complexity compounds with each bank partnership${citationRef}`;
  }

  // Onboarding complaints
  if (/onboard|slow.*start|weeks/i.test(lower)) {
    return `${competitor}'s BFSI onboarding timelines add weeks to your launch${citationRef}`;
  }

  // Generic fallback using actual signal
  if (signalValue.length > 20) {
    // Truncate signal for counter
    const snippet = signalValue.slice(0, 100);
    return `${snippet}...${citationRef}`;
  }

  return `Signal requires validation — recommend direct research${citationRef}`;
}

// Derive landmine DIRECTLY from signal content
function deriveLandmineFromSignal(signal: Signal): string | null {
  const signalValue = signal.value;
  const lower = signalValue.toLowerCase();

  // Use specific phrases from signal to create specific questions
  if (/rbi|regulatory|penalty/i.test(lower)) {
    if (/₹\s*\d+\s*(?:cr|crore)/i.test(signalValue)) {
      return `What happens to your operations if ${signalValue.match(/₹\s*\d+\s*(?:cr|crore)/i)?.[0]} RBI action happens again?`;
    }
    return `What's your contingency if RBI regulatory action impacts ${signalValue.match(/\w+/)?.[0]} operations?`;
  }

  if (/fraud|scam|security/i.test(lower)) {
    return `How do you handle settlement risk when fraud incidents hit ${signalValue.match(/\w+/)?.[0]} payment flows?`;
  }

  if (/loss|revenue.*declin|financial/i.test(lower)) {
    return `What happens to your margins if ${signalValue.match(/\w+/)?.[0]}'s financial decline continues?`;
  }

  if (/pricing|fee|mdr|overpriced/i.test(lower)) {
    return `How does your effective cost change when ${signalValue.match(/\w+/)?.[0]} MDR scales with volume?`;
  }

  if (/outage|service.*disrupt|downtime/i.test(lower)) {
    return `What SLA-backed recourse do you have when ${signalValue.match(/\w+/)?.[0]} has service disruptions?`;
  }

  // Generic fallback using signal content
  if (signalValue.length > 15) {
    return `What specific risks does ${signalValue.slice(0, 60)} create for your platform?`;
  }

  return null;
}

// Derive "why we win" DIRECTLY from signal content
function deriveWinFromSignal(signal: Signal, competitor: string): string | null {
  const signalValue = signal.value;
  const lower = signalValue.toLowerCase();

  // Use actual signal content to derive specific win reason
  if (/pricing|fee|mdr|overpriced|expensive/i.test(lower)) {
    return `${competitor}: ${signalValue.slice(0, 80)}. Blostem offers transparent infra pricing.`;
  }
  if (/support|service.*delay|unresponsive/i.test(lower)) {
    return `${competitor}: ${signalValue.slice(0, 80)}. Blostem provides BFSI-native support.`;
  }
  if (/integration|api|difficult/i.test(lower)) {
    return `${competitor}: ${signalValue.slice(0, 80)}. Blostem's single API handles multi-bank complexity.`;
  }
  if (/onboard|slow.*start/i.test(lower)) {
    return `${competitor}: ${signalValue.slice(0, 80)}. Blostem standardizes BFSI onboarding.`;
  }
  if (/outage|service.*disrupt|reliability/i.test(lower)) {
    return `${competitor}: ${signalValue.slice(0, 80)}. Blostem provides SLA-backed reliability.`;
  }
  if (/rbi|regulatory|compliance/i.test(lower)) {
    return `${competitor}: ${signalValue.slice(0, 80)}. Blostem handles compliance natively.`;
  }
  if (/fraud|scam|security/i.test(lower)) {
    return `${competitor}: ${signalValue.slice(0, 80)}. Blostem isolates you from fraud liability.`;
  }

  // If we can't derive a specific win, return null
  return null;
}

// Detect competitor type from tagline and signals
function detectCompetitorType(competitor: string, signals: Signal[], intelligence: ExtractedIntelligence): CompetitorType {
  const tagline = (intelligence.positioning?.tagline || "").toLowerCase();

  if (/wallet|mobile.*wallet|digital.*wallet|prepaid.*wallet/i.test(tagline)) return "wallet";
  if (/gateway|merchant.*payment|payment.*processor|checkout.*solution/i.test(tagline)) return "gateway";
  if (/nbfc|non.*banking.*financial/i.test(tagline)) return "NBFC";
  if (/infrastructure|infra|banking.*as.*a.*service|baas/i.test(tagline)) return "infra";

  const allText = signals.map(s => s.value).join(" ").toLowerCase();
  if (/wallet|digital.*wallet|mobile.*wallet|wallet.*balance|upi.*payment|qr.*code.*payment/i.test(allText)) return "wallet";
  if (/payment.*gateway|merchant.*checkout|payment.*processor/i.test(allText)) return "gateway";
  if (/nbfc|lending|loan.*product|credit.*product/i.test(allText)) return "NBFC";
  if (/infrastructure|infra.*layer|banking.*as.*service/i.test(allText)) return "infra";

  return "unknown";
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

  // NO FALLBACK: If no signals, return empty/no content (no generic templates)
  if (signals.length === 0) {
    console.log(`[DealPrimitives] No signals — returning minimal honest primitives`);
    return {
      company_overview: `${competitor} — insufficient validated signals.`,
      competitor_type: "unknown" as CompetitorType,
      category_contrast: `${competitor} requires direct research.`,
      quick_dismisses: [],
      objection_handling: [],
      why_we_win: [],
      why_we_lose: [],
      pricing_positioning: `No pricing data found.`,
      landmines: [],
      FUD_responses: [],
      proof_points: [],
      compete_aggressively_when: [],
      signal_trace: [],
    };
  }

  // Build signal trace
  const signal_trace = signals.slice(0, 5).map(signal => ({
    signal: signal.value.slice(0, 80),
    weapon: `Objection derived from signal`,
    type: classifySignalType(signal.value, signal.normalizedType)
  }));

  // OBJECTION HANDLING: Signal-indexed, no templates
  const objection_handling: DealPrimitives["objection_handling"] = [];
  const seenObjections = new Set<string>();

  // First objection: "We already use X" — derive from actual complaints if available
  const actualComplaints = signals.filter(s => isActualCustomerComplaint(s));
  if (actualComplaints.length > 0) {
    // Use first actual complaint's content to personalize
    const firstComplaint = actualComplaints[0];
    const objection = `We already use ${competitor}`;
    objection_handling.push({
      objection,
      counter: deriveCounterFromSignal(firstComplaint, competitor, firstComplaint.citationIds),
      evidence: firstComplaint.citationIds.slice(0, 2),
    });
    seenObjections.add(objection.toLowerCase());
  }

  // Add objections derived directly from each signal
  for (const signal of signals) {
    if (objection_handling.length >= 3) break;

    const objectionText = deriveObjectionFromSignal(signal);
    const normalizedObjection = objectionText.toLowerCase();

    // Skip duplicate objections
    if (seenObjections.has(normalizedObjection)) continue;
    seenObjections.add(normalizedObjection);

    // Only add if we can derive a meaningful counter from the signal
    const counter = deriveCounterFromSignal(signal, competitor, signal.citationIds);

    // Skip if counter is just "recommend direct research" (no actual content)
    if (counter.includes("recommend direct research") && !signal.citationIds.length) continue;

    objection_handling.push({
      objection: objectionText,
      counter,
      evidence: signal.citationIds.slice(0, 2),
    });
  }

  console.log(`[DealPrimitives] Generated ${objection_handling.length} objections from signals`);

  // QUICK DISMISSES: Only from actual customer complaints
  const quick_dismisses: string[] = [];
  for (const signal of actualComplaints.slice(0, 2)) {
    const signalType = classifySignalType(signal.value, signal.normalizedType);
    switch (signalType) {
      case "pricing_complaint":
        quick_dismisses.push(`${competitor}'s pricing issues create hidden costs at scale.`);
        break;
      case "support_issue":
        quick_dismisses.push(`${competitor}'s support issues cause delays when problems escalate.`);
        break;
      case "integration_issue":
        quick_dismisses.push(`${competitor}'s integration complexity adds maintenance overhead.`);
        break;
      case "onboarding_delay":
        quick_dismisses.push(`${competitor}'s onboarding timelines delay BFSI product launches.`);
        break;
      case "reliability_issue":
        quick_dismisses.push(`${competitor}'s reliability issues create operational risk.`);
        break;
    }
  }

  // WHY WE WIN: ONLY from actual customer complaints with specific content
  const why_we_win: string[] = [];
  const seenWinReasons = new Set<string>();

  for (const signal of actualComplaints) {
    const winReason = deriveWinFromSignal(signal, competitor);
    if (winReason && !seenWinReasons.has(winReason)) {
      seenWinReasons.add(winReason);
      why_we_win.push(winReason);
    }
  }

  // WHY WE LOSE: ONLY from actual positives in intelligence (competitor's strengths)
  const why_we_lose: string[] = [];
  const positives = intelligence.customer_truths?.positives || [];
  const differentiators = intelligence.positioning?.differentiators || [];

  // Only include if we have actual positive data from extraction
  if (positives.length > 0) {
    why_we_lose.push(`${competitor} strength: ${positives[0]}`);
  } else if (differentiators.length > 0) {
    why_we_lose.push(`${competitor} differentiator: ${differentiators[0]}`);
  }
  // Do NOT add generic "strong integration momentum" if no actual data

  // PRICING: ONLY from actual extracted pricing data
  let pricing_positioning = "";
  const extractedModel = intelligence.pricing_posture?.model || "";
  const extractedEntry = intelligence.pricing_posture?.entryPrice || "";
  const extractedOpacity = intelligence.pricing_posture?.opacity || "";

  // Only show pricing if we have actual extracted data (not "unknown")
  if (extractedModel && extractedModel !== "unknown" && !extractedModel.includes("opaque")) {
    pricing_positioning = `${competitor} uses ${extractedModel}`;
    if (extractedEntry && extractedEntry !== "opaque") {
      pricing_positioning += ` (entry: ${extractedEntry})`;
    }
    pricing_positioning += " — Blostem offers transparent infra-layer pricing.";
  } else {
    // No actual pricing data — be honest
    pricing_positioning = `No specific pricing data found for ${competitor}.`;
  }

  // LANDMINES: ONLY from actual signals with specific content
  const landmines: string[] = [];
  const seenLandmines = new Set<string>();

  for (const signal of signals) {
    const landmine = deriveLandmineFromSignal(signal);
    if (landmine && !seenLandmines.has(landmine)) {
      seenLandmines.add(landmine);
      landmines.push(landmine);
    }
  }

  // FUD RESPONSES: Only if trust risk signals exist
  const fudResponses: string[] = [];
  const hasTrustRisk = signals.some(s => classifySignalType(s.value, s.normalizedType) === "trust_risk");
  if (hasTrustRisk) {
    fudResponses.push(`Blostem separates you from fraud liability — wallet-layer incidents expose partners to liability that infra-layer solutions avoid.`);
  }
  // Add Blostem's proof points if they exist
  if (hasTrustRisk || signals.length > 0) {
    fudResponses.push(`Blostem is built by BFSI infrastructure veterans — Rainmatter backing provides capital + market credibility through Zerodha's ecosystem.`);
  }

  // PROOF POINTS: Only derived from intelligence if available, otherwise minimal
  const proof_points: string[] = [];
  if (positives.length > 0) {
    proof_points.push(`${competitor}: ${positives[0]}`);
  }
  // Always include Blostem proof point
  proof_points.push(`Blostem integrates with Zerodha for FD booking on Coin — proven at Indian fintech scale`);

  // COMPANY OVERVIEW: From tagline if available
  const tagline = intelligence.positioning?.tagline || "";
  const company_overview = tagline
    ? tagline.split(".").slice(0, 2).join(".").trim()
    : `${competitor} — direct research recommended for accurate positioning.`;

  // CATEGORY CONTRAST
  const layerDescriptions: Record<CompetitorType, string> = {
    wallet: "wallet/payment layer",
    gateway: "payment gateway / payment orchestration layer",
    infra: "integration layer",
    NBFC: "lending/NBFC layer",
    unknown: "BFSI solution",
  };
  const category_contrast = `${competitor} = ${layerDescriptions[compType]}; Blostem = BFSI infrastructure layer (FD/RD/banking products)`;

  // COMPETE AGGRESSIVELY WHEN: From signals
  const compete_aggressively_when: string[] = [];
  const signalTypes = signals.map(s => classifySignalType(s.value, s.normalizedType));

  if (signalTypes.includes("pricing_complaint")) {
    compete_aggressively_when.push("Prospect complains about pricing opacity or hidden MDR costs");
  }
  if (signalTypes.includes("support_issue")) {
    compete_aggressively_when.push("Prospect has experienced support delays or unresponsiveness");
  }
  if (signalTypes.includes("integration_issue")) {
    compete_aggressively_when.push("Prospect is struggling with multi-bank integration complexity");
  }
  if (signalTypes.includes("reliability_issue") || signalTypes.includes("trust_risk")) {
    compete_aggressively_when.push("Prospect is concerned about payment reliability or fraud risk");
  }

  const primitives: DealPrimitives = {
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

  console.log(`[DealPrimitives] Generated: ${objection_handling.length} objections, ${landmines.length} landmines`);

  return primitives;
}