import type { PreprocessedData,NegativeSignalType } from "@/types";
import { classifyNegativeSignal } from "./utils/signal-classify";

const MAX_TOKENS = 12000;
const PRICING_PATTERNS = [
  /\$[\d,]+(?:\/month|\/mo|\/year|\/transaction|\/user)?/gi,
  /[\d,]+(?:\/month|\/mo|\/year|\/transaction|\/user)/gi,
  /(?:pricing|price|fee|cost)\s+(?:starts|from|at)?\s*\$/gi,
  /(?:plan|tier|package)\s*(?:start|from)?\s*\$/gi,
  /free tier|free plan|entry[- ]level|starting at/i,
];

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

const IMPLICIT_COMPLAINT_PATTERNS = [
  /fraud|scam|₹\s*\d+\s*(?:cr|crore)|money.*launder|security.*breach|sanction.*popup/i,
  /rbi|regulatory|ban|suspended|compliance.*issue|penalty|fine.*impose/i,
  /loss|declin|revenue.*drop|widen.*loss|net.*loss|operating.*loss|default/i,
  /outage|service.*disrupt|downtime|system.*fail|breach|data.*leak/i,
  /risk|concern|flag|investigation|enforcement.*action/i,
];

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

    for (const pattern of IMPLICIT_COMPLAINT_PATTERNS) {
      if (pattern.test(lower)) {
        const signalType = classifyNegativeSignal(s);
        if (signalType !== "general") {
          negative_signals.push({ text: s, type: signalType });
          console.log(`[Preprocess] Negative signal detected: ${signalType} - ${s.slice(0, 60)}...`);
        }
        break;
      }
    }

    const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(?:20|19)\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-](?:20|19)\d{2}|\d+\s+(?:days|weeks|months)\s+ago|just (?:released|launched|announced)|(?:launched|announced|released)\s+(?:in|on)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|(?:\d{4})/gi;
    const dateMatches = s.match(datePattern);
    if (dateMatches) {
      dates.push(...dateMatches);
    }

    if (lower.includes("feature") || lower.includes("integrat") || lower.includes("capabilit")) {
      feature_mentions.push(s);
    }
  }

  const uniqueNegativeSignals = negative_signals.filter((signal, index, self) =>
    index === self.findIndex(s => s.text === signal.text)
  );

  const launch_sentences: string[] = [];
  for (const sentence of sentences) {
    const s = sentence.trim();
    const lower = s.toLowerCase();
    if (lower.includes("launch") || lower.includes("announced") || lower.includes("partnership") || lower.includes("introduces") || lower.includes("raised") || lower.includes("funding")) {
      launch_sentences.push(s);
    }
  }

  const prioritizedContent = [
    ...pricing_candidates.slice(0, 10),
    ...uniqueNegativeSignals.map(s => s.text).slice(0, 15),
    ...complaint_sentences.slice(0, 10),
    ...launch_sentences.slice(0, 15),
    ...review_blocks.slice(0, 8),
    ...feature_mentions.slice(0, 6),
  ].join("\n");

  return {
    pricing_candidates: pricing_candidates.slice(0, 10),
    review_blocks: review_blocks.slice(0, 8),
    complaint_sentences: complaint_sentences.slice(0, 10),
    feature_mentions: feature_mentions.slice(0, 6),
    dates: dates.slice(0, 15),
    raw_content: truncateToTokens(prioritizedContent, MAX_TOKENS),
    negative_signals: uniqueNegativeSignals.slice(0, 15),
  };
}

export function needsFallback(preprocessed: PreprocessedData): boolean {
  return preprocessed.pricing_candidates.length === 0 || preprocessed.review_blocks.length === 0;
}

export function hasImplicitComplaints(preprocessed: PreprocessedData): boolean {
  return preprocessed.negative_signals !== undefined && preprocessed.negative_signals.length > 0;
}