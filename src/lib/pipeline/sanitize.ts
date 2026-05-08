import type { AE_BATTLECARD, VARSLayer } from "@/types/battlecard";
import { cleanPipelineText } from "./utils/text-cleaner";

const FILLER_PATTERNS = [
  /\bit is pertinent to note that\b/gi,
  /\bit is worth noting that\b/gi,
  /\bit should be noted that\b/gi,
  /\bit is important to note that\b/gi,
  /\bindeed\b/gi,
  /\bfurthermore\b/gi,
  /\bmoreover\b/gi,
  /\badditionally\b/gi,
  /\bnevertheless\b/gi,
  /\bnonetheless\b/gi,
  /\bhowever,?\s*/gi,
  /\bin conclusion\b/gi,
  /\bas such\b/gi,
  /\bto that end\b/gi,
  /\bin this regard\b/gi,
  /\bwith respect to\b/gi,
  /\bin terms of\b/gi,
  /\bin essence\b/gi,
  /\bquite\b/gi,
  /\bvery\b/gi,
  /\breally\b/gi,
  /\bsignificantly\b/gi,
  /\bextremely\b/gi,
  /\bessentially\b/gi,
  /\bfundamentally\b/gi,
  /\bbasically\b/gi,
  /\bconsequently\b/gi,
  /\baccordingly\b/gi,
  // Remove signal references from LLM output
  /\[signal_\d+\]/gi,
  // Remove citation lists like [citation-1], [citation-5], [citation-7]
  /\s*\[\s*citation-\d+\s*\]/gi,
];

function stripFillers(text: string): string {
  let result = text;
  for (const pattern of FILLER_PATTERNS) {
    result = result.replace(pattern, "");
  }
  // Collapse whitespace and fix punctuation
  return result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\.\s*\./g, ".")
    .replace(/^\s*,\s*/g, "")
    .trim();
}

/* ── Line-level sanitization ──────────────────────────────── */

const STRIP_PATTERNS = [
  // URLs
  /^https?:\/\/.*/i,
  // URL fragments
  /^com\/.*/i,
  /^www\..*/i,
  // Any URL-like content
  /raw_content/i,
  // Markdown headings (## Title)
  /^##\s.*/i,
  /^#+\s.*/i,
  // Data prefix
  /^data:\s/i,
  // Lines starting with common article title patterns
  /^\[?[A-Z][a-z]+ [a-z]+ (leads|causes|results|reported|announces|says)/i,
];

const MIN_LINE_LENGTH = 8;

export function sanitizeLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < MIN_LINE_LENGTH) return null;

  // Apply cleanText rules
  if (!isValidSignalText(trimmed)) return null;

  for (const pattern of STRIP_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }

  const cleaned = trimmed
    .replace(/https?:\/\/\S+/g, "")
    .replace(/com\/\S+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned.length < MIN_LINE_LENGTH) return null;
  return cleaned;
}

export function isValidSignalText(text: string): boolean {
  return cleanPipelineText(text, { minWords: 5 }) !== null;
}

export function cleanText(text: string, options?: { minWords?: number; bypassMateriality?: boolean }): string {
  if (!text) return "";
  const minWords = options?.minWords ?? 5;
  const bypassMateriality = options?.bypassMateriality ?? false;
  if (cleanPipelineText(text, { minWords, bypassMateriality }) === null) return "";
  return sanitizeText(text);
}

export function sanitizeText(text: string): string {
  if (!text) return "";
  const lines = text.split("\n");
  const clean = lines
    .map(sanitizeLine)
    .filter((l): l is string => l !== null);
  return stripFillers(clean.join(" ").trim());
}

/* ── Sentence completeness ────────────────────────────────── */

/**
 * Check if text is a complete thought (not a partial sentence).
 * Rejects lines ending in "to.", "and.", "the.", etc.
 */
function isCompleteSentence(text: string): boolean {
  const trimmed = text.trim();

  // Must end with proper punctuation
  if (!/[.!]$/.test(trimmed)) return false;

  // Reject if ends with a preposition/article before the period
  const partialEndings = /\b(to|and|the|a|an|of|in|for|with|from|by|at|on|is|are|was|were|has|had|have|but|or|nor|that|this|it|its|not|into|as)\.\s*$/i;
  if (partialEndings.test(trimmed)) return false;

  // Reject extremely short sentences (likely fragments)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 4) return false;

  return true;
}

/* ── Array sanitization ───────────────────────────────────── */

export function sanitizeArray(items: string[], maxItems: number): string[] {
  return items
    .map((item) => stripFillers(sanitizeText(item)))
    .filter((item) => item.length >= MIN_LINE_LENGTH)
    .slice(0, maxItems);
}

/* ── Quick dismiss enforcement ────────────────────────────── */

/**
 * Quick dismiss rules:
 *  - max 2
 *  - each ≤ 12 words
 *  - no citations, URLs, questions
 *  - must be a complete thought (no partial sentences)
 */
