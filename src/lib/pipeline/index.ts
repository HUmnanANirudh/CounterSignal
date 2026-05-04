import type { Battlecard } from "@/types/battlecard";
import { search } from "./search";
import type { SearchResult } from "./search";
import { preprocess, hasImplicitComplaints } from "./preprocess";
import { extract } from "./extract";
import { deriveSignals, calculateConfidence } from "./signals";
import { generateVarsAndObjections } from "./vars-objections";
import { renderMarkdown } from "./render";
import { sanitizeForAE } from "./sanitize";
import { detectCompetitorCategory, getPricingModelForCategory } from "./classify";
import type { CompetitorCategory } from "./classify";
import { deriveDealPrimitives, type CompetitorType } from "./deal-primitives";
import { blostemProfile } from "@/lib/blostem-profile";

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

// FALLBACK BATTLECARD: Always return a battlecard, never crash
function fallbackBattlecard(competitor: string, reason: string): Battlecard {
  console.warn(`[Pipeline] Using fallback battlecard for ${competitor}: ${reason}`);

  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: 0,
    positioning: {
      tagline: `${competitor} operates in fintech. Limited public data available for analysis.`,
      targetSegments: [],
      differentiators: [],
    },
    pricing_posture: {
      model: "opaque",
      entryPrice: "unknown",
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
      validate: `Teams evaluate ${competitor} for their fintech needs.`,
      acknowledge: `${competitor} likely provides baseline capabilities in their space.`,
      reframe: `Without clear pricing or feature data, risk at scale is elevated.`,
      specify: `Blostem offers structured BFSI infrastructure with predictable behavior and transparent compliance.`,
    },
    objection_handling: [],
    AE_BATTLECARD: {
      company_overview: `${competitor} - limited public data. Recommend direct research for accurate positioning.`,
      competitor_type: "unknown",
      category_contrast: `${competitor} = unknown category; Blostem = BFSI infrastructure layer`,
      quick_dismisses: [
        `Is ${competitor} building BFSI infrastructure or a product layer?`,
        `Does ${competitor} own financial products (FD/loans) or provide rails?`,
      ],
      objection_handling: [],
      why_we_win: [
        "Blostem provides standardized BFSI infra with compliance built-in",
        "Single API for multi-bank FD/RD access",
        "Proven integration with platforms like Zerodha",
      ],
      why_we_lose: [],
      pricing_positioning: "Unknown - Blostem offers transparent infrastructure pricing",
      landmines: [
        "What specific rails (AA, UPI, mandates) does this company provide?",
        "Does this company own the FD/loan products or just provide access?",
        "How do they handle compliance across multiple banks?",
      ],
      FUD_responses: [],
      proof_points: [
        "Standardized API across multiple banks",
        "Compliance-handled infrastructure",
        "Partner network of banks and NBFCs",
      ],
      compete_aggressively_when: [
        "Prospect complains about point-to-point bank integrations",
        "Prospect wants to launch FD products quickly",
        "Prospect values standardization over customization",
      ],
      signal_trace: [],
    },
    sourceMap: {},
    citations: [],
    confidence: { score: 0.3, factors: ["fallback_data", "limited_public_data"] },
    dataGaps: ["limited_data", "fallback_used"],
  };
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

    // ENTITY CONFIDENCE CHECK: Fail fast if entity grounding is weak
    const entityConfidence = debugInfo?.entityConfidence ?? 0.5;
    if (entityConfidence < 0.3) {
      console.warn(`[Pipeline] LOW ENTITY CONFIDENCE (${entityConfidence}) — insufficient relevant docs about ${competitor}`);
      const insufficientCard = generateInsufficientDataCard(competitor, debugInfo);
      callbacks.onChunk(renderMarkdown(insufficientCard));
      callbacks.onComplete(insufficientCard);
      return;
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

    // SELF-COMPANY PATH: Blostem is internal, not a competitor or partner
    if (competitor.toLowerCase() === "blostem") {
      const internalCard = generateInternalProfile(competitor);
      setCache(competitor, internalCard);
      callbacks.onChunk(renderInternalProfile(competitor));
      callbacks.onComplete(internalCard);
      return;
    }

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
    console.error(`[Pipeline] Pipeline error for ${competitor}: ${error instanceof Error ? error.message : String(error)}`);
    const fallback = fallbackBattlecard(competitor, error instanceof Error ? error.message : String(error));
    callbacks.onChunk(renderMarkdown(fallback));
    callbacks.onComplete(fallback);
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

// INTERNAL PROFILE: Blostem is the reference frame, not a competitor
function generateInternalProfile(competitor: string): Battlecard {
  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: 0,
    positioning: {
      tagline: "Banking infrastructure layer for regulated products (FDs, RDs, credit)",
      targetSegments: [...blostemProfile.icp],
      differentiators: [...blostemProfile.differentiators],
    },
    pricing_posture: {
      model: "B2B SaaS (opaque)",
      entryPrice: "not publicly disclosed",
      tiers: [],
      opacity: "opaque",
    },
    recent_moves: [],
    customer_truths: {
      positives: [
        "Single API for multi-bank FD/RD access",
        "Standardized onboarding, booking, and servicing flow",
        "Purpose-built for compliance with regulatory requirements",
        "Partner network of banks and NBFCs",
        "Trusted by Zerodha — integrating FD on Coin",
        "Backed by Rainmatter (Zerodha's VC arm)",
      ],
      negatives: [],
      keyComplaints: [],
    },
    VARS_layer: {
      validate: "Blostem is your company — internal reference, not competitive intelligence.",
      acknowledge: "Blostem provides banking infrastructure for FDs and RDs.",
      reframe: "Use Blostem's profile to understand your own positioning.",
      specify: "Blostem: payment aggregator equivalent for banking products, backed by Rainmatter.",
    },
    objection_handling: [],
    AE_BATTLECARD: {
      company_overview: `INTERNAL — ${competitor} is your company, not a competitor. Use this profile as reference.`,
      competitor_type: "infra",
      category_contrast: `${competitor} = BFSI infrastructure layer (your company)`,
      quick_dismisses: [],
      objection_handling: [],
      why_we_win: [...blostemProfile.strengths],
      why_we_lose: [],
      pricing_positioning: "B2B SaaS pricing — transparent costs, no hidden fees, predictable for partners",
      landmines: [],
      FUD_responses: [],
      proof_points: [...blostemProfile.differentiators],
      compete_aggressively_when: [],
      signal_trace: [],
    },
    sourceMap: {},
    citations: [],
    confidence: { score: 1.0, factors: ["internal_profile", "blostem_reference"] },
    dataGaps: [],
  };
}

