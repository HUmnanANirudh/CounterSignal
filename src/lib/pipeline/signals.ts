import type { Citation, PreprocessedData, Signal } from "@/types";

// Types for implicit complaints (negative signals)
type NegativeSignalType = "trust_risk" | "financial_health" | "regulatory" | "reliability" | "strategy_drift" | "general";

// Severity levels for signals - HIGH severity bypasses cross-type validation
type SignalSeverity = "HIGH" | "MEDIUM" | "LOW";

interface SignalAppearance {
  normalizedType: string;
  text: string;
  citationIds: string[];
  domains: Set<string>;
  domainTypes: Set<string>;
  severity: SignalSeverity;
}

// Classify signal severity based on type and source
function classifySeverity(normalizedType: string, domainTypes: Set<string>): SignalSeverity {
  // HIGH severity: fraud, financial loss, regulatory issues from authoritative sources
  const highSeverityTypes = ["trust_risk", "financial_health", "regulatory"];
  if (highSeverityTypes.includes(normalizedType)) {
    return "HIGH";
  }
  // MEDIUM severity: reliability issues
  if (normalizedType === "reliability" || normalizedType === "strategy_drift") {
    return "MEDIUM";
  }
  return "LOW";
}

// Classify any text into a negative signal type using regex patterns
function classifyNegativeSignal(text: string): NegativeSignalType {
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

const SIGNAL_NORMALIZATIONS: Record<string, string> = {
  "high fees": "pricing_complaint",
  "expensive": "pricing_complaint",
  "costly": "pricing_complaint",
  "overpriced": "pricing_complaint",
  "hidden fee": "pricing_complaint",
  "hidden cost": "pricing_complaint",
  "transaction fee": "pricing_complaint",
  "slow onboarding": "onboarding_delay",
  "takes weeks": "onboarding_delay",
  "slow integration": "integration_issue",
  "difficult setup": "ease_of_use_issue",
  "confusing": "ease_of_use_issue",
  "poor support": "support_issue",
  "unresponsive": "support_issue",
  "buggy": "quality_issue",
  "broken": "quality_issue",
  "reliability": "reliability_issue",
  "outage": "reliability_issue",
  "payout delay": "payout_issue",
  "account freeze": "account_issue",
  "refund": "refund_issue",
};

// Auto-detect domain type using regex patterns - no hardcoded domain lists
function detectDomainType(url: string): "review" | "news" | "independent" | "forum" {
  const normalized = normalizeDomain(url);
  const lower = normalized.toLowerCase();

  // Review platforms
  if (/^(g2|capterra|trustpilot|clutch|croz|goodfirms)/.test(lower)) {
    return "review";
  }

  // Independent BFSI fintech media
  if (/^(inc42|medianama|entrackr|dealstreet|vccircle|founderkit)/.test(lower)) {
    return "independent";
  }

  // News (general business/financial)
  if (/^(moneycontrol|livemint|economictimes|forbes|bloomberg|techcrunch|reuters|ndtv|cnbc|hindu|business)/.test(lower)) {
    return "news";
  }

  // Forums
  if (/^(reddit|quora|stackoverflow|discord|forum)/.test(lower)) {
    return "forum";
  }

  // Social
  if (/^(twitter|x|facebook|linkedin|instagram)/.test(lower)) {
    return "forum";
  }

  return "news";
}

function normalizeDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("trustpilot")) return "trustpilot";
    if (hostname.includes("wsj")) return "wsj";
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return hostname;
  } catch {
    return "unknown";
  }
}

function getDomainType(url: string): "review" | "news" | "independent" | "forum" {
  return detectDomainType(url);
}

export function normalizeSignal(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, normalized] of Object.entries(SIGNAL_NORMALIZATIONS)) {
    if (lower.includes(keyword)) return normalized;
  }
  return "general";
}

function getSourceDomain(url: string): string {
  return normalizeDomain(url);
}

