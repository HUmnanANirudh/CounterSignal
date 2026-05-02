import type { PreprocessedData } from "@/types";

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


export function preprocess(rawContent: string): PreprocessedData {
  const sentences = rawContent.split(/[.!?\n]+/).filter(Boolean);

  const pricing_candidates: string[] = [];
  const review_blocks: string[] = [];
  const complaint_sentences: string[] = [];
  const feature_mentions: string[] = [];
  const dates: string[] = [];

  for (const sentence of sentences) {
    const s = sentence.trim();

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

    const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(?:20|19)\d{2}|(\d{1,2})[\/\-](\d{1,2})[\/\-]((?:20|19)\d{2})|\d+\s+(?:days|weeks|months)\s+ago|just (?:released|launched|announced)/gi;
    const dateMatches = s.match(datePattern);
    if (dateMatches) {
      dates.push(...dateMatches);
    }

    if (lower.includes("feature") || lower.includes("integrat") || lower.includes("capabilit")) {
      feature_mentions.push(s);
    }
  }

  return {
    pricing_candidates,
    review_blocks,
    complaint_sentences,
    feature_mentions,
    dates,
    raw_content: rawContent.slice(0, 8000),
  };
}