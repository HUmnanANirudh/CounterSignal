import type { Battlecard } from "@/types/battlecard";
import { search } from "./search";
import { preprocess, hasImplicitComplaints } from "./preprocess";
import { extract } from "./extract";
import { deriveSignals, calculateConfidence } from "./signals";
import { renderMarkdown } from "./render";
import { sanitizeForAE } from "./sanitize";
import { classifyCompetitor } from "./classify";
import { resolveEntity } from "./entity-resolution";
import { normalizeSignals } from "./normalize";
import { deriveDealPrimitives } from "./deal-primitives";
import { PIPELINE_CONFIG, PipelineCallbacks, PipelineStage } from "@/types";
import {
  buildSupplySideBattlecard,
  buildNonCompetitorBattlecard,
  buildInsufficientDataBattlecard,
  buildInternalProfileBattlecard,
  renderInternalProfileMarkdown,
  isInternalCompany,
} from "./context-builders";

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
    const classification = classifyCompetitor(competitor, rawContent);

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
    if (classification.marketRole === "supply_side") {
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

    const confidence = calculateConfidence(citations.length, signals, citations);

    // DEGRADATION: Adjust confidence based on missing critical fields instead of killing
    if (dataGaps.includes("pricing_not_found")) {
      confidence.score -= 0.1;
      confidence.factors.push("⚠ Missing pricing data (-0.1)");
    }
    if (dataGaps.includes("complaints_not_found")) {
      confidence.score -= 0.1;
      confidence.factors.push("⚠ Missing complaint/negative data (-0.1)");
    }
    if (signals.length < 2) {
      dataGaps.push("insufficient_signals");
      confidence.score -= 0.1;
      confidence.factors.push(`⚠ Only ${signals.length} validated signals (-0.1)`);
    }

    // Ensure score doesn't drop below 0.1
    confidence.score = Math.max(0.1, Math.round(confidence.score * 100) / 100);

    if (confidence.score < 0.3) {
      dataGaps.push("low_confidence_signal");
    }

    // CONFIDENCE GATING: Remove sensitive content at low confidence
    const suppressVARS = confidence.score < 0.7;
    const suppressObjections = confidence.score < 0.7;
    const suppressLandmines = confidence.score < 0.5;

    console.log(`[Pipeline] Confidence: ${confidence.score} — VARS: ${suppressVARS ? "suppressed" : "shown"}, Objections: ${suppressObjections ? "suppressed" : "shown"}, Landmines: ${suppressLandmines ? "suppressed" : "shown"}`);

    callbacks.onStageChange("primitives", "Generating deal primitives for AE use...");
    const raw_ae_battlecard = deriveDealPrimitives(extracted, signals, citations, competitor, classification.category);

    // Apply confidence gating to deal primitives
    if (suppressObjections) {
      raw_ae_battlecard.objection_handling = [];
    }
    if (suppressLandmines) {
      raw_ae_battlecard.landmines = [];
    }
    if (suppressVARS) {
      raw_ae_battlecard.quick_dismisses = [];
    }

    const ae_battlecard = sanitizeForAE(raw_ae_battlecard);

    callbacks.onStageChange("vars", "Generating VARS positioning...");

    const acknowledgePoints = [
      ...(extracted.customer_truths?.positives || []),
      ...(extracted.positioning?.differentiators || [])
    ].slice(0, 3);

    // Deterministic VARS from extracted data (Synthesis instead of static text)
    const vars_layer = {
      validate: extracted.positioning?.tagline || `Prospects consider ${competitor} when evaluating fintech solutions`,
      acknowledge: acknowledgePoints.length > 0 
        ? acknowledgePoints.map(p => `- ${p}`).join("\n")
        : `- Strong market presence\n- Established feature set`,
      reframe: `While ${competitor} solves specific problems, it is not a unified BFSI infrastructure layer. Building on disparate systems creates compliance and scaling risks.`,
      specify: `Blostem provides a native, compliant infrastructure layer where FD/RD capabilities are built-in, not bolted on.`,
    };

    // Pre-rendering sanity checks
    if (!extracted.positioning?.tagline || extracted.positioning.tagline.length < 10) {
      confidence.score = Math.max(0.1, confidence.score - 0.1);
      if (!confidence.factors.includes("⚠ Low quality positioning data (-0.1)")) {
        confidence.factors.push("⚠ Low quality positioning data (-0.1)");
      }
    }
    
    if (ae_battlecard.landmines) {
      ae_battlecard.landmines = ae_battlecard.landmines.filter(lm => !lm.includes("undefined") && !lm.includes("[object Object]") && lm.length > 20);
    }

    callbacks.onStageChange("rendering", "Rendering battlecard...");
    const recent_moves = extracted.recent_moves?.length ? filterRecentMoves(extracted.recent_moves) : [];

    const battlecard: Battlecard = {
      competitor,
      generatedAt: new Date().toISOString(),
      researchDurationMs: Date.now() - startTime,
      positioning: extracted.positioning || { tagline: "unknown", targetSegments: [], differentiators: [] },
      pricing_posture: extracted.pricing_posture || { model: "unknown", entryPrice: "opaque", tiers: [], opacity: "opaque" },
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
