import type { Citation, PreprocessedData, Signal, Confidence } from "@/types";
import type { SignalSeverity, SignalAppearance } from "@/types/signals";
import {
  normalizeDomain,
  getDomainType,
  getSourceWeight,
} from "./utils/domain";
import {
  normalizeSignal,
  classifyNegativeSignal,
  classifySeverity,
} from "./utils/signal-classify";


export function resolveContradictions(signals: Signal[]): Signal[] {
  if (signals.length <= 1) return signals;

  const resolved: Signal[] = [];
  const typeGroups: Record<string, Signal[]> = {};

  // Group by type to find potential contradictions
  for (const s of signals) {
    const type = s.normalizedType || "general";
    if (!typeGroups[type]) typeGroups[type] = [];
    typeGroups[type].push(s);
  }

  for (const [type, group] of Object.entries(typeGroups)) {
    if (group.length <= 1) {
      resolved.push(...group);
      continue;
    }

    // Heuristic: If we have multiple signals of the same type, check if they contradict
    // e.g., "Easy integration" vs "Complex integration"
    const positives = group.filter(s => /\b(easy|simple|fast|seamless)\b/i.test(s.value));
    const negatives = group.filter(s => /\b(complex|difficult|slow|broken|issue|problem)\b/i.test(s.value));

    if (positives.length > 0 && negatives.length > 0) {
      // Contradiction detected!
      // Arbitration: Weighted authority + volume
      const posWeight = positives.reduce((acc, s) => acc + (s.authorityScore || 0.5), 0);
      const negWeight = negatives.reduce((acc, s) => acc + (s.authorityScore || 0.5), 0);

      if (negWeight >= posWeight) {
        // Favor the negative/risk signal for AE battlecards (Safety first)
        const bestNeg = negatives.sort((a, b) => (b.authorityScore || 0) - (a.authorityScore || 0))[0];
        bestNeg.summary = `${bestNeg.value.slice(0, 50)} (Note: some sources claim ease of use, but experts cite complexity)`;
        resolved.push(bestNeg);
      } else {
        const bestPos = positives.sort((a, b) => (b.authorityScore || 0) - (a.authorityScore || 0))[0];
        resolved.push(bestPos);
      }
    } else {
      resolved.push(...group);
    }
  }

  return resolved;
}