export function sanitizeQuickDismisses(dismisses: string[]): string[] {
  return dismisses
    .map((d) => {
      let clean = d
        .replace(/\[citation-\d+\]/gi, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/com\/\S+/g, "")
        .trim();

      clean = stripFillers(clean);

      // Truncate to 18 words at a natural boundary (relaxed for BFSI)
      const words = clean.split(/\s+/);
      if (words.length > 20) {
        let cutPoint = 18;
        for (let i = Math.min(17, words.length - 1); i >= 12; i--) {
          if (/[.—,;]$/.test(words[i]) || words[i].endsWith("—")) {
            cutPoint = i + 1;
            break;
          }
        }
        clean = words.slice(0, cutPoint).join(" ");
      }

      // Ensure ends with period
      clean = clean.replace(/[,;—]+$/, "").trim();
      if (!/[.!]$/.test(clean)) clean += ".";

      return clean;
    })
    .filter((d) => {
      if (d.length < MIN_LINE_LENGTH) return false;
      if (d.includes("?")) return false;
      if (!isCompleteSentence(d)) return false;
      return true;
    })
    .slice(0, 2);
}

/* ── Objection deduplication + counter compression ────────── */

export function dedupeObjections<T extends { objection: string; counter: string }>(
  objections: T[]
): T[] {
  const seen = new Map<string, T>();

  for (const obj of objections) {
    const normalized = obj.objection
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const words = normalized.split(" ").filter((w) => w.length > 2);
    const intentKey = words.slice(0, 3).join("_");

    if (!seen.has(intentKey)) {
      // Sanitize + compress counter
      let cleanCounter = sanitizeText(obj.counter);
      // Compress: max ~30 words
      const counterWords = cleanCounter.split(/\s+/);
      if (counterWords.length > 35) {
        // Cut at sentence boundary near word 30
        const partial = counterWords.slice(0, 35).join(" ");
        const lastPeriod = partial.lastIndexOf(".");
        if (lastPeriod > partial.length * 0.5) {
          cleanCounter = partial.slice(0, lastPeriod + 1);
        } else {
          cleanCounter = partial;
          if (!/[.!]$/.test(cleanCounter)) cleanCounter += ".";
        }
      }

      if (cleanCounter.length > 10) {
        seen.set(intentKey, { ...obj, counter: cleanCounter });
      }
    }
  }

  return Array.from(seen.values()).slice(0, 3);
}

/* ── VARS compression ─────────────────────────────────────── */

/**
 * Each VARS section: max 2 lines (~25 words).
 * Total VARS: ≤ 8 lines.
 * Also strips [signal_N] and [citation-N] lists from output.
 */
export function compressVARS(vars: VARSLayer): VARSLayer {
  const stripRefs = (text: string): string => {
    return text
      // Remove [signal_N] references
      .replace(/\[\s*signal_\d+\s*\]/gi, "")
      // Remove multiple citation refs like [citation-1], [citation-5], [citation-7]
      .replace(/\s*\[\s*citation-\d+\s*\]/gi, "")
      // Remove trailing commas from cleaned lists
      .replace(/,\s*\.\s*$/g, ".")
      .trim();
  };

  const compress = (text: string): string => {
    let clean = stripRefs(stripFillers(sanitizeText(text)));

    // Hard cap: ~25 words
    const words = clean.split(/\s+/);
    if (words.length > 28) {
      const partial = words.slice(0, 25).join(" ");
      const lastPeriod = partial.lastIndexOf(".");
      if (lastPeriod > partial.length * 0.4) {
        clean = partial.slice(0, lastPeriod + 1);
      } else {
        clean = partial;
        if (!/[.!]$/.test(clean)) clean += ".";
      }
    }

    return clean;
  };

  return {
    validate: compress(vars.validate),
    acknowledge: compress(vars.acknowledge),
    reframe: compress(vars.reframe),
    specify: compress(vars.specify),
  };
}

/* ── Full battlecard sanitization ─────────────────────────── */

const MAX_BULLETS = 4;

export function sanitizeForAE(battlecard: AE_BATTLECARD): AE_BATTLECARD {
  return {
    ...battlecard,

    // 1-2 lines max, filler stripped
    // Relaxed word count for tagline/overview (min 3 words) and bypass materiality
    company_overview: stripFillers(
      cleanText(battlecard.company_overview, { minWords: 3, bypassMateriality: true })
        .split(". ")
        .slice(0, 2)
        .join(". ")
        .trim()
    ) || battlecard.company_overview,

    competitor_type: battlecard.competitor_type,

    // Max 2, ≤12 words, complete thoughts only
    quick_dismisses: sanitizeQuickDismisses(battlecard.quick_dismisses || []),

    // Deduped by intent, max 3, counters compressed
    objection_handling: dedupeObjections(battlecard.objection_handling || []),

    // Capped + filler-free
    why_we_win: sanitizeArray(battlecard.why_we_win || [], MAX_BULLETS),
    why_we_lose: sanitizeArray(battlecard.why_we_lose || [], MAX_BULLETS),

    // Filler-free
    pricing_positioning: stripFillers(sanitizeText(battlecard.pricing_positioning)),

    // Capped
    FUD_responses: sanitizeArray(battlecard.FUD_responses || [], 3),
    proof_points: sanitizeArray(battlecard.proof_points || [], 3),
    compete_aggressively_when: sanitizeArray(battlecard.compete_aggressively_when || [], MAX_BULLETS),

    // Signal trace: Pass through for render-layer decision
    signal_trace: battlecard.signal_trace || [],

    // Category contrast: clean
    category_contrast: stripFillers(sanitizeText(battlecard.category_contrast || "")),
  };
}
