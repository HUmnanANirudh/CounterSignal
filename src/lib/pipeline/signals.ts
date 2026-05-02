import type { Citation, PreprocessedData, Signal } from "@/types";

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

// Domain type classification for cross-type validation
const DOMAIN_TYPE_MAP: Record<string, "independent" | "review" | "news" | "forum"> = {
  // Independent BFSI fintech media (highest trust)
  "inc42.com": "independent",
  "medianama.com": "independent",
  "entrackr.com": "independent",
  "dealstreet.in": "independent",
  "vccircle.com": "independent",
  // Reviews
  "g2.com": "review",
  "capterra.com": "review",
  "trustpilot.com": "review",
  // Forums
  "reddit.com": "forum",
  "twitter.com": "forum",
  "x.com": "forum",
  // News (general business/financial)
  "moneycontrol.com": "news",
  "economictimes.indiatimes.com": "news",
  "forbes.com": "news",
  "forbesindia.in": "news",
  "bloomberg.com": "news",
  "techcrunch.com": "news",
  "livemint.com": "news",
};

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
  const normalized = normalizeDomain(url);
  return DOMAIN_TYPE_MAP[normalized] || "news";
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
  const signalAppearances: Record<string, {
    normalizedType: string; text: string; citationIds: string[]; domains: Set<string>; domainTypes: Set<string>
  }> = {};

  let signalIndex = 0;

  const addSignalAppearance = (
    normalizedType: string,
    text: string,
    citation: Citation
  ) => {
    const key = `${normalizedType}:${text.slice(0, 50).toLowerCase()}`;

    if (!signalAppearances[key]) {
      signalAppearances[key] = { normalizedType, text, citationIds: [], domains: new Set(), domainTypes: new Set() };
    }

    const domain = getSourceDomain(citation.url);
    const domainType = getDomainType(citation.url);
    signalAppearances[key].citationIds.push(citation.id);
    signalAppearances[key].domains.add(domain);
    signalAppearances[key].domainTypes.add(domainType);
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

  for (const [key, appearance] of Object.entries(signalAppearances)) {
    const domainTypes = Array.from(appearance.domainTypes);
    const uniqueTypes = domainTypes.filter((t, i) => domainTypes.indexOf(t) === i);

    // Require ≥2 independent domain types for validation (not just domains)
    const hasCrossTypeAgreement = uniqueTypes.length >= 2;
    const isFeature = appearance.normalizedType === "feature";

    if (!hasCrossTypeAgreement && !isFeature) {
      console.log(`[Signals] Filtering: ${key.slice(0, 40)}... (types: ${uniqueTypes.join(",")}, need ≥2)`);
      continue;
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

  const recencyScore = 0.5;

  const baseScore = 0.35 * sourceCountScore + 0.25 * domainDiversityScore + 0.2 * signalDiversityScore + 0.1 * recencyScore + 0.1 * (uniqueDomainTypes >= 2 ? 1 : 0);
  const score = Math.max(0.1, Math.min(0.95, baseScore - domainPenalty));

  console.log(`[Confidence] Score: ${Math.round(score * 100)}% (${factors.join(", ")})`);

  return { score: Math.round(score * 100) / 100, factors };
}
