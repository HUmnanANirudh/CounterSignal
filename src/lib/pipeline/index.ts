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
  renderRelevanceAssessmentMarkdown,
  isInternalCompany,
  buildRelevanceAssessmentBattlecard,
  buildInvalidInputBattlecard,
  renderInvalidInputMarkdown,
} from "./context-builders";
import { getCategoryStrategy } from "./category-strategies";
import { getRelationshipMode, getStackPosition } from "@/types/entity";
import {
  extractSentimentSignals,
  buildSentimentAnalysis,
  extractPricingEvidence,
  clusterFinancialEvents,
} from "./sentiment";

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

function filterRecentMoves(moves: Array<{ name: string; date: string; type?: string }>): Array<{ name: string; date: string; type: import("@/types/battlecard").EventType; impact: "high" | "medium" | "low" }> {
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
    .map((move) => ({
      name: move.name,
      date: move.date,
      type: (move.type ?? "product_launch") as import("@/types/battlecard").EventType,
      impact: "medium" as const,
    }));
}

export async function runPipeline(
  competitor: string,
  callbacks: PipelineCallbacks
): Promise<void> {
  // INPUT VALIDATION GATE: Ensure only company names are entered, not queries
  const trimmed = competitor.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const isQuery = wordCount > 4 || trimmed.includes("?") || /^(what|how|why|where|when|who|is|are|tell)\s/i.test(trimmed);
  
  if (isQuery && wordCount > 2) {
    console.error(`[Pipeline] Input rejected as query: "${trimmed}"`);
    const invalidCard = buildInvalidInputBattlecard(competitor);
    callbacks.onChunk(renderInvalidInputMarkdown(invalidCard));
    callbacks.onComplete(invalidCard);
    return;
  }

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
    // Helper to cache battlecard for all aliases
    const cacheWithAliases = (card: Battlecard) => {
      setCache(competitor, card);
      const normalized = resolveEntity(competitor);
      if (normalized.resolved?.aliases) {
        for (const alias of normalized.resolved.aliases) {
          if (alias !== competitor.toLowerCase() && alias.length >= 3) {
            setCache(alias, card);
          }
        }
      }
    };

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
    const preprocessed = preprocess(rawContent, competitor);

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


    // RELEVANCE GATE
    const isRelevant = classification.category !== "non_bfsi";

    if (!isRelevant) {
      console.warn(`[Pipeline] RELEVANCE GATE: ${competitor} is non-BFSI — stopping generation`);
      const relevanceCard = buildRelevanceAssessmentBattlecard(competitor, classification);
      cacheWithAliases(relevanceCard);
      callbacks.onChunk(renderRelevanceAssessmentMarkdown(relevanceCard));
      callbacks.onComplete(relevanceCard);
      return;
    }

    // Derive basic signals for all relevant entities
    callbacks.onStageChange("deriving", "Deriving signals and citation mapping...");
    const { signals: rawSignals, sourceMap } = deriveSignals(preprocessed, citations, rawContent);

    // UNIFIED INTELLIGENCE PATH (for all relevant entities)
    callbacks.onStageChange("extracting", "Extracting strategic intelligence...");
    const strategy = getCategoryStrategy(classification.category);
    const extracted = await extract(preprocessed, competitor, strategy);

    callbacks.onStageChange("sentiment", "Extracting customer sentiment from verified sources...");
    const sentimentSignals = await extractSentimentSignals(rawContent, citations, competitor);
    const sentiment_analysis = await buildSentimentAnalysis(sentimentSignals, competitor);

    // Extract pricing evidence (company-specific)
    const pricing_evidence = extractPricingEvidence(preprocessed.pricing_candidates, citations);

    // Cluster strategic events
    const eventTypeToFamily: Record<string, string> = {
      LICENSE_ACTION: "Regulatory",
      REGULATORY_ENFORCEMENT: "Regulatory",
      STRATEGIC_RESTRUCTURE: "Strategic",
      FUNDING: "Funding",
      PRODUCT_LAUNCH: "Product",
      MARKET_EXPANSION: "Market",
      financial_result: "Financial Results",
      operational_incident: "Operational",
      leadership_change: "Leadership",
      compliance_event: "Compliance",
      unknown: "General",
    };

    const financialEvents = (extracted.recent_moves ?? []).map((m, i) => {
      const eventType = m.type as import("@/types/sentiment").FinancialEvent["type"];
      return {
        id: `event_${i}`,
        type: eventType,
        eventFamily: eventTypeToFamily[eventType] ?? "Strategic",
        date: m.date,
        headline: m.name,
        implications: m.strategic_relevance ? [m.strategic_relevance] : [],
        sources: [],
        confidence: "MEDIUM" as const,
        citationIds: [],
      };
    });
    const event_clusters = financialEvents.length > 0 ? clusterFinancialEvents(financialEvents) : [];

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

    // Derive AE Battlecard primitives
    const raw_ae_battlecard = deriveDealPrimitives(
      extracted,
      signals,
      citations,
      competitor,
      classification.category
    );

    // Apply confidence gating to deal primitives
    if (suppressObjections) {
      raw_ae_battlecard.persona_objections = [];
    }
    if (suppressVARS) {
      raw_ae_battlecard.quick_dismisses = [];
    }

    const ae_battlecard = sanitizeForAE(raw_ae_battlecard);

    callbacks.onStageChange("vars", "Generating category-aware VARS positioning...");

    // Deterministic VARS from extracted data, using Category Strategy Map for consistent semantics
    const vars_layer = {
      validate: extracted.VARS?.validate || extracted.positioning?.tagline || strategy.validate,
      acknowledge: extracted.VARS?.acknowledge || strategy.acknowledge,
      reframe: extracted.VARS?.reframe || strategy.reframe,
      specify: extracted.VARS?.specify || strategy.specify,
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
      relationshipMode: getRelationshipMode(classification.category),
      stackPosition: getStackPosition(classification.category),
      VARS_layer: vars_layer,
      objection_handling: [],
      AE_BATTLECARD: ae_battlecard,
      signals,
      sourceMap,
      citations: citations.slice(0, 6),
      confidence,
      dataGaps,
      // New structured fields (Steps 2-4)
      sentiment_analysis,
      pricing_evidence,
      event_clusters,
    };

    cacheWithAliases(battlecard);
    const markdown = renderMarkdown(battlecard);
    callbacks.onChunk(markdown);
    callbacks.onComplete(battlecard);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Pipeline] Pipeline error for ${competitor}: ${errorMessage}`);

    callbacks.onError(error instanceof Error ? error : new Error(errorMessage));

    // Return informative error card on error
    const errorCard = buildInsufficientDataBattlecard(competitor, 0, 0);
    errorCard.AE_BATTLECARD.company_overview = `PIPELINE ERROR: ${errorMessage}`;
    errorCard.positioning.tagline = `A technical error occurred while researching ${competitor}.`;
    
    callbacks.onChunk(renderMarkdown(errorCard));
    callbacks.onComplete(errorCard);
  }
}
