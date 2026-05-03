import type { PreprocessedData } from "@/types";

const MAX_TOKENS = 6000;
const PRICING_PATTERNS = [
  /\$[\d,]+(?:\/month|\/mo|\/year|\/transaction|\/user)?/gi,
  /[\d,]+(?:\/month|\/mo|\/year|\/transaction|\/user)/gi,
  /(?:pricing|price|fee|cost)\s+(?:starts|from|at)?\s*\$/gi,
  /(?:plan|tier|package)\s*(?:start|from)?\s*\$/gi,
  /free tier|free plan|entry[- ]level|starting at/i,
];

// Auto-detect complaints using regex patterns - works for any company
const COMPLAINT_PATTERNS = [
  /complaint|frustrated|disappointed/i,
  /hidden\s*fee|unpredictable|surprise.*charge/i,
  /expensive|overpriced|costly/i,
  /slow\s*(onboard|integration|support)|takes\s*(week|month)/i,
  /reliability|outage|downtime|service.*disrupt/i,
  /difficult|confusing|complex/i,
  /poor\s*(support|service)|unresponsive|no.*help/i,
  /buggy|broken|glitch|issue|problem/i,
];

// Auto-detect implicit complaints (high-impact negative signals)
const IMPLICIT_COMPLAINT_PATTERNS = [
  // Fraud/security
  /fraud|scam|₹\s*\d+\s*(?:cr|crore)|money.*launder|security.*breach|sanction.*popup/i,
  // Regulatory
  /rbi|regulatory|ban|suspended|compliance.*issue|penalty|fine.*impose/i,
  // Financial instability
  /loss|declin|revenue.*drop|widen.*loss|net.*loss|operating.*loss|default/i,
  // Outages/failures
  /outage|service.*disrupt|downtime|system.*fail|breach|data.*leak/i,
  // Risk/concern
  /risk|concern|flag|investigation|enforcement.*action/i,
];

// Types for negative signals
export type NegativeSignalType = "trust_risk" | "financial_health" | "regulatory" | "reliability" | "strategy_drift";

function classifyNegativeSignal(text: string): NegativeSignalType | null {
  const lower = text.toLowerCase();

  if (/fraud|scam|₹\s*\d+\s*(?:cr|crore)|money.*launder|security.*breach/i.test(lower)) {
    return "trust_risk";
  }
  if (/rbi|regulatory|ban|suspended|compliance.*issue|penalty/i.test(lower)) {
    return "regulatory";
  }
  if (/loss|declin|revenue.*drop|widen.*loss|net.*loss|operating.*loss|default/i.test(lower)) {
    return "financial_health";
  }
  if (/outage|service.*disrupt|downtime|system.*fail|breach|data.*leak/i.test(lower)) {
    return "reliability";
  }
  if (/pivot|strategy|reorgani|restructur|shut.*down|close.*operation/i.test(lower)) {
    return "strategy_drift";
  }

  return null;
}

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

function truncateToTokens(text: string, maxTokens: number): string {
  const avgCharsPerToken = 4;
  const maxChars = maxTokens * avgCharsPerToken;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

export interface PreprocessedDataV2 extends PreprocessedData {
  negative_signals: Array<{
    text: string;
    type: NegativeSignalType;
  }>;
}

export function preprocess(rawContent: string): PreprocessedDataV2 {
  const sentences = rawContent.split(/[.!?\n]+/).filter(Boolean);

  const pricing_candidates: string[] = [];
  const review_blocks: string[] = [];
  const complaint_sentences: string[] = [];
  const feature_mentions: string[] = [];
  const dates: string[] = [];
  const negative_signals: Array<{ text: string; type: NegativeSignalType }> = [];

  for (const sentence of sentences) {
    const s = sentence.trim();
    if (s.length < 10) continue;

    for (const pattern of PRICING_PATTERNS) {
      if (pattern.test(s)) {
        pricing_candidates.push(s);
        break;
      }
    }

    const lower = s.toLowerCase();
    if (lower.includes("pros") || lower.includes("cons") || lower.includes("review")) {
      review_blocks.push(s);
    }

    let complaintScore = 0;
    for (const pattern of COMPLAINT_PATTERNS) {
      if (pattern.test(lower)) complaintScore++;
    }
    if (complaintScore >= 2) {
      complaint_sentences.push(s);
    }

    // NEW: Detect implicit complaints (fraud, regulatory, financial instability, outages)
    for (const pattern of IMPLICIT_COMPLAINT_PATTERNS) {
      if (pattern.test(lower)) {
        const signalType = classifyNegativeSignal(s);
        if (signalType) {
          negative_signals.push({ text: s, type: signalType });
          console.log(`[Preprocess] Negative signal detected: ${signalType} - ${s.slice(0, 60)}...`);
        }
        break;
      }
    }

    const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(?:20|19)\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-](?:20|19)\d{2}|\d+\s+(?:days|weeks|months)\s+ago|just (?:released|launched|announced)|(?:launched|announced|released)\s+(?:in|on)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/gi;
    const dateMatches = s.match(datePattern);
    if (dateMatches) {
      dates.push(...dateMatches);
    }

    if (lower.includes("feature") || lower.includes("integrat") || lower.includes("capabilit")) {
      feature_mentions.push(s);
    }
  }

  // Dedupe negative signals
  const uniqueNegativeSignals = negative_signals.filter((signal, index, self) =>
    index === self.findIndex(s => s.text === signal.text)
  );

  const prioritizedContent = [
    ...pricing_candidates.slice(0, 10),
    ...uniqueNegativeSignals.map(s => s.text).slice(0, 10), // Include negative signals in context
    ...complaint_sentences.slice(0, 10),
    ...review_blocks.slice(0, 8),
    ...feature_mentions.slice(0, 6),
  ].join("\n");

  return {
    pricing_candidates: pricing_candidates.slice(0, 10),
    review_blocks: review_blocks.slice(0, 8),
    complaint_sentences: complaint_sentences.slice(0, 10),
    feature_mentions: feature_mentions.slice(0, 6),
    dates: dates.slice(0, 8),
    raw_content: truncateToTokens(prioritizedContent, MAX_TOKENS),
    negative_signals: uniqueNegativeSignals.slice(0, 10),
  };
}

export function needsFallback(preprocessed: PreprocessedData): boolean {
  const v2 = preprocessed as PreprocessedDataV2;
  return preprocessed.pricing_candidates.length === 0 || preprocessed.review_blocks.length === 0;
}

// Check if implicit complaints were detected (for data gaps tracking)
export function hasImplicitComplaints(preprocessed: PreprocessedData): boolean {
  const v2 = preprocessed as PreprocessedDataV2;
  return v2.negative_signals !== undefined && v2.negative_signals.length > 0;
}