function renderInternalProfile(competitor: string): string {
  const lines: string[] = [];

  lines.push(`# ${competitor} — INTERNAL PROFILE`);
  lines.push(`**Role:** YOUR COMPANY | **Category:** BFSI Infrastructure`);
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## What ${competitor} Does`);
  lines.push(`${blostemProfile.description}`);
  lines.push(``);
  lines.push(`## Product Offerings`);
  for (const item of blostemProfile.product.offerings) {
    lines.push(`- ${item}`);
  }
  lines.push(``);
  lines.push(`## Key Differentiators`);
  for (const item of blostemProfile.differentiators) {
    lines.push(`- ${item}`);
  }
  lines.push(``);
  lines.push(`## Target Problems Solved`);
  for (const item of blostemProfile.target_problems) {
    lines.push(`- ${item}`);
  }
  lines.push(``);
  lines.push(`## Social Proof`);
  lines.push(`- **Investor:** ${blostemProfile.social_proof.investor}`);
  lines.push(`- **Integration Partner:** ${blostemProfile.social_proof.integration_partner}`);
  lines.push(`- **Quote:** "${blostemProfile.social_proof.quote}"`);
  lines.push(``);
  lines.push(`## VARS Positioning`);
  lines.push(`**Validate:** ${blostemProfile.VARS_context.validate}`);
  lines.push(`**Acknowledge:** ${blostemProfile.VARS_context.acknowledge}`);
  lines.push(`**Reframe:** ${blostemProfile.VARS_context.reframe}`);
  lines.push(`**Specify:** ${blostemProfile.VARS_context.specify}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(`*This is Blostem's internal profile — use for reference, not competitive intelligence.*`);

  return lines.join("\n");
}

// INSUFFICIENT DATA CARD: Entity grounding failed — honest "no data" response
function generateInsufficientDataCard(competitor: string, debugInfo?: SearchResult["debugInfo"]): Battlecard {
  const relevantCount = debugInfo?.relevantResults ?? 0;
  const totalCount = debugInfo?.totalResults ?? 0;

  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: 0,
    positioning: {
      tagline: `Insufficient reliable data about ${competitor}. No entity-grounded sources found.`,
      targetSegments: [],
      differentiators: [],
    },
    pricing_posture: {
      model: "unknown",
      entryPrice: "unknown",
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
      validate: `Could not find sufficient information about ${competitor} to generate meaningful positioning.`,
      acknowledge: `Limited public data available for this entity.`,
      reframe: `Do not use generic assumptions — requires direct research.`,
      specify: `Verify entity existence and sector before proceeding with competitive analysis.`,
    },
    objection_handling: [],
    AE_BATTLECARD: {
      company_overview: `INSUFFICIENT DATA — only ${relevantCount}/${totalCount} sources mention "${competitor}". Cannot generate reliable battlecard.`,
      competitor_type: "unknown",
      category_contrast: `Insufficient entity grounding for classification`,
      quick_dismisses: [
        "Confirm the company name is correct and spelled accurately",
        "Verify this is an Indian fintech company (Blostem's target market)",
        "Check if company has public web presence or news coverage",
      ],
      objection_handling: [],
      why_we_win: [],
      why_we_lose: [],
      pricing_positioning: "Insufficient data",
      landmines: [
        "What exact products/services does this company offer?",
        "What is their target market and customer segment?",
        "Do they have API/developer documentation?",
      ],
      FUD_responses: [],
      proof_points: [],
      compete_aggressively_when: [],
      signal_trace: [],
    },
    sourceMap: {},
    citations: [],
    confidence: { score: 0.15, factors: [`entity_grounding_failed: ${relevantCount}/${totalCount} relevant docs`] },
    dataGaps: ["insufficient_entity_data", `relevant_docs_${relevantCount}_of_${totalCount}`],
  };
}