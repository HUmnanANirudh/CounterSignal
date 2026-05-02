import type { PreprocessedData } from "@/types";

const MAX_TOKENS = 6000;
const PRICING_PATTERNS = [
  /\$[\d,]+(?:\/month|\/mo|\/year|\/transaction|\/user)?/gi,
  /[\d,]+(?:\/month|\/mo|\/year|\/transaction|\/user)/gi,
  /(?:pricing|price|fee|cost)\s+(?:starts|from|at)?\s*\$/gi,
  /(?:plan|tier|package)\s*(?:start|from)?\s*\$/gi,
  /free tier|free plan|entry[- ]level|starting at/i,
];

const COMPLAINT_KEYWORDS = [
  "complaint", "frustrated", "hidden fee", "unpredictable", "expensive",
  "slow", "reliability", "outage", "downtime", "difficult", "confusing",
  "poor support", "unresponsive", "buggy", "broken", "issue", "problem",
  "disappointed", "overpriced", "underwhelming",
];

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

export function preprocess(rawContent: string): PreprocessedData {
  const sentences = rawContent.split(/[.!?\n]+/).filter(Boolean);

  const pricing_candidates: string[] = [];
  const review_blocks: string[] = [];
  const complaint_sentences: string[] = [];
  const feature_mentions: string[] = [];
  const dates: string[] = [];

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
    for (const kw of COMPLAINT_KEYWORDS) {
      if (lower.includes(kw)) complaintScore++;
    }
    if (complaintScore >= 2) {
      complaint_sentences.push(s);
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

  const prioritizedContent = [
    ...pricing_candidates.slice(0, 10),
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
  };
}

export function needsFallback(preprocessed: PreprocessedData): boolean {
  return preprocessed.pricing_candidates.length === 0 || preprocessed.review_blocks.length === 0;
}