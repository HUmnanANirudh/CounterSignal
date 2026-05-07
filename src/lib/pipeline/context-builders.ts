import type { Battlecard, VARSLayer } from "@/types/battlecard";
import { BLOSTEM_PROFILE } from "@/lib/blostem-profile";
import { getPricingModelForCategory } from "./classify";

export function buildSupplySideVARSLayer(competitor: string, category: string): VARSLayer {
  return {
    validate: `${competitor} is a ${category} — part of ${BLOSTEM_PROFILE.name}'s product layer, not competition.`,
    acknowledge: `They offer products that ${BLOSTEM_PROFILE.name} can help distribute.`,
    reframe: `Blostem is the payment aggregator for banking products — we handle infra so you can focus on distribution.`,
    specify: `${BLOSTEM_PROFILE.name} infra can connect to multiple issuers, providing flexibility.`,
  };
}

export function buildNonCompetitorVARSLayer(competitor: string, category: string): VARSLayer {
  return {
    validate: `Prospects mention ${competitor} when they want to build a ${category} product or use it as a benchmark.`,
    acknowledge: `${competitor} is a strong ${category} platform with excellent scale and UX.`,
    reframe: `${competitor} is an end-user product — it doesn't help you build your own financial stack.`,
    specify: `Blostem gives you the infra layer to launch ${competitor}-like capabilities with FD/RD built in.`,
  };
}

export function buildSupplySideBattlecard(
  competitor: string,
  category: string,
  startTime: number,
  citations: Battlecard["citations"]
): Battlecard {
  const vars_layer = buildSupplySideVARSLayer(competitor, category);
  const pricing_model = getPricingModelForCategory(
    category as Parameters<typeof getPricingModelForCategory>[0]
  );

  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: Date.now() - startTime,
    positioning: {
      tagline: `${competitor} is a ${category} — product issuer, not infra competition`,
      targetSegments: [],
      differentiators: [],
    },
    pricing_posture: {
      model: pricing_model,
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
    VARS_layer: vars_layer,
    objection_handling: [],
    AE_BATTLECARD: {
      company_overview: `${competitor} - ${category} supply-side entity`,
      competitor_type: category,
      category_contrast: `${competitor} = product issuer (${category}); Blostem = infra layer for BFSI products`,
      quick_dismisses: [
        `Is ${competitor} building BFSI infrastructure or selling financial products?`,
        `Does ${competitor} provide APIs or own the products?`,
      ],
      objection_handling: [],
      why_we_win: BLOSTEM_PROFILE.core_capabilities.slice(0, 2),
      why_we_lose: [],
      pricing_positioning: "Partnership model, not competition",
      FUD_responses: [],
      proof_points: BLOSTEM_PROFILE.differentiators.slice(0, 2),
      compete_aggressively_when: [],
      signal_trace: [],
      persona_objections: [],
    },
    sourceMap: {},
    citations: citations.slice(0, 6),
    confidence: { 
      entityScore: 0.8, 
      capabilityScore: 0.2,
      strategicScore: 0.4, 
      marketScore: 0.5,
      evidenceScore: 0.3,
      overallScore: 0.4,
      factors: ["supply_side classification", `category: ${category}`] 
    },
    dataGaps: [],
  };
}

export function buildNonCompetitorBattlecard(
  competitor: string,
  category: string,
  startTime: number,
  citations: Battlecard["citations"],
  signals: import("@/types/battlecard").Signal[] = []
): Battlecard {
  const vars_layer = buildNonCompetitorVARSLayer(competitor, category);
  const pricing_model = getPricingModelForCategory(
    category as Parameters<typeof getPricingModelForCategory>[0]
  );

  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: Date.now() - startTime,
    positioning: {
      tagline: `${competitor} is a retail brokerage/platform (stocks/MF). It does not provide APIs for embedding FD/RD products into third-party apps. If you're building a fintech product, ${competitor} is a distribution endpoint, not infrastructure.`,
      targetSegments: [],
      differentiators: [],
    },
    pricing_posture: {
      model: pricing_model,
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
    VARS_layer: vars_layer,
    objection_handling: [],
    AE_BATTLECARD: {
      company_overview: `${competitor} is a ${category} (end-user app layer). It does not provide APIs for embedding FD/RD products into third-party apps.`,
      competitor_type: category,
      category_contrast: `${competitor} = ${category} (end-user app layer); Blostem = infra layer (B2B API layer for FD/RD). Blostem can power platforms like ${competitor}, not compete with them.`,
      quick_dismisses: [
        `Are you building a user-facing investment app or backend banking infra?`,
        `Are you looking for APIs to embed banking products, or an app to list them on?`
      ],
      objection_handling: [],
      why_we_win: [
        `${competitor} does not expose infrastructure APIs — Blostem lets you build a ${competitor}-like product with embedded FD/RD.`,
        `Blostem provides the backend rails that power ${category} platforms, rather than competing for end-users.`
      ],
      why_we_lose: [],
      pricing_positioning: "Different layer in the value chain",
      FUD_responses: [],
      proof_points: BLOSTEM_PROFILE.differentiators.slice(0, 2),
      compete_aggressively_when: [],
      signal_trace: signals.slice(0, 3).map(s => ({ signal: s.value.slice(0, 80), type: s.normalizedType || 'general', weapon: 'Contextual signal' })),
      strategic_relationship: `${competitor} sits above Blostem in the stack — Blostem powers products like ${competitor}, not replaces them.`,
      why_this_appears_in_deals: [
        `Prospect is confusing "platform" with "infrastructure"`,
        `They are thinking of ${competitor} as a benchmark UX/product`,
        `They are early-stage and not infra-aware yet`
      ],
      do_not_compete_when: [
        `Prospect explicitly wants a retail brokerage/wealth platform`,
        `They are not building infrastructure`
      ],
      persona_objections: [],
    },
    signals,
    sourceMap: {},
    citations: citations.slice(0, 6),
    confidence: { 
      entityScore: 0.7, 
      capabilityScore: 0.3,
      strategicScore: 0.5, 
      marketScore: 0.6,
      evidenceScore: 0.4,
      overallScore: 0.5,
      factors: ["non-competitor classification", `category: ${category}`] 
    },
    dataGaps: ["non_competitor_category"],
  };
}

