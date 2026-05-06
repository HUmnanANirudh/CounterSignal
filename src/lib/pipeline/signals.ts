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
    const isLowDataMode = citations.length <= 10;
    const hasWeakSingleSource = appearance.citationIds.length >= 1 && appearance.domains.size === 1;

    // Quality domains that can validate single-source signals
    const qualityDomains = ["inc42.com", "bloomberg.com", "g2.com", "capterra.com", "moneycontrol.com", "medianama.com"];
    const isFromQualityDomain = Array.from(appearance.domains).some(d =>
      qualityDomains.some(q => d.includes(q))
    );

    // Acceptance logic:
    // 1. High severity always accepted
    // 2. Cross-type validated always accepted
    // 3. Feature signals always accepted
    // 4. Single strong source (2+ citations, same domain) accepted
    // 5. Low data mode (<= 10 citations): accept single source from quality domains
    // 6. Low data mode: accept any single source signal if it has 1+ citations

    let accepted = false;

    if (hasCrossTypeAgreement || isFeature || isHighSeverity || hasSingleStrongSource) {
      accepted = true;
    } else if (isLowDataMode && hasWeakSingleSource) {
      if (isFromQualityDomain) {
        console.log(`[Signals] Low-data mode: accepting quality-domain signal: ${key.slice(0, 40)}...`);
        accepted = true;
      } else {
        // Low data mode: accept any signal with at least 1 citation from low-coverage entity
        console.log(`[Signals] Low-data mode: accepting single-source signal: ${key.slice(0, 40)}...`);
        accepted = true;
      }
    }

    if (!accepted) {
      console.log(`[Signals] Filtering: ${key.slice(0, 40)}... (types: ${uniqueTypes.join(",")}, citations: ${appearance.citationIds.length})`);
      continue;
    }

    if (isHighSeverity) {
      console.log(`[Signals] HIGH severity signal auto-validated: ${appearance.normalizedType} - ${key.slice(0, 40)}...`);
    } else if (hasSingleStrongSource) {
      console.log(`[Signals] Single strong source signal accepted: ${key.slice(0, 40)}... (${appearance.citationIds.length} citations)`);
    } else if (isLowDataMode) {
      console.log(`[Signals] Low-data mode signal accepted: ${key.slice(0, 40)}...`);
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

  console.log(`[Signals] Derived ${signals.length} validated signals`);

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
  entityConfidence: number,
  classificationConfidence: number,
  extractionQuality: number,
  signals: Signal[],
  citations: Citation[],
): { score: number; factors: string[] } {
  const factors: string[] = [];

  factors.push(`Entity Certainty (${Math.round(entityConfidence * 100)}%)`);
  factors.push(`Category Certainty (${Math.round(classificationConfidence * 100)}%)`);
  factors.push(`Extraction Quality (${Math.round(extractionQuality * 100)}%)`);

  // Signal Quality
  const uniqueDomains = new Set(citations.map(c => getSourceDomain(c.url))).size;
  const domainDiversityScore = Math.min(uniqueDomains / 3, 1);
  const signalStrengthScore = Math.min(signals.length / 5, 1);
  
  const highSeverityCount = signals.filter(s =>
    ["trust_risk", "financial_health", "regulatory"].includes(s.normalizedType || "")
  ).length;
  const severityBonus = highSeverityCount > 0 ? 0.1 * Math.min(highSeverityCount / 3, 1) : 0;
  
  const signalQuality = Math.min(1, (domainDiversityScore * 0.4 + signalStrengthScore * 0.6) + severityBonus);
  factors.push(`Signal Quality (${Math.round(signalQuality * 100)}%)`);

  // New Model: confidence = entityConfidence * 0.3 + classificationConfidence * 0.3 + extractionQuality * 0.2 + signalQuality * 0.2
  const score = (
    entityConfidence * 0.30 +
    classificationConfidence * 0.30 +
    extractionQuality * 0.20 +
    signalQuality * 0.20
  );

  const finalScore = Math.max(0.1, Math.min(0.98, score));

  console.log(`[Confidence] Score: ${Math.round(finalScore * 100)}% (${factors.join(", ")})`);

  return { score: Math.round(finalScore * 100) / 100, factors };
}