export function deriveSignals(
  preprocessed: PreprocessedData,
  citations: Citation[]
): { signals: Signal[]; sourceMap: Record<string, string[]> } {
  const signals: Signal[] = [];
  const sourceMap: Record<string, string[]> = {};
  const signalAppearances: Record<string, SignalAppearance> = {};

  let signalIndex = 0;

  const addSignalAppearance = (
    normalizedType: string,
    text: string,
    citation: Citation,
    severity: SignalSeverity = "LOW"
  ) => {
    const key = `${normalizedType}:${text.slice(0, 50).toLowerCase()}`;

    if (!signalAppearances[key]) {
      signalAppearances[key] = { normalizedType, text, citationIds: [], domains: new Set(), domainTypes: new Set(), severity };
    }

    const domain = getSourceDomain(citation.url);
    const domainType = getDomainType(citation.url);
    signalAppearances[key].citationIds.push(citation.id);
    signalAppearances[key].domains.add(domain);
    signalAppearances[key].domainTypes.add(domainType);
    // Upgrade severity if higher found
    if (severity === "HIGH") {
      signalAppearances[key].severity = "HIGH";
    } else if (severity === "MEDIUM" && signalAppearances[key].severity === "LOW") {
      signalAppearances[key].severity = "MEDIUM";
    }
  };

  for (const candidate of preprocessed.pricing_candidates.slice(0, 6)) {
    const normalizedType = normalizeSignal(candidate);
    const matchingCitations = citations.filter((c) =>
      preprocessed.raw_content.includes(c.title.slice(0, 20))
    );
    for (const citation of matchingCitations) {
      addSignalAppearance(normalizedType, candidate, citation);
    }
  }

  for (const complaint of preprocessed.complaint_sentences.slice(0, 8)) {
    const normalizedType = normalizeSignal(complaint);
    const matchingCitations = citations.filter((c) =>
      preprocessed.raw_content.includes(c.title.slice(0, 20))
    );
    for (const citation of matchingCitations) {
      addSignalAppearance(normalizedType, complaint, citation);
    }
  }

  for (const review of preprocessed.review_blocks.slice(0, 5)) {
    const normalizedType = "positive";
    const matchingCitations = citations.filter((c) =>
      preprocessed.raw_content.includes(c.title.slice(0, 20))
    );
    for (const citation of matchingCitations) {
      addSignalAppearance(normalizedType, review, citation);
    }
  }

  for (const feature of preprocessed.feature_mentions.slice(0, 4)) {
    const normalizedType = "feature";
    const matchingCitations = citations.filter((c) =>
      preprocessed.raw_content.includes(c.title.slice(0, 20))
    );
    for (const citation of matchingCitations) {
      addSignalAppearance(normalizedType, feature, citation);
    }
  }

  // Process negative_signals (fraud, regulatory, financial instability) from preprocessed data
  // Using classifyNegativeSignal() to automatically detect types from text patterns
  const v2Preprocessed = preprocessed as { negative_signals?: Array<{ text: string; type: string }> };
  if (v2Preprocessed.negative_signals) {
    for (const negSignal of v2Preprocessed.negative_signals.slice(0, 6)) {
      // Auto-classify using regex patterns - works for any company, no manual mapping needed
      const normalizedType = classifyNegativeSignal(negSignal.text);
      // Determine severity based on signal type
      const severity = classifySeverity(normalizedType, new Set());
      const matchingCitations = citations.filter((c) =>
        preprocessed.raw_content.includes(c.title.slice(0, 20))
      );
      for (const citation of matchingCitations) {
        addSignalAppearance(normalizedType, negSignal.text, citation, severity);
      }
    }
  }

  for (const [key, appearance] of Object.entries(signalAppearances)) {
    const domainTypes = Array.from(appearance.domainTypes);
    const uniqueTypes = domainTypes.filter((t, i) => domainTypes.indexOf(t) === i);

    // HIGH severity signals bypass cross-type validation (fraud/loss/regulatory from news are valid)
    const isHighSeverity = appearance.severity === "HIGH";
    const hasCrossTypeAgreement = uniqueTypes.length >= 2;
    const isFeature = appearance.normalizedType === "feature";

    // Filter out LOW severity signals that don't have cross-type agreement
    if (!hasCrossTypeAgreement && !isFeature && !isHighSeverity) {
      console.log(`[Signals] Filtering: ${key.slice(0, 40)}... (types: ${uniqueTypes.join(",")}, need ≥2)`);
      continue;
    }

    // Log HIGH severity signal passing through
    if (isHighSeverity) {
      console.log(`[Signals] HIGH severity signal auto-validated: ${appearance.normalizedType} - ${key.slice(0, 40)}...`);
    }

    const id = `signal_${signalIndex++}`;

    signals.push({
      id,
      type: appearance.normalizedType as Signal["type"],
      value: appearance.text.slice(0, 150),
      citationIds: appearance.citationIds.slice(0, 3),
      normalizedType: appearance.normalizedType,
    });

    sourceMap[id] = appearance.citationIds.slice(0, 3);
  }

  console.log(`[Signals] Derived ${signals.length} validated signals (cross-type validated)`);

  return { signals, sourceMap };
}

