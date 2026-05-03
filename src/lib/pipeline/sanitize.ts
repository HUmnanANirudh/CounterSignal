/**
 * sanitize.ts — Post-processing layer for AE-ready output.
 *
 * This module sits between intelligence/reasoning layers and the
 * presentation layer. Only clean, AE-scannable content passes through.
 *
 * Rules enforced:
 *  - No raw URLs or URL fragments
 *  - No markdown artifacts (## headings, [links](…), raw_content)
 *  - No short/meaningless lines
 *  - Deduped objections (by intent)
 *  - Quick dismiss: max 2, ≤ 12 words, no citations/URLs/questions
 *  - Bullet caps per section
 *  - Signal trace stripped (internal-only layer)
 */

import type { AE_BATTLECARD } from "@/types/battlecard";

/* ── Line-level sanitization ──────────────────────────────── */

const STRIP_PATTERNS = [
  /^https?:\/\/.*/i,           // full URLs
  /^com\/.*/i,                 // URL fragments
  /^www\..*/i,                 // www links
  /^\[.*?\]\(.*?\)/,           // markdown links
  /raw_content/i,              // internal field leak
  /^##\s/,                     // leaked markdown headings
  /^data:\s/i,                 // data URIs
];

const MIN_LINE_LENGTH = 8;

export function sanitizeLine(line: string): string | null {
  const trimmed = line.trim();

  // Empty → drop
  if (!trimmed) return null;

  // Too short to be meaningful
  if (trimmed.length < MIN_LINE_LENGTH) return null;

  // Matches strip pattern → drop
  for (const pattern of STRIP_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }

  // Strip inline URLs but keep surrounding text
  const cleaned = trimmed
    .replace(/https?:\/\/\S+/g, "")       // inline URLs
    .replace(/com\/\S+/g, "")             // URL path fragments
    .replace(/\s{2,}/g, " ")              // collapse whitespace
    .trim();

  if (cleaned.length < MIN_LINE_LENGTH) return null;

  return cleaned;
}

export function sanitizeText(text: string): string {
  if (!text) return "";
  const lines = text.split("\n");
  const clean = lines
    .map(sanitizeLine)
    .filter((l): l is string => l !== null);
  return clean.join(" ").trim();
}

/* ── Array sanitization ───────────────────────────────────── */

export function sanitizeArray(items: string[], maxItems: number): string[] {
  return items
    .map((item) => sanitizeText(item))
    .filter((item) => item.length >= MIN_LINE_LENGTH)
    .slice(0, maxItems);
}

/* ── Quick dismiss enforcement ────────────────────────────── */

/**
 * Quick dismiss rules:
 *  - max 2
 *  - each ≤ 12 words
 *  - no citations ([citation-N])
 *  - no URLs
 *  - no questions (?)
 */
export function sanitizeQuickDismisses(dismisses: string[]): string[] {
  return dismisses
    .map((d) => {
      let clean = d
        .replace(/\[citation-\d+\]/gi, "")     // strip citations
        .replace(/https?:\/\/\S+/g, "")         // strip URLs
        .replace(/com\/\S+/g, "")               // strip URL fragments
        .replace(/\s{2,}/g, " ")                // collapse spaces
        .trim();

      // Truncate to ~12 words
      const words = clean.split(/\s+/);
      if (words.length > 14) {
        // Find a natural break near word 12
        clean = words.slice(0, 12).join(" ");
        // End with period if not already punctuated
        if (!/[.!]$/.test(clean)) clean += ".";
      }

      return clean;
    })
    .filter((d) => {
      // Must be meaningful
      if (d.length < MIN_LINE_LENGTH) return false;
      // No questions
      if (d.includes("?")) return false;
      return true;
    })
    .slice(0, 2);
}

/* ── Objection deduplication ──────────────────────────────── */

/**
 * Deduplicates objections by semantic intent.
 * Groups by the first 3 significant words of the objection text.
 * Keeps only the first (highest-priority) entry per group.
 * Max 3 unique objections.
 */
export function dedupeObjections<T extends { objection: string; counter: string }>(
  objections: T[]
): T[] {
  const seen = new Map<string, T>();

  for (const obj of objections) {
    // Normalize: lowercase, strip quotes, take first 3 meaningful words
    const normalized = obj.objection
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const words = normalized.split(" ").filter((w) => w.length > 2);
    const intentKey = words.slice(0, 3).join("_");

    if (!seen.has(intentKey)) {
      // Also sanitize the counter text
      const cleanCounter = sanitizeText(obj.counter);
      if (cleanCounter.length > 10) {
        seen.set(intentKey, { ...obj, counter: cleanCounter });
      }
    }
  }

  return Array.from(seen.values()).slice(0, 3);
}

/* ── Full battlecard sanitization ─────────────────────────── */

const MAX_BULLETS = 4;

export function sanitizeForAE(battlecard: AE_BATTLECARD): AE_BATTLECARD {
  return {
    ...battlecard,

    // 1-2 lines max
    company_overview: sanitizeText(battlecard.company_overview).split(". ").slice(0, 2).join(". ").trim(),

    competitor_type: battlecard.competitor_type,

    // Max 2, ≤12 words, no citations/URLs/questions
    quick_dismisses: sanitizeQuickDismisses(battlecard.quick_dismisses || []),

    // Deduped by intent, max 3
    objection_handling: dedupeObjections(battlecard.objection_handling || []),

    // Capped lists
    why_we_win: sanitizeArray(battlecard.why_we_win || [], MAX_BULLETS),
    why_we_lose: sanitizeArray(battlecard.why_we_lose || [], MAX_BULLETS),

    // Sanitized text
    pricing_positioning: sanitizeText(battlecard.pricing_positioning),

    // Capped lists
    landmines: sanitizeArray(battlecard.landmines || [], 3),
    FUD_responses: sanitizeArray(battlecard.FUD_responses || [], 3),
    proof_points: sanitizeArray(battlecard.proof_points || [], 3),
    compete_aggressively_when: sanitizeArray(battlecard.compete_aggressively_when || [], MAX_BULLETS),

    // Signal trace: INTERNAL ONLY — strip from AE output
    signal_trace: [],

    // Category contrast: clean
    category_contrast: sanitizeText(battlecard.category_contrast || ""),
  };
}
