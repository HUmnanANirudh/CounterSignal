import type { Citation, PreprocessedData, Signal } from "@/types";
import type { SignalSeverity, SignalAppearance } from "@/types/signals";
import {
  normalizeDomain,
  getDomainType,
} from "./utils/domain";
import {
  normalizeSignal,
  classifyNegativeSignal,
  classifySeverity,
} from "./utils/signal-classify";

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

  if (preprocessed.negative_signals) {
    for (const negSignal of preprocessed.negative_signals.slice(0, 6)) {
      const normalizedType = classifyNegativeSignal(negSignal.text);
      const severity = classifySeverity(normalizedType);
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

    const isHighSeverity = appearance.severity === "HIGH";
    const hasCrossTypeAgreement = uniqueTypes.length >= 2;
    const isFeature = appearance.normalizedType === "feature";
    const hasSingleStrongSource = appearance.citationIds.length >= 2 && appearance.domains.size === 1;
    const isStartupMode = citations.length <= 4;
    const hasWeakSingleSource = appearance.citationIds.length >= 1 && appearance.domains.size === 1;

    if (!hasCrossTypeAgreement && !isFeature && !isHighSeverity && !hasSingleStrongSource) {
      if (isStartupMode && hasWeakSingleSource) {
        console.log(`[Signals] Startup mode: accepting single-source signal: ${key.slice(0, 40)}...`);
      } else {
        console.log(`[Signals] Filtering: ${key.slice(0, 40)}... (types: ${uniqueTypes.join(",")}, need ≥2 or strong single source)`);
        continue;
      }
    }

    if (isHighSeverity) {
      console.log(`[Signals] HIGH severity signal auto-validated: ${appearance.normalizedType} - ${key.slice(0, 40)}...`);
    } else if (hasSingleStrongSource) {
      console.log(`[Signals] Single strong source signal accepted: ${key.slice(0, 40)}... (${appearance.citationIds.length} citations)`);
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

  const uniqueDomains = new Set(citations.map(c => getSourceDomain(c.url))).size;
  const domainDiversityScore = Math.min(uniqueDomains / 3, 1);

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

  const signalStrengthScore = Math.min(signals.length / 5, 1);
  factors.push(`signal strength: ${signals.length} signals (need 5+ for max)`);

  const highSeverityCount = signals.filter(s =>
    ["trust_risk", "financial_health", "regulatory"].includes(s.normalizedType || "")
  ).length;
  const severityBonus = highSeverityCount > 0 ? 0.1 * Math.min(highSeverityCount / 3, 1) : 0;
  if (severityBonus > 0) {
    factors.push(`severity bonus: ${highSeverityCount} high-impact signals`);
  }

  const recencyScore = 0.5;

  const baseScore = (
    0.30 * sourceCountScore +
    0.20 * domainDiversityScore +
    0.15 * signalDiversityScore +
    0.20 * signalStrengthScore +
    0.10 * recencyScore +
    0.05 * (uniqueDomainTypes >= 2 ? 1 : 0) +
    severityBonus
  );

  const weakSignals = signals.filter(s =>
    ["trust_risk", "financial_health", "regulatory", "reliability"].includes(s.normalizedType || "")
  ).length;
  let signalCap = 0.95;
  if (weakSignals <= 4) {
    signalCap = 0.90;
    factors.push(`⚠ Signal cap: ${weakSignals} weak signals, capping at 90%`);
  }

  const score = Math.max(0.1, Math.min(signalCap, baseScore - domainPenalty));

  console.log(`[Confidence] Score: ${Math.round(score * 100)}% (${factors.join(", ")})`);

  return { score: Math.round(score * 100) / 100, factors };
}
