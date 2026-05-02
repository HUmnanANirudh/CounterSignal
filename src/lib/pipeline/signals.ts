import type { Citation, PreprocessedData,Signal } from "@/types";

export function deriveSignals(
  preprocessed: PreprocessedData,
  citations: Citation[]
): { signals: Signal[]; sourceMap: Record<string, string[]> } {
  const signals: Signal[] = [];
  const sourceMap: Record<string, string[]> = {};

  let signalIndex = 0;

  for (const candidate of preprocessed.pricing_candidates.slice(0, 4)) {
    const id = `pricing_signal_${signalIndex++}`;
    const citedUrls = citations
      .filter((c) => preprocessed.raw_content.includes(c.title.slice(0, 20)))
      .map((c) => c.id);
    signals.push({ id, type: "pricing", value: candidate, citationIds: citedUrls.slice(0, 2) });
    sourceMap[id] = citedUrls.slice(0, 2);
  }

  for (const complaint of preprocessed.complaint_sentences.slice(0, 4)) {
    const id = `complaint_${signalIndex++}`;
    const citedUrls = citations
      .filter((c) => preprocessed.raw_content.includes(c.title.slice(0, 20)))
      .map((c) => c.id);
    signals.push({ id, type: "complaint", value: complaint, citationIds: citedUrls.slice(0, 2) });
    sourceMap[id] = citedUrls.slice(0, 2);
  }

  for (const date of preprocessed.dates.slice(0, 3)) {
    const id = `launch_${signalIndex++}`;
    signals.push({ id, type: "launch", value: date, citationIds: [] });
    sourceMap[id] = [];
  }

  for (const feature of preprocessed.feature_mentions.slice(0, 3)) {
    const id = `feature_${signalIndex++}`;
    signals.push({ id, type: "feature", value: feature, citationIds: [] });
    sourceMap[id] = [];
  }

  for (const positive of preprocessed.review_blocks.slice(0, 3)) {
    const id = `positive_${signalIndex++}`;
    signals.push({ id, type: "positive", value: positive, citationIds: [] });
    sourceMap[id] = [];
  }

  return { signals, sourceMap };
}

export function calculateConfidence(
  nCitations: number,
  signals: Signal[],
  citations: Citation[]
): { score: number; factors: string[] } {
  const factors: string[] = [];

  const sourceCountScore = Math.min(nCitations / 5, 1);
  factors.push(`${nCitations} sources found (${nCitations >= 5 ? "max" : "need " + (5 - nCitations) + " more" })`);

  const signalsWithCitations = signals.filter((s) => s.citationIds.length >= 2);
  const agreementScore = signals.length > 0 ? signalsWithCitations.length / signals.length : 0;
  factors.push(`${Math.round(agreementScore * 100)}% signals cross-referenced`);

  const recentCitations = citations.filter((c) => {
    if (!c.date) return false;
    const d = new Date(c.date);
    const now = new Date();
    const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
    return d > yearAgo;
  });
  const recencyScore = nCitations > 0 ? recentCitations.length / nCitations : 0;
  factors.push(`${Math.round(recencyScore * 100)}% sources are recent`);

  const score = 0.4 * sourceCountScore + 0.4 * agreementScore + 0.2 * recencyScore;
  return { score: Math.round(score * 100) / 100, factors };
}