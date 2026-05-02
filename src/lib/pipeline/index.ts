import type { Battlecard } from "@/types/battlecard";
import { search } from "./search";
import { preprocess } from "./preprocess";
import { extract } from "./extract";
import { deriveSignals, calculateConfidence } from "./signals";
import { deriveDealPrimitives } from "./deal-primitives";
import { generateVarsAndObjections } from "./vars-objections";
import { renderMarkdown } from "./render";

export interface PipelineCallbacks {
  onStageChange: (stage: PipelineStage, message: string) => void;
  onChunk: (markdown: string) => void;
  onComplete: (battlecard: Battlecard) => void;
  onError: (error: Error) => void;
}

export type PipelineStage =
  | "searching"
  | "preprocessing"
  | "extracting"
  | "deriving"
  | "primitives"
  | "vars"
  | "rendering";

const cache = new Map<string, { battlecard: Battlecard; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 180;
const MIN_DOMAINS = 2;

function getCached(competitor: string): Battlecard | null {
  const cached = cache.get(competitor);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.battlecard;
  }
  return null;
}

function setCache(competitor: string, battlecard: Battlecard): void {
  cache.set(competitor, { battlecard, timestamp: Date.now() });
}

function filterRecentMoves(moves: Array<{ name: string; date: string }>): Array<{ name: string; date: string; impact: "high" | "medium" | "low" }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RECENT_DAYS);

  return moves
    .filter((move) => {
      try {
        const date = new Date(move.date);
        return date > cutoff || move.date.toLowerCase().includes("just released");
      } catch {
        return false;
      }
    })
    .slice(0, 5)
    .map((move) => ({ ...move, impact: "medium" as const }));
}

export async function runPipeline(
  competitor: string,
  callbacks: PipelineCallbacks
): Promise<void> {
  const cached = getCached(competitor);
  if (cached) {
    callbacks.onStageChange("rendering", "Returning cached battlecard...");
    callbacks.onChunk(renderMarkdown(cached));
    callbacks.onComplete(cached);
    return;
  }

  const startTime = Date.now();
  const dataGaps: string[] = [];

  try {
    callbacks.onStageChange("searching", `Researching ${competitor}...`);
    const searchResult = await search(competitor);
    const { citations, rawContent, debugInfo } = searchResult;

    if (citations.length === 0) {
      throw new Error("Insufficient search results. Try a more specific competitor name.");
    }

    if (debugInfo && debugInfo.domainCount < MIN_DOMAINS) {
      console.warn(`[Pipeline] Low domain diversity (${debugInfo.domainCount} domains). Results may be biased.`);
      dataGaps.push(`limited_source_diversity`);
    }

    if (debugInfo) {
      console.log(`[Pipeline] Domain breakdown: ${JSON.stringify(debugInfo.sourcesByDomain)}`);
    }

    callbacks.onStageChange("preprocessing", `Found ${citations.length} sources from ${debugInfo?.domainCount || 1} domains, preprocessing...`);
    const preprocessed = preprocess(rawContent);

    if (preprocessed.pricing_candidates.length === 0) {
      dataGaps.push("pricing_not_found");
    }
    if (preprocessed.complaint_sentences.length === 0) {
      dataGaps.push("complaints_not_found");
    }

    callbacks.onStageChange("extracting", "Extracting structured intelligence...");
    const extracted = await extract(preprocessed, competitor, citations);

    callbacks.onStageChange("deriving", "Deriving signals and citation mapping...");
    const { signals, sourceMap } = deriveSignals(preprocessed, citations);
    const confidence = calculateConfidence(citations.length, signals, citations);

    if (confidence.score < 0.3) {
      dataGaps.push("low_confidence_signal");
    }

    // NEW: Derive deal primitives (AE-aligned)
    callbacks.onStageChange("primitives", "Generating deal primitives for AE use...");
    const ae_battlecard = deriveDealPrimitives(extracted, signals, citations, competitor);

    // Keep legacy VARS for backwards compatibility
    callbacks.onStageChange("vars", "Generating VARS positioning...");
    const { vars_layer, objection_handling } = await generateVarsAndObjections(
      extracted,
      signals,
      sourceMap,
      citations
    );

    callbacks.onStageChange("rendering", "Rendering battlecard...");
    const recent_moves = extracted.recent_moves?.length ? filterRecentMoves(extracted.recent_moves) : [];

    const battlecard: Battlecard = {
      competitor,
      generatedAt: new Date().toISOString(),
      researchDurationMs: Date.now() - startTime,
      competitor_summary: extracted.competitor_summary || "",
      positioning: extracted.positioning || { tagline: "unknown", targetSegments: [], differentiators: [] },
      pricing_posture: extracted.pricing_posture || { model: "unknown", entryPrice: "opaque", tiers: [], opacity: "opaque" },
      recent_moves,
      customer_truths: extracted.customer_truths || { positives: [], negatives: [], keyComplaints: [] },
      // Legacy layers
      VARS_layer: vars_layer,
      objection_handling,
      // New AE-aligned layer
      AE_BATTLECARD: ae_battlecard,
      sourceMap,
      citations: citations.slice(0, 8),
      confidence,
      dataGaps,
    };

    setCache(competitor, battlecard);
    const markdown = renderMarkdown(battlecard);
    callbacks.onChunk(markdown);
    callbacks.onComplete(battlecard);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}