function isMaterialSignal(text: string): boolean {
  const lower = text.toLowerCase();
  
  // Rule: Reject generic fluff
  if (/major\s*player|leading\s*platform|comprehensive\s*solution|fast\s*growing/i.test(lower) && lower.length < 60) {
    return false;
  }

  const containsStrategicImplication = /\b(valuation|funding|pivot|exit|acquisition|market\s*share|displace|revenue|growth\s*focus|merger)\b/i.test(lower);
  const containsOperationalRisk = /\b(fraud|outage|delay|failed|compliance|rbi|security|penalty|violation|reliability|risk|custody|license)\b/i.test(lower);
  const containsBuyerImpact = /\b(fee|cost|support|activation|wait|complex|pricing|mdr|markup|transparent|opaque)\b/i.test(lower);
  
  return containsStrategicImplication || containsOperationalRisk || containsBuyerImpact;
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

    const domain = normalizeDomain(citation.url);
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
    if (!isMaterialSignal(candidate)) continue;
    const normalizedType = normalizeSignal(candidate);
    const matchingCitations = citations.filter((c) =>
      preprocessed.raw_content.includes(c.title.slice(0, 20))
    );
    for (const citation of matchingCitations) {
      addSignalAppearance(normalizedType, candidate, citation);
    }
  }

  for (const complaint of preprocessed.complaint_sentences.slice(0, 8)) {
    if (!isMaterialSignal(complaint)) continue;
    const normalizedType = normalizeSignal(complaint);
    const matchingCitations = citations.filter((c) =>
      preprocessed.raw_content.includes(c.title.slice(0, 20))
    );
    for (const citation of matchingCitations) {
      addSignalAppearance(normalizedType, complaint, citation);
    }
  }

  for (const review of preprocessed.review_blocks.slice(0, 5)) {
    if (!isMaterialSignal(review)) continue;
    const normalizedType = "positive";
    const matchingCitations = citations.filter((c) =>
      preprocessed.raw_content.includes(c.title.slice(0, 20))
    );
    for (const citation of matchingCitations) {
      addSignalAppearance(normalizedType, review, citation);
    }
  }

  for (const feature of preprocessed.feature_mentions.slice(0, 4)) {
    if (!isMaterialSignal(feature)) continue;
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
      if (!isMaterialSignal(negSignal.text)) continue;
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
    const citationIds = appearance.citationIds.slice(0, 3);
    const domainWeights = citationIds.map(cid => {
      const cit = citations.find(c => c.id === cid);
      return cit ? getSourceWeight(cit.url) : 0.5;
    });
    const avgAuthority = domainWeights.reduce((acc, w) => acc + w, 0) / domainWeights.length;

    signals.push({
      id,
      type: appearance.normalizedType as Signal["type"],
      value: appearance.text.slice(0, 150),
      citationIds: appearance.citationIds.slice(0, 3),
      normalizedType: appearance.normalizedType,
      authorityScore: avgAuthority,
      corroborationCount: appearance.domains.size,
    });

    sourceMap[id] = appearance.citationIds.slice(0, 3);
  }

  const resolvedSignals = resolveContradictions(signals);
  console.log(`[Signals] Derived ${signals.length} validated signals, resolved to ${resolvedSignals.length}`);

  return { signals: resolvedSignals, sourceMap };
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
  dataGaps: string[] = []
): Confidence {
  const factors: string[] = [];

  // 1. ENTITY SCORE (Identity & Category)
  const entityScore = (entityConfidence * 0.6 + classificationConfidence * 0.4);
  factors.push(`Entity Certainty (${Math.round(entityScore * 100)}%)`);

  // 2. EVIDENCE SCORE (Source quality & diversity)
  const uniqueDomains = new Set(citations.map(c => normalizeDomain(c.url))).size;
  const domainDiversityScore = Math.min(uniqueDomains / 5, 1);
  const avgSignalAuthority = signals.length > 0 
    ? signals.reduce((acc, s) => acc + (s.authorityScore || 0.5), 0) / signals.length 
    : 0.3;
  const evidenceScore = (domainDiversityScore * 0.5 + avgSignalAuthority * 0.5);
  factors.push(`Source Reliability (${Math.round(evidenceScore * 100)}%)`);

  // 3. CAPABILITY SCORE (Feature/overlap accuracy)
  // Refined Formula: capability_accuracy = evidence_coverage × capability_specificity × direct_source_support
  const evidence_coverage = Math.min(signals.length / 10, 1);
  const capability_specificity = extractionQuality;
  const direct_source_support = Math.min(uniqueDomains / 5, 1);
  
  const capabilityScore = Math.max(0.05, (evidence_coverage * 0.4 * capability_specificity + direct_source_support * 0.3));
  factors.push(`Capability Accuracy (${Math.round(capabilityScore * 100)}%)`);

  // 4. STRATEGIC SCORE (GTM reasoning/implication accuracy)
  // Higher when extraction is high quality and we have diverse evidence
  const strategicScore = (extractionQuality * 0.4 + evidenceScore * 0.4 + capabilityScore * 0.2);
  factors.push(`Strategic Depth (${Math.round(strategicScore * 100)}%)`);

  // 5. MARKET SCORE (Category/macro understanding)
  const marketScore = (classificationConfidence * 0.8 + domainDiversityScore * 0.2);
  factors.push(`Market Context (${Math.round(marketScore * 100)}%)`);

  // Overall Score Calculation (Weighted)
  let overallScore = (
    entityScore * 0.3 +
    capabilityScore * 0.2 +
    strategicScore * 0.2 +
    marketScore * 0.15 +
    evidenceScore * 0.15
  );

  // Penalties
  if (signals.length < 5) overallScore *= 0.8;
  if (uniqueDomains < 3) overallScore *= 0.9;
  if (dataGaps.length > 2) overallScore *= 0.85;

  console.log(`[Confidence] Multi-factor: E:${Math.round(entityScore * 100)}%, S:${Math.round(strategicScore * 100)}%, C:${Math.round(capabilityScore * 100)}%`);

  return { 
    entityScore: Math.round(entityScore * 100) / 100,
    capabilityScore: Math.round(capabilityScore * 100) / 100,
    strategicScore: Math.round(strategicScore * 100) / 100,
    marketScore: Math.round(marketScore * 100) / 100,
    evidenceScore: Math.round(evidenceScore * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    factors 
  };
}