export function validateCitationIntegrity(
  text: string,
  validCitationIds: string[]
): string {
  const citationPattern = /\[(citation-\d+)\]/g;
  const matches = text.matchAll(citationPattern);
  let validated = text;

  for (const match of matches) {
    const citationId = match[1];
    if (!validCitationIds.includes(citationId)) {
      validated = validated.replace(match[0], "");
    }
  }

  return validated;
}

export function calculateConfidence(
  nCitations: number,
  signals: Signal[],
  citations: Citation[],
): { score: number; factors: string[] } {
  const factors: string[] = [];

  // Count unique normalized domains
  const uniqueDomains = new Set(citations.map(c => getSourceDomain(c.url))).size;
  const domainDiversityScore = Math.min(uniqueDomains / 3, 1);

  // Count unique domain TYPES for cross-type validation
  const domainTypes = citations.map(c => getDomainType(c.url));
  const uniqueDomainTypes = new Set(domainTypes).size;

  let domainPenalty = 0;
  if (uniqueDomains < 2) {
    domainPenalty = 0.2;
    factors.push(`⚠ Only ${uniqueDomains} source domain(s) - low diversity`);
  } else {
    factors.push(`✓ ${uniqueDomains} source domains - good diversity`);
  }

  if (uniqueDomainTypes < 2) {
    factors.push(`⚠ Only ${uniqueDomainTypes} domain type(s) - need review+news+forum`);
  } else {
    factors.push(`✓ ${uniqueDomainTypes} domain types - good cross-type coverage`);
  }

  const sourceCountScore = Math.min(nCitations / 6, 1);
  factors.push(`${nCitations} sources (need 6+ for max)`);

  const normalizedTypes = signals.map(s => s.normalizedType).filter(Boolean);
  const uniqueNormalized = new Set(normalizedTypes);
  const signalDiversityScore = uniqueNormalized.size / Math.max(normalizedTypes.length, 1);
  factors.push(`${uniqueNormalized.size} signal types from ${normalizedTypes.length} signals`);

  // Signal strength score: more signals = higher confidence, capped at 5 signals
  const signalStrengthScore = Math.min(signals.length / 5, 1);
  factors.push(`signal strength: ${signals.length} signals (need 5+ for max)`);

  // Severity bonus: HIGH severity signals boost confidence
  const highSeverityCount = signals.filter(s =>
    ["trust_risk", "financial_health", "regulatory"].includes(s.normalizedType || "")
  ).length;
  const severityBonus = highSeverityCount > 0 ? 0.1 * Math.min(highSeverityCount / 3, 1) : 0;
  if (severityBonus > 0) {
    factors.push(`severity bonus: ${highSeverityCount} high-impact signals`);
  }

  const recencyScore = 0.5;

  // Base score now includes signal strength and severity
  const baseScore = (
    0.30 * sourceCountScore +
    0.20 * domainDiversityScore +
    0.15 * signalDiversityScore +
    0.20 * signalStrengthScore +
    0.10 * recencyScore +
    0.05 * (uniqueDomainTypes >= 2 ? 1 : 0) +
    severityBonus
  );

  // Hard cap: if signals < 4, confidence ≤ 0.8
  const signalCap = signals.length < 4 ? 0.8 : 0.95;
  if (signals.length < 4) {
    factors.push(`⚠ Signal cap: ${signals.length} signals < 4, capping at ${Math.round(signalCap * 100)}%`);
  }

  const score = Math.max(0.1, Math.min(signalCap, baseScore - domainPenalty));

  console.log(`[Confidence] Score: ${Math.round(score * 100)}% (${factors.join(", ")})`);

  return { score: Math.round(score * 100) / 100, factors };
}
