import type { Battlecard, VARSLayer } from "@/types/battlecard";
import { blostemProfile } from "@/lib/blostem-profile";
import { getPricingModelForCategory } from "./classify";

export function buildSupplySideVARSLayer(competitor: string, category: string): VARSLayer {
  return {
    validate: `${competitor} is a ${category} — part of ${blostemProfile.name}'s product layer, not competition.`,
    acknowledge: `They offer products that ${blostemProfile.name} can help distribute.`,
    reframe: blostemProfile.VARS_context.reframe,
    specify: `${blostemProfile.name} infra can connect to multiple issuers, providing flexibility.`,
  };
}

export function buildNonCompetitorVARSLayer(competitor: string, category: string): VARSLayer {
  return {
    validate: `${competitor} is a ${category} — distribution layer, not infra competition.`,
    acknowledge: `They solve marketplace/distribution problems, different from BFSI infra.`,
    reframe: `Understand the layer difference — infra vs distribution.`,
    specify: blostemProfile.VARS_context.specify,
  };
}

export function buildSupplySideBattlecard(
  competitor: string,
  category: string,
  startTime: number,
  citations: Battlecard["citations"]
): Battlecard {
  const vars_layer = buildSupplySideVARSLayer(competitor, category);
  const pricing_model = getPricingModelForCategory(category as any);

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
      why_we_win: blostemProfile.strengths.slice(0, 2),
      why_we_lose: [],
      pricing_positioning: "Partnership model, not competition",
      landmines: [
        "What products does this issuer offer?",
        "Do they have API access for partners?",
        "How do they handle compliance for distribution?",
      ],
      FUD_responses: [],
      proof_points: blostemProfile.differentiators.slice(0, 2),
      compete_aggressively_when: [],
      signal_trace: [],
    },
    sourceMap: {},
    citations: citations.slice(0, 6),
    confidence: { score: 0.8, factors: ["supply_side classification", `category: ${category}`] },
    dataGaps: [],
  };
}

export function buildNonCompetitorBattlecard(
  competitor: string,
  category: string,
  startTime: number,
  citations: Battlecard["citations"]
): Battlecard {
  const vars_layer = buildNonCompetitorVARSLayer(competitor, category);
  const pricing_model = getPricingModelForCategory(category as any);

  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: Date.now() - startTime,
    positioning: {
      tagline: `${competitor} - ${category}, not in Blostem's competitive set`,
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
      company_overview: `${competitor} - ${category}, different layer than Blostem`,
      competitor_type: category,
      category_contrast: `${competitor} = non-competitor; Blostem = BFSI infrastructure layer`,
      quick_dismisses: [
        `Is ${competitor} providing BFSI infrastructure APIs or just a product/app?`,
        `Do they handle compliance for multiple banks/NBFCs?`,
      ],
      objection_handling: [],
      why_we_win: blostemProfile.strengths.slice(0, 2),
      why_we_lose: [],
      pricing_positioning: "Different category — not directly comparable",
      landmines: [
        "What layer does this company operate at?",
        "Do they provide APIs for banking products?",
        "How do they handle BFSI compliance?",
      ],
      FUD_responses: [],
      proof_points: blostemProfile.differentiators.slice(0, 2),
      compete_aggressively_when: [],
      signal_trace: [],
    },
    sourceMap: {},
    citations: citations.slice(0, 6),
    confidence: { score: 0.7, factors: ["non-competitor classification", `category: ${category}`] },
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

export function buildInternalProfileBattlecard(competitor: string): Battlecard {
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

export function renderInternalProfileMarkdown(competitor: string): string {
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

export function isInternalCompany(competitor: string): boolean {
  return competitor.toLowerCase() === "blostem";
}
