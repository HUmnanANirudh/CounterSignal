import type { SentimentPolarity } from "@/types/sentiment";

export function detectPolarity(text: string): SentimentPolarity {
  const lower = text.toLowerCase();
  
  // Strong patterns for professional synthesis
  const positive = /\b(excellent|amazing|love|best|smooth|helpful|quick|outstanding|perfect|easy|simple|seamless|reliable|transparent|automated|orchestrated|resolution|on-time|native|integrated|efficient|compliant|secure|successful|growth|leading|raised|excels|profit|stable)\b/i;
  const negative = /\b(terrible|awful|worst|horrible|hate|broken|fraud|scam|delay|failed|frustrated|complex|difficult|opaque|slow|hidden|frozen|locked|error|rejection|friction|manual|loss|unresolved|unreliable|disruption|freeze|scammer)\b/i;

  const posMatches = (lower.match(positive) || []).length;
  const negMatches = (lower.match(negative) || []).length;

  if (posMatches === 0 && negMatches === 0) return "neutral";
  if (posMatches > negMatches) return "positive";
  if (negMatches > posMatches) return "negative";
  return "mixed";
}
