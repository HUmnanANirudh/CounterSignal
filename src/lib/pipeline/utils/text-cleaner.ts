/**
 * Unified Text Cleaner and Materiality Filter.
 * Used across the pipeline to reject RAG noise, PR fluff, and non-material snippets.
 */

export interface CleaningOptions {
  isNewsSource?: boolean;
  minWords?: number;
  maxChars?: number;
  requireQuote?: boolean;
}

export function cleanPipelineText(
  text: string,
  options: CleaningOptions = {}
): string | null {
  const {
    isNewsSource = false,
    minWords = 6,
    maxChars = 500,
    requireQuote = false
  } = options;

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Structural Rejection
  const words = trimmed.split(/\s+/);
  if (words.length < minWords || trimmed.length > maxChars) return null;

  // 2. RAG Artifact & Noise Rejection
  const artifactPatterns = [
    /media_files|attachments|banner|datalabs|agency_attachments/i,
    /\.(jpg|jpeg|png|gif|svg|pdf|webp)\b/i,
    /https?:\/\/[^\s]+/i,
    /\[.*\]\(.*\)/, // markdown links
    /<[^>]+>/,      // HTML tags
    /^[^\w\s]{3,}$/, // just punctuation
    /#\w+/,          // hashtags
    /🤝|🚀|🔥|💎|📈|📉|📊/, // emojis common in PR/social fluff
    /\b(cookie|privacy policy|terms of service|all rights reserved|subscribe|newsletter|follow us|copyright)\b/i,
  ];

  for (const pattern of artifactPatterns) {
    if (pattern.test(trimmed)) return null;
  }

  // 3. Repeated Token Rejection (e.g. "paytm paytm paytm")
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  if (uniqueWords.size < words.length * 0.4) return null;

  // 4. Materiality Filtering (Ensure snippet has strategic or buyer-impact value)
  const isMaterial = (
    /\b(fee|cost|support|activation|wait|complex|pricing|mdr|markup|transparent|opaque)\b/i.test(lower) ||
    /\b(fraud|outage|delay|failed|compliance|rbi|security|penalty|violation|reliability|risk|custody|license|winding\s+up)\b/i.test(lower) ||
    /\b(valuation|funding|pivot|exit|acquisition|market\s*share|displace|revenue|growth\s*focus|merger|series\s+[a-z])\b/i.test(lower)
  );

  if (!isMaterial) return null;

  // 5. News-Specific Strictness
  if (isNewsSource || requireQuote) {
    const hasQuote = /["'“”‘’]/.test(trimmed);
    
    if (!hasQuote) {
      // Reject generic corporate descriptions common in news headers
      const newsFluff = [
        /subsidiary|wholly\s+owned|headquartered|founded\s+in|founded\s+by/i,
        /regulatory.*approval|received.*approval|license.*grant|pa\s+license/i,
        /quarterly.*results|revenue.*growth|net.*loss|profit.*after.*tax/i,
        /collaboration|partnership|tie-up|mou\s+with|agreement\s+with|jointly/i,
        /appointed|leadership\s+change|resigned|hired\s+as/i,
      ];

      for (const pattern of newsFluff) {
        if (pattern.test(lower)) return null;
      }

      // If no quote and looks like news reporting, reject
      if (lower.includes("reported") || lower.includes("according to") || lower.includes("disclosed") || lower.includes("announced") || lower.includes("stated")) {
        return null;
      }

      // Reject descriptive "The [Company]..." sentences
      if (/^the\s+\w+\s+(is|was|has|received|announced|launched|raised)/i.test(trimmed)) {
        return null;
      }
    }
  }

  return trimmed;
}
