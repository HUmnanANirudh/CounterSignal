import type { Battlecard, NonCompetitorContext } from "@/types/battlecard";
import { search } from "./search";
import { preprocess, hasImplicitComplaints } from "./preprocess";
import { extract } from "./extract";
import { deriveSignals, calculateConfidence } from "./signals";
import { generateVarsAndObjections } from "./vars-objections";
import { renderMarkdown } from "./render";
import { sanitizeForAE } from "./sanitize";
import { detectCompetitorCategory, generateNonCompetitorContext, getPricingModelForCategory } from "./classify";
import type { CompetitorCategory } from "./classify";
import { deriveDealPrimitives, type CompetitorType } from "./deal-primitives";

export interface PipelineCallbacks {
  onStageChange: (stage: PipelineStage, message: string) => void;
  onChunk: (markdown: string) => void;
  onComplete: (battlecard: Battlecard) => void;
  onError: (error: Error) => void;
}

export type PipelineStage =
  | "searching"
  | "classifying"
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

    callbacks.onStageChange("classifying", `Classifying ${competitor}...`);
    const preprocessed = preprocess(rawContent);
    const classification = detectCompetitorCategory(competitor, rawContent, preprocessed.pricing_candidates[0] || "");

    console.log(`[Pipeline] Classification: ${classification.category} (confidence: ${classification.confidence.toFixed(2)}) - isCompetitor: ${classification.isCompetitor}`);

    // NON-COMPETITOR PATH
    if (!classification.isCompetitor) {
      console.log(`[Pipeline] ${competitor} is NOT a competitor (${classification.category}) — generating non-competitor context`);

      const nonCompetitorContext = generateNonCompetitorContext(competitor, classification, citations);

      // Generate a minimal battlecard structure for non-competitors
      // This keeps the same output structure but with strategic context instead
      const minimalBattlecard: Battlecard = {
        competitor,
        generatedAt: new Date().toISOString(),
        researchDurationMs: Date.now() - startTime,
        positioning: {
          tagline: nonCompetitorContext.where_they_fit,
          targetSegments: [],
          differentiators: [],
        },
        pricing_posture: {
          model: getPricingModelForCategory(classification.category as CompetitorCategory),
          entryPrice: "opaque",
          tiers: [],
          opacity: "opaque",
        },
        recent_moves: [],
        customer_truths: {
          positives: [],
          negatives: [],
          keyComplaints: [],
        },
        VARS_layer: {
          validate: `${competitor} is a ${classification.category}, not a direct Blostem competitor.`,
          acknowledge: `${nonCompetitorContext.how_they_overlap.join(" ")}`,
          reframe: `${nonCompetitorContext.why_not_competitor.join(" ")}`,
          specify: nonCompetitorContext.how_to_position_blostem,
        },
        objection_handling: [],
        AE_BATTLECARD: {
          company_overview: nonCompetitorContext.classification,
          competitor_type: classification.category.toLowerCase() as CompetitorType,
          category_contrast: `${competitor} = ${classification.category}; Blostem = BFSI infrastructure layer`,
          quick_dismisses: nonCompetitorContext.disqualify_fast,
          objection_handling: [],
          why_we_win: [],
          why_we_lose: [],
          pricing_positioning: "Not applicable — different category",
          landmines: [],
          FUD_responses: [],
          proof_points: [],
          compete_aggressively_when: [],
          signal_trace: [],
        },
        sourceMap: {},
        citations: citations.slice(0, 6),
        confidence: { score: 0.7, factors: ["non-competitor classification", `category: ${classification.category}`] },
        dataGaps: ["non_competitor_category"],
      };

      setCache(competitor, minimalBattlecard as Battlecard);
      const markdown = renderNonCompetitorContext(nonCompetitorContext);
      callbacks.onChunk(markdown);
      callbacks.onComplete(minimalBattlecard as Battlecard);
      return;
    }

    // COMPETITOR PATH (original logic)
    callbacks.onStageChange("preprocessing", `Found ${citations.length} sources from ${debugInfo?.domainCount || 1} domains, preprocessing...`);

    if (preprocessed.pricing_candidates.length === 0) {
      dataGaps.push("pricing_not_found");
    }
    if (preprocessed.complaint_sentences.length === 0 && !hasImplicitComplaints(preprocessed)) {
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

    // If weak signals, disable generic VARS
    if (signals.length < 3) {
      console.log(`[Pipeline] Only ${signals.length} signals — disabling generic VARS, downgrading confidence`);
      dataGaps.push("weak_signals_low_confidence");
    }

    callbacks.onStageChange("primitives", "Generating deal primitives for AE use...");
    const raw_ae_battlecard = deriveDealPrimitives(extracted, signals, citations, competitor);
    const ae_battlecard = sanitizeForAE(raw_ae_battlecard);

    callbacks.onStageChange("vars", "Generating VARS positioning...");
    const { vars_layer, objection_handling } = await generateVarsAndObjections(
      extracted,
      signals,
      sourceMap,
      citations,
      competitor
    );

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
      objection_handling,
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
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}

function renderNonCompetitorContext(context: NonCompetitorContext): string {
  const lines: string[] = [];

  lines.push(`# ${context.competitor} — Strategic Context`);
  lines.push(`**Classification:** NOT A COMPETITOR | **Category:** ${context.category}`);
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Why ${context.competitor} Is Not a Competitor`);
  for (const reason of context.why_not_competitor) {
    lines.push(`- ${reason}`);
  }
  lines.push(``);
  lines.push(`## Where They Fit`);
  lines.push(`**${context.where_they_fit}**`);
  lines.push(``);

  if (context.how_they_overlap.length > 0) {
    lines.push(`## How They Might Overlap (Weak)`);
    for (const overlap of context.how_they_overlap) {
      lines.push(`- ${overlap}`);
    }
    lines.push(``);
  }

  lines.push(`## How to Position Blostem`);
  lines.push(`${context.how_to_position_blostem}`);
  lines.push(``);

  lines.push(`## Disqualify Fast (For AE)`);
  for (const q of context.disqualify_fast) {
    lines.push(`- ${q}`);
  }
  lines.push(``);

  lines.push(`---`);
  lines.push(`*This company is not in Blostem's competitive set. Use the questions above to quickly qualify/dequalify opportunities.*`);

  return lines.join("\n");
}