export function buildInsufficientDataBattlecard(
  competitor: string,
  relevantCount: number,
  totalCount: number
): Battlecard {
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
      FUD_responses: [],
      proof_points: [],
      compete_aggressively_when: [],
      signal_trace: [],
      persona_objections: [],
    },
    sourceMap: {},
    citations: [],
    confidence: { 
      entityScore: 0.15, 
      capabilityScore: 0.05,
      strategicScore: 0.05, 
      marketScore: 0.1,
      evidenceScore: 0.1,
      overallScore: 0.1,
      factors: [`entity_grounding_failed: ${relevantCount}/${totalCount} relevant docs`] 
    },
    dataGaps: ["insufficient_entity_data", `relevant_docs_${relevantCount}_of_${totalCount}`],
  };
}

export function buildInternalProfileBattlecard(competitor: string): Battlecard {
  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: 0,
    positioning: {
      tagline: "Payment aggregator equivalent for banking products (standardized FD/RD flows)",
      targetSegments: [...BLOSTEM_PROFILE.market_context.target_segments],
      differentiators: [...BLOSTEM_PROFILE.differentiators],
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
        "Single platform for multi-bank FD/RD onboarding & booking",
        "Eliminates the need for custom integrations with individual banks",
        "Standardized servicing and reconciliation flow for banking products",
        "Partner network of banks and NBFCs for regulated asset access",
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
      why_we_win: [...BLOSTEM_PROFILE.core_capabilities],
      why_we_lose: [],
      pricing_positioning: "B2B SaaS pricing — transparent costs, no hidden fees, predictable for partners",
      FUD_responses: [],
      proof_points: [...BLOSTEM_PROFILE.differentiators],
      compete_aggressively_when: [],
      signal_trace: [],
      persona_objections: [],
    },
    sourceMap: {},
    citations: [],
    confidence: { 
      entityScore: 1.0, 
      capabilityScore: 1.0,
      strategicScore: 1.0, 
      marketScore: 1.0,
      evidenceScore: 1.0,
      overallScore: 1.0,
      factors: ["internal_profile", "blostem_reference"] 
    },
    dataGaps: [],
  };
}

export function renderInternalProfileMarkdown(competitor: string): string {
  const lines: string[] = [];

  lines.push(`# ${competitor} — INTERNAL PROFILE`);
  lines.push(`**Role:** YOUR COMPANY | **Category:** BFSI Infrastructure`);
  lines.push(`**Generated:** ${new Date().toLocaleString()}`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## What ${competitor} Does`);
  lines.push(`${BLOSTEM_PROFILE.description}`);
  lines.push(``);
  lines.push(`## Core Capabilities`);
  for (const item of BLOSTEM_PROFILE.core_capabilities) {
    lines.push(`- ${item}`);
  }
  lines.push(``);
  lines.push(`## Key Differentiators`);
  for (const item of BLOSTEM_PROFILE.differentiators) {
    lines.push(`- ${item}`);
  }
  lines.push(``);
  lines.push(`## Market Positioning`);
  lines.push(`- **Category:** ${BLOSTEM_PROFILE.market_context.category}`);
  lines.push(`- **Comparison:** ${BLOSTEM_PROFILE.market_context.comparison}`);
  lines.push(``);
  lines.push(`## Social Proof`);
  lines.push(`- **Backing:** ${BLOSTEM_PROFILE.market_context.backing}`);
  lines.push(`- **Partnership:** Zerodha / Rainmatter`);
  lines.push(``);
  lines.push(`## VARS Positioning`);
  lines.push(`**Validate:** Blostem provides standardized infra for regulated banking products.`);
  lines.push(`**Acknowledge:** Deep integration with multiple banks handles reconciliation and KYC.`);
  lines.push(`**Reframe:** Banking products deserve the same unified rails as payments.`);
  lines.push(`**Specify:** Single API access to FD/RD booking and servicing.`);
  lines.push(``);
  lines.push(`---`);
  lines.push(`*This is Blostem's internal profile — use for reference, not competitive intelligence.*`);

  return lines.join("\n");
}

export function isInternalCompany(competitor: string): boolean {
  const lower = competitor.toLowerCase();
  return lower === "blostem" || lower === "rainmatter";
}
