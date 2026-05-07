import type { Battlecard } from "@/types/battlecard";
import { search } from "./search";
import { preprocess, hasImplicitComplaints } from "./preprocess";
import { extract } from "./extract";
import { deriveSignals, calculateConfidence } from "./signals";
import { renderMarkdown } from "./render";
import { sanitizeForAE } from "./sanitize";
import { classifyCompetitor, getPricingModelForCategory } from "./classify";
import { resolveEntity } from "./entity-resolution";
import { normalizeSignals } from "./normalize";
import { deriveDealPrimitives } from "./deal-primitives";
import { PIPELINE_CONFIG, PipelineCallbacks } from "@/types";
import {
  buildSupplySideBattlecard,
  buildNonCompetitorBattlecard,
  buildInsufficientDataBattlecard,
  buildInternalProfileBattlecard,
  renderInternalProfileMarkdown,
  isInternalCompany,
} from "./context-builders";
import { getCategoryStrategy } from "./category-strategies";

export type { PipelineStage } from "@/types";

const cache = new Map<string, { battlecard: Battlecard; timestamp: number }>();

function getCached(competitor: string): Battlecard | null {
  const cached = cache.get(competitor);
  if (cached && Date.now() - cached.timestamp < PIPELINE_CONFIG.cacheTTL) {
    return cached.battlecard;
  }
  return null;
}

function setCache(competitor: string, battlecard: Battlecard): void {
  cache.set(competitor, { battlecard, timestamp: Date.now() });
}

