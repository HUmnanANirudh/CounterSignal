import type { Citation, PreprocessedData, Signal } from "@/types";

const SIGNAL_NORMALIZATIONS: Record<string, string> = {
  "high fees": "pricing_complaint",
  "expensive": "pricing_complaint",
  "costly": "pricing_complaint",
  "overpriced": "pricing_complaint",
  "hidden fee": "pricing_complaint",
  "hidden cost": "pricing_complaint",
  "unpredictable pricing": "pricing_complaint",
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
};

export function normalizeSignal(text: string): string {
  const lower = text.toLowerCase();
  for (const [keyword, normalized] of Object.entries(SIGNAL_NORMALIZATIONS)) {
    if (lower.includes(keyword)) return normalized;
  }
  return "general";
}

export function deriveSignals(
  preprocessed: PreprocessedData,
  citations: Citation[]
): { signals: Signal[]; sourceMap: Record<string, string[]> } {
  const signals: Signal[] = [];
  const sourceMap: Record<string, string[]> = {};

  let signalIndex = 0;

  const citationIds = citations.map(c => c.id);

  for (const candidate of preprocessed.pricing_candidates.slice(0, 4)) {
    const id = `pricing_signal_${signalIndex++}`;
    const citedUrls = citations
      .filter((c) => preprocessed.raw_content.includes(c.title.slice(0, 20)))
      .map((c) => c.id);
    const normalizedType = normalizeSignal(candidate);
    signals.push({ id, type: "pricing", value: candidate, citationIds: citedUrls.slice(0, 2), normalizedType });
    sourceMap[id] = citedUrls.slice(0, 2);
  }

  for (const complaint of preprocessed.complaint_sentences.slice(0, 4)) {
    const id = `complaint_${signalIndex++}`;
    const citedUrls = citations
      .filter((c) => preprocessed.raw_content.includes(c.title.slice(0, 20)))
      .map((c) => c.id);
    const normalizedType = normalizeSignal(complaint);
    signals.push({ id, type: "complaint", value: complaint, citationIds: citedUrls.slice(0, 2), normalizedType });
    sourceMap[id] = citedUrls.slice(0, 2);
  }

  for (const date of preprocessed.dates.slice(0, 3)) {
    const id = `launch_${signalIndex++}`;
    signals.push({ id, type: "launch", value: date, citationIds: [], normalizedType: "launch" });
    sourceMap[id] = [];
  }

  for (const feature of preprocessed.feature_mentions.slice(0, 3)) {
    const id = `feature_${signalIndex++}`;
    signals.push({ id, type: "feature", value: feature, citationIds: [], normalizedType: "feature" });
    sourceMap[id] = [];
  }

  for (const positive of preprocessed.review_blocks.slice(0, 3)) {
    const id = `positive_${signalIndex++}`;
    signals.push({ id, type: "positive", value: positive, citationIds: [], normalizedType: "positive" });
    sourceMap[id] = [];
  }

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
  citations: Citation[]
): { score: number; factors: string[] } {
  const factors: string[] = [];

  const sourceCountScore = Math.min(nCitations / 5, 1);
  factors.push(`${nCitations} sources found (${nCitations >= 5 ? "max" : "need " + (5 - nCitations) + " more" })`);

  const normalizedTypes = signals.map(s => s.normalizedType).filter(Boolean);
  const uniqueNormalized = new Set(normalizedTypes);
  const agreementScore = normalizedTypes.length > 0 ? uniqueNormalized.size / normalizedTypes.length : 0;
  factors.push(`${Math.round(agreementScore * 100)}% signal diversity (${uniqueNormalized.size} types)`);

  const recentCitations = citations.filter((c) => {
    if (!c.date) return false;
    try {
      const d = new Date(c.date);
      const now = new Date();
      const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
      return d > yearAgo;
    } catch {
      return false;
    }
  });
  const recencyScore = nCitations > 0 ? recentCitations.length / nCitations : 0;
  factors.push(`${Math.round(recencyScore * 100)}% sources are recent`);

  const score = 0.4 * sourceCountScore + 0.4 * agreementScore + 0.2 * recencyScore;
  return { score: Math.round(score * 100) / 100, factors };
}