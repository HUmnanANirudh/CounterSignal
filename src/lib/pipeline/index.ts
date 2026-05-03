import type { Battlecard } from "@/types/battlecard";
import { search } from "./search";
import { preprocess, hasImplicitComplaints } from "./preprocess";
import { extract } from "./extract";
import { deriveSignals, calculateConfidence } from "./signals";
import { generateVarsAndObjections } from "./vars-objections";
import { renderMarkdown } from "./render";
import { sanitizeForAE } from "./sanitize";
import { detectCompetitorCategory, getPricingModelForCategory } from "./classify";
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

    console.log(`[Pipeline] Classification: ${classification.category} (confidence: ${classification.confidence.toFixed(2)}) - marketRole: ${classification.marketRole}`);

    // SUPPLY-SIDE PATH (issuers like NBFCs, FD providers)
    if (classification.marketRole === "supply_side") {
      console.log(`[Pipeline] ${competitor} is SUPPLY-SIDE (${classification.category}) — generating supply-side context`);

      // Import the supply side context generator
      const { generateSupplySideContext } = await import("./classify");
      const supplyContext = generateSupplySideContext(competitor, classification);

      const supplyCard: Battlecard = {
        competitor,
        generatedAt: new Date().toISOString(),
        researchDurationMs: Date.now() - startTime,
        positioning: {
          tagline: supplyContext.ae_positioning,
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
          validate: `${competitor} is a ${classification.category} — part of Blostem's product layer, not competition.`,
          acknowledge: `They offer products that Blostem can help distribute.`,
          reframe: `Partner with issuers like this, don't compete with them.`,
          specify: `Blostem infra can connect to multiple issuers, providing flexibility.`,
        },
        objection_handling: [],
        AE_BATTLECARD: {
          company_overview: supplyContext.classification,
          competitor_type: classification.category.toLowerCase() as CompetitorType,
          category_contrast: `${competitor} = product issuer (${classification.category}); Blostem = infra layer for BFSI products`,
          quick_dismisses: supplyContext.disqualify_questions.slice(0, 2),
          objection_handling: [],
          why_we_win: supplyContext.opportunity,
          why_we_lose: [],
          pricing_positioning: "Partnership model, not competition",
          landmines: supplyContext.disqualify_questions,
          FUD_responses: [],
          proof_points: supplyContext.what_they_offer,
          compete_aggressively_when: [],
          signal_trace: [],
        },
        sourceMap: {},
        citations: citations.slice(0, 6),
        confidence: { score: 0.8, factors: ["supply_side classification", `category: ${classification.category}`] },
        dataGaps: [],
      };

      setCache(competitor, supplyCard);
      const markdown = renderSupplySideContext(supplyContext);
      callbacks.onChunk(markdown);
      callbacks.onComplete(supplyCard);
      return;
    }

    // NON-COMPETITOR PATH (aggregators, brokers, lenders, insurtech)
    if (classification.marketRole === "non_competitor") {
      console.log(`[Pipeline] ${competitor} is NOT a competitor (${classification.category}) — generating strategic context`);

      const { generateStrategicContext } = await import("./classify");
      const strategicContext = generateStrategicContext(competitor, classification);

      const strategicCard: Battlecard = {
        competitor,
        generatedAt: new Date().toISOString(),
        researchDurationMs: Date.now() - startTime,
        positioning: {
          tagline: strategicContext.ae_positioning,
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
          validate: `${competitor} is a ${classification.category} — distribution layer, not infra competition.`,
          acknowledge: `They solve marketplace/distribution problems, different from BFSI infra.`,
          reframe: `Understand the layer difference — infra vs distribution.`,
          specify: strategicContext.ae_positioning,
        },
        objection_handling: [],
        AE_BATTLECARD: {
          company_overview: strategicContext.classification,
          competitor_type: classification.category.toLowerCase() as CompetitorType,
          category_contrast: `${competitor} = ${strategicContext.market_role}; Blostem = BFSI infrastructure layer`,
          quick_dismisses: strategicContext.disqualify_questions.slice(0, 2),
          objection_handling: [],
          why_we_win: strategicContext.partner_potential,
          why_we_lose: [],
          pricing_positioning: "Different category — not directly comparable",
          landmines: strategicContext.disqualify_questions,
          FUD_responses: [],
          proof_points: strategicContext.overlap,
          compete_aggressively_when: [],
          signal_trace: [],
        },
        sourceMap: {},
        citations: citations.slice(0, 6),
        confidence: { score: 0.7, factors: ["non-competitor classification", `category: ${classification.category}`] },
        dataGaps: ["non_competitor_category"],
      };

      setCache(competitor, strategicCard);
      const markdown = renderStrategicContext(strategicContext);
      callbacks.onChunk(markdown);
      callbacks.onComplete(strategicCard);
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

import type { SupplySideContext, StrategicContext } from "./classify";

function renderSupplySideContext(context: SupplySideContext): string {
  const lines: string[] = [];

  lines.push(`# ${context.competitor} — Supply-Side Context`);
  lines.push(`**Role:** PRODUCT ISSUER | **Category:** ${context.category}`);
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## What ${context.competitor} Offers`);
  for (const item of context.what_they_offer) {
    lines.push(`- ${item}`);
  }
  lines.push(``);
  lines.push(`## Why It Matters to Blostem`);
  for (const item of context.why_it_matters) {
    lines.push(`- ${item}`);
  }
  lines.push(``);
  lines.push(`## Opportunity`);
  for (const item of context.opportunity) {
    lines.push(`- ${item}`);
  }
  lines.push(``);
  lines.push(`## AE Positioning`);
  lines.push(`**${context.ae_positioning}**`);
  lines.push(``);
  lines.push(`## Disqualify Fast (For AE)`);
  for (const q of context.disqualify_questions) {
    lines.push(`- ${q}`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(`*This company is supply-side (product issuer), not a competitor. Use for partnership opportunities.*`);

  return lines.join("\n");
}

function renderStrategicContext(context: StrategicContext): string {
  const lines: string[] = [];

  lines.push(`# ${context.competitor} — Strategic Context`);
  lines.push(`**Role:** ${context.market_role.toUpperCase()} | **Category:** ${context.category}`);
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Where They Fit`);
  lines.push(`**${context.where_they_fit}**`);
  lines.push(``);
  lines.push(`## How They Overlap With Blostem`);
  for (const item of context.overlap) {
    lines.push(`- ${item}`);
  }
  lines.push(``);
  if (context.partner_potential.length > 0) {
    lines.push(`## Partnership Potential`);
    for (const item of context.partner_potential) {
      lines.push(`- ${item}`);
    }
    lines.push(``);
  }
  lines.push(`## AE Positioning`);
  lines.push(`**${context.ae_positioning}**`);
  lines.push(``);
  lines.push(`## Disqualify Fast (For AE)`);
  for (const q of context.disqualify_questions) {
    lines.push(`- ${q}`);
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(`*This company is not in Blostem's competitive set. Use the questions above to quickly qualify/dequalify opportunities.*`);

  return lines.join("\n");
}