function filterRecentMoves(moves: Array<{ name: string; date: string }>): Array<{ name: string; date: string; impact: "high" | "medium" | "low" }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PIPELINE_CONFIG.recentDays);

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
    console.log(`[Pipeline] Entity category hint: ${searchResult.entityCategoryHint || "none"}`);

    // MINIMUM DATA GATE: Check sufficiency before proceeding
    if (citations.length < PIPELINE_CONFIG.minDocuments) {
      console.warn(`[Pipeline] MINIMUM DATA GATE: Only ${citations.length} documents (< ${PIPELINE_CONFIG.minDocuments} required)`);
      const insufficientCard = buildInsufficientDataBattlecard(competitor, debugInfo?.relevantResults ?? 0, debugInfo?.totalResults ?? 0);
      callbacks.onChunk(renderMarkdown(insufficientCard));
      callbacks.onComplete(insufficientCard);
      return;
    }

    // Entity resolution
    const resolution = resolveEntity(competitor);

    if (resolution.entityConfidence < 0.3) {
      console.warn(`[Pipeline] LOW ENTITY CONFIDENCE (${resolution.entityConfidence}) — insufficient entity grounding`);
      const insufficientCard = buildInsufficientDataBattlecard(competitor, debugInfo?.relevantResults ?? 0, debugInfo?.totalResults ?? 0);
      callbacks.onChunk(renderMarkdown(insufficientCard));
      callbacks.onComplete(insufficientCard);
      return;
    }

    if (debugInfo && debugInfo.domainCount < PIPELINE_CONFIG.minDomains) {
      console.warn(`[Pipeline] Low domain diversity (${debugInfo.domainCount} domains). Results may be biased.`);
      dataGaps.push(`limited_source_diversity`);
    }

    callbacks.onStageChange("classifying", `Classifying ${competitor}...`);
    const preprocessed = preprocess(rawContent);

    // Use classifyCompetitor (deterministic scoring model)
    const classification = classifyCompetitor(competitor, rawContent, resolution.resolved?.categoryHint);

    console.log(`[Pipeline] Classification: ${classification.category} (confidence: ${classification.confidence.toFixed(2)}) - marketRole: ${classification.marketRole}`);

    // SELF-COMPANY PATH: Blostem is internal, not a competitor or partner
    if (isInternalCompany(competitor)) {
      const internalCard = buildInternalProfileBattlecard(competitor);
      setCache(competitor, internalCard);
      callbacks.onChunk(renderInternalProfileMarkdown(competitor));
      callbacks.onComplete(internalCard);
      return;
    }

    // SUPPLY-SIDE PATH (issuers like NBFCs, FD providers)
    if (classification.marketRole === "partner") {
      console.log(`[Pipeline] ${competitor} is SUPPLY-SIDE (${classification.category}) — generating supply-side context`);
      const supplyCard = buildSupplySideBattlecard(competitor, classification.category, startTime, citations);
      setCache(competitor, supplyCard);
      callbacks.onChunk(renderMarkdown(supplyCard));
      callbacks.onComplete(supplyCard);
      return;
    }

    // NON-COMPETITOR PATH (aggregators, brokers, lenders, insurtech)
    if (classification.marketRole === "non_competitor") {
      console.log(`[Pipeline] ${competitor} is NOT a competitor (${classification.category}) — generating strategic context`);
      const { signals } = deriveSignals(preprocessed, citations);
      const strategicCard = buildNonCompetitorBattlecard(competitor, classification.category, startTime, citations, signals);
      setCache(competitor, strategicCard);
      callbacks.onChunk(renderMarkdown(strategicCard));
      callbacks.onComplete(strategicCard);
      return;
    }

    // COMPETITOR PATH
    callbacks.onStageChange("preprocessing", `Found ${citations.length} sources from ${debugInfo?.domainCount || 1} domains, preprocessing...`);

    if (preprocessed.pricing_candidates.length === 0) {
      dataGaps.push("pricing_not_found");
    }
    if (preprocessed.complaint_sentences.length === 0 && !hasImplicitComplaints(preprocessed)) {
      dataGaps.push("complaints_not_found");
    }

    callbacks.onStageChange("extracting", "Extracting structured intelligence...");
    const extracted = await extract(preprocessed, competitor);

    callbacks.onStageChange("deriving", "Deriving signals and citation mapping...");
    const { signals: rawSignals, sourceMap } = deriveSignals(preprocessed, citations);

    callbacks.onStageChange("normalizing", "Normalizing and summarizing signals...");
    const signals = await normalizeSignals(rawSignals);

    // Calculate extraction quality
    let extractionQuality = 1.0;
    if (dataGaps.includes("pricing_not_found")) extractionQuality -= 0.15;
    if (dataGaps.includes("complaints_not_found")) extractionQuality -= 0.15;
    if (!extracted.positioning?.tagline || extracted.positioning.tagline.length < 10) extractionQuality -= 0.2;
    extractionQuality = Math.max(0, extractionQuality);

    const confidence = calculateConfidence(
      resolution.entityConfidence,
      classification.confidence,
      extractionQuality,
      signals,
      citations,
      dataGaps
    );

    // If signals are empty but we have classification, boost strategic score slightly from classification
    if (signals.length === 0) {
      confidence.strategicScore = Math.max(confidence.strategicScore, classification.confidence * 0.4);
      confidence.factors.push(`⚠ No validated signals — using classification fallback for strategy`);
    }

    // MINIMAL GATING: Use strategicScore for GTM gating
    const suppressVARS = confidence.strategicScore < 0.3;
    const suppressObjections = confidence.strategicScore < 0.4;

    console.log(`[Pipeline] Confidence (Entity: ${confidence.entityScore}, Strategic: ${confidence.strategicScore}) — VARS: ${suppressVARS ? "suppressed" : "shown"}, Objections: ${suppressObjections ? "suppressed" : "shown"}`);

    callbacks.onStageChange("primitives", "Generating deal primitives for AE use...");
    const raw_ae_battlecard = deriveDealPrimitives(extracted, signals, citations, competitor, classification.category);

    // Apply confidence gating to deal primitives
    if (suppressObjections) {
      raw_ae_battlecard.persona_objections = [];
    }
    if (suppressVARS) {
      raw_ae_battlecard.quick_dismisses = [];
    }

    const ae_battlecard = sanitizeForAE(raw_ae_battlecard);

    callbacks.onStageChange("vars", "Generating category-aware VARS positioning...");

    const strategy = getCategoryStrategy(classification.category);

    // Deterministic VARS from extracted data, using Category Strategy Map for consistent semantics
    const vars_layer = {
      validate: extracted.VARS?.validate || extracted.positioning?.tagline || strategy.validate,
      acknowledge: extracted.VARS?.acknowledge || strategy.acknowledge,
      reframe: strategy.reframe,
      specify: strategy.specify,
    };




    callbacks.onStageChange("rendering", "Rendering battlecard...");
    const recent_moves = extracted.recent_moves?.length ? filterRecentMoves(extracted.recent_moves) : [];

    const battlecard: Battlecard = {
      competitor,
      generatedAt: new Date().toISOString(),
      researchDurationMs: Date.now() - startTime,
      positioning: extracted.positioning || { tagline: "unknown", targetSegments: [], differentiators: [] },
      pricing_posture: (extracted.pricing_posture?.model === "unknown" || !extracted.pricing_posture)
        ? { model: getPricingModelForCategory(classification.category), entryPrice: "opaque", tiers: [], opacity: "opaque" }
        : extracted.pricing_posture,
      recent_moves,
      customer_truths: extracted.customer_truths || { positives: [], negatives: [], keyComplaints: [] },
      VARS_layer: vars_layer,
      objection_handling: [],
      AE_BATTLECARD: ae_battlecard,
      signals,
      sourceMap,
      citations: citations.slice(0, 6),
      confidence,
      dataGaps,
    };

    setCache(competitor, battlecard);
    const markdown = renderMarkdown(battlecard);
    callbacks.onChunk(markdown);
    callbacks.onComplete(battlecard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Pipeline] Pipeline error for ${competitor}: ${errorMessage}`);

    // Return insufficient data card on error
    const insufficientCard = buildInsufficientDataBattlecard(competitor, 0, 0);
    callbacks.onChunk(renderMarkdown(insufficientCard));
    callbacks.onComplete(insufficientCard);
  }
}
