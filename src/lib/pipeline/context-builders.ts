import type { Battlecard, VARSLayer } from "@/types/battlecard";
import { BLOSTEM_PROFILE } from "@/lib/blostem-profile";

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
  citations: Battlecard["citations"],
  signals: import("@/types/battlecard").Signal[] = []
): Battlecard {
  const vars_layer = buildSupplySideVARSLayer(competitor, category);
  
  // Basic universal derivation from signals
  const recent_moves = signals
    .filter(s => s.normalizedType === "market_move" || s.value.toLowerCase().includes("launch") || s.value.toLowerCase().includes("partnership"))
    .slice(0, 3)
    .map(s => ({
      name: s.summary || s.value.slice(0, 50),
      date: "Recent",
      type: "PRODUCT_LAUNCH" as const,
      strategic_relevance: s.value,
      impact: "medium" as const
    }));

  const positives = signals
    .filter(s => s.normalizedType === "success_metric" || s.value.toLowerCase().includes("positive"))
    .map(s => s.summary || s.value.slice(0, 80))
    .slice(0, 3);
  
  const negatives = signals
    .filter(s => s.normalizedType?.includes("complaint") || s.value.toLowerCase().includes("issue"))
    .map(s => s.summary || s.value.slice(0, 80))
    .slice(0, 3);

  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: Date.now() - startTime,
    positioning: {
      tagline: `${competitor} is a ${category} — product issuer, not infra competition`,
      targetSegments: [],
      differentiators: [],
    },
    pricing_posture: { model: "opaque", entryPrice: "opaque", tiers: [], opacity: "opaque" },
    recent_moves,
    customer_truths: { positives, negatives, keyComplaints: negatives },
    relationshipMode: "SUPPLY_SIDE_PARTNER",
    stackPosition: "issuer_layer",
    VARS_layer: vars_layer,
    objection_handling: [],
    AE_BATTLECARD: {
      company_overview: `${competitor} is a ${category.replace(/_/g, ' ')} entity acting as a product issuer/issuer partner within the BFSI ecosystem.`,
      competitor_type: category,
      category_contrast: `${competitor} = product issuer (${category}); Blostem = infra layer for BFSI products`,
      quick_dismisses: [`Is ${competitor} building BFSI infrastructure or selling financial products?`],
      objection_handling: [],
      why_we_win: [
        `Standardized orchestration layer for multiple asset issuers.`,
        `Unified digital distribution rails for regulated products.`
      ],
      why_we_lose: [`Technical or commercial misalignment on shared distribution models.`],
      pricing_positioning: "Partnership model, not competition",
      customer_sentiment: { positives, negatives },
      recent_launches: recent_moves,
      FUD_responses: [],
      proof_points: BLOSTEM_PROFILE.differentiators.slice(0, 2),
      compete_aggressively_when: [],
      signal_trace: signals.slice(0, 3).map(s => ({ signal: s.value.slice(0, 80), type: s.normalizedType || 'general', weapon: 'Strategic inference' })),
      persona_objections: [],
    },
    sourceMap: {},
    citations: citations.slice(0, 6),
    confidence: { 
      entityScore: 0.8, capabilityScore: 0.2, strategicScore: 0.4, marketScore: 0.5, evidenceScore: 0.3, overallScore: 0.4,
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
  
  // Universal derivation
  const recent_moves = signals
    .filter(s => s.normalizedType === "market_move" || s.value.toLowerCase().includes("launch"))
    .slice(0, 3)
    .map(s => ({
      name: s.summary || s.value.slice(0, 50),
      date: "Recent",
      type: "PRODUCT_LAUNCH" as const,
      strategic_relevance: s.value,
      impact: "medium" as const
    }));

  const positives = signals
    .filter(s => s.normalizedType === "success_metric" || s.value.toLowerCase().includes("positive"))
    .map(s => s.summary || s.value.slice(0, 80))
    .slice(0, 3);
  
  const negatives = signals
    .filter(s => s.normalizedType?.includes("complaint") || s.value.toLowerCase().includes("issue"))
    .map(s => s.summary || s.value.slice(0, 80))
    .slice(0, 3);

  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: Date.now() - startTime,
    positioning: {
      tagline: `${competitor} is a ${category.replace(/_/g, ' ')} provider at the distribution layer.`,
      targetSegments: [],
      differentiators: [],
    },
    pricing_posture: { model: "opaque", entryPrice: "opaque", tiers: [], opacity: "opaque" },
    recent_moves,
    customer_truths: { positives, negatives, keyComplaints: negatives },
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    VARS_layer: vars_layer,
    objection_handling: [],
    AE_BATTLECARD: {
      company_overview: `${competitor} is a ${category.replace(/_/g, ' ')} entity. It focuses on specialized market functions, distinct from Blostem's deep banking-product orchestration.`,
      competitor_type: category,
      category_contrast: `${competitor} = ${category.replace(/_/g, ' ')}; Blostem = infra layer (B2B API layer for FD/RD).`,
      quick_dismisses: [`Are you building user-facing features or backend banking infra?`],
      objection_handling: [],
      why_we_win: [
        `Blostem provides the cross-institution rails to scale yield products across any platform.`,
        `Unified orchestration vs one-off distribution silo.`
      ],
      why_we_lose: [],
      pricing_positioning: "Different layer in the value chain",
      customer_sentiment: { positives, negatives },
      recent_launches: recent_moves,
      FUD_responses: [],
      proof_points: BLOSTEM_PROFILE.differentiators.slice(0, 2),
      compete_aggressively_when: [],
      signal_trace: signals.slice(0, 3).map(s => ({ signal: s.value.slice(0, 80), type: s.normalizedType || 'general', weapon: 'Contextual signal' })),
      strategic_relationship: `${competitor} sits above Blostem in the stack — Blostem powers products like ${competitor}, not replaces them.`,
      persona_objections: [],
    },
    signals,
    sourceMap: {},
    citations: citations.slice(0, 6),
    confidence: { 
      entityScore: 0.7, capabilityScore: 0.3, strategicScore: 0.5, marketScore: 0.6, evidenceScore: 0.4, overallScore: 0.5,
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
    relationshipMode: "UNKNOWN",
    stackPosition: "unknown",
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
    relationshipMode: "INTERNAL_PROFILE",
    stackPosition: "infra_layer",
    sentiment_analysis: {
      totalSignals: 12,
      confidence: "HIGH",
      overallPolarity: "positive",
      evidenceSources: [{ domain: "internal", count: 12 }],
      clusters: [
        {
          topic: "reliability",
          polarity: "positive",
          pattern: "recurring",
          patternConfidence: "HIGH",
          frequency: 5,
          summary: "Core banking rails are cited for high uptime and transaction reliability.",
          evidence: "Standardized flows handle multi-bank reconciliation without failure.",
          signals: []
        },
        {
          topic: "onboarding",
          polarity: "positive",
          pattern: "recurring",
          patternConfidence: "HIGH",
          frequency: 4,
          summary: "Digital KYC and bank-onboarding workflows are fast and highly automated.",
          evidence: "Onboarding users to FDs across multiple banks is seamless.",
          signals: []
        },
        {
          topic: "api_quality",
          polarity: "positive",
          pattern: "emerging",
          patternConfidence: "MEDIUM",
          frequency: 3,
          summary: "Developer experience is highly rated due to standardized API structures.",
          evidence: "Integration with Coin was completed in record time.",
          signals: []
        }
      ],
      uniqueTopics: new Set(["reliability", "onboarding", "api_quality"]),
      gaps: []
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
  lines.push(`*Generated: ${new Date().toLocaleString()}*`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Company Snapshot`);
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

export function buildRelevanceAssessmentBattlecard(competitor: string, classification: any): Battlecard {
  return {
    competitor,
    generatedAt: new Date().toISOString(),
    researchDurationMs: 0,
    positioning: {
      tagline: `No meaningful overlap detected in BFSI infrastructure or fintech distribution.`,
      targetSegments: [],
      differentiators: [],
    },
    pricing_posture: { model: "N/A", entryPrice: "N/A", tiers: [], opacity: "opaque" },
    recent_moves: [],
    customer_truths: { positives: [], negatives: [], keyComplaints: [] },
    VARS_layer: { validate: "", acknowledge: "", reframe: "", specify: "" },
    objection_handling: [],
    relationshipMode: "INTEGRATION_TARGET", 
    stackPosition: "unknown",
    AE_BATTLECARD: {
      company_overview: `${competitor} is classified as ${classification.category}.`,
      competitor_type: classification.category,
      category_contrast: `Non-BFSI entity`,
      quick_dismisses: [],
      objection_handling: [],
      why_we_win: [],
      why_we_lose: [],
      pricing_positioning: "N/A",
      FUD_responses: [],
      proof_points: [],
      compete_aggressively_when: [],
      signal_trace: [],
      persona_objections: [],
    },
    sourceMap: {},
    citations: [],
    confidence: {
      entityScore: classification.confidence,
      capabilityScore: 0.0,
      strategicScore: 0.0,
      marketScore: 0.0,
      evidenceScore: 0.1,
      overallScore: classification.confidence * 0.2,
      factors: ["relevance_gate_failed", `category: ${classification.category}`]
    },
    dataGaps: ["non_relevant_vertical"],
  };
}

export function renderRelevanceAssessmentMarkdown(battlecard: Battlecard): string {
  const lines: string[] = [];
  lines.push(`# Relevance Assessment: ${battlecard.competitor}`);
  lines.push(`*Generated: ${new Date(battlecard.generatedAt).toLocaleString()}*`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Company Snapshot`);
  lines.push(battlecard.AE_BATTLECARD.company_overview || `${battlecard.competitor} is classified as ${battlecard.AE_BATTLECARD.competitor_type}.`);
  lines.push(``);
  lines.push(`## Relevance Assessment`);
  lines.push(`**Status:** NON-RELEVANT`);
  lines.push(`**Relationship:** No meaningful overlap detected in BFSI infrastructure or fintech distribution.`);
  lines.push(``);
  lines.push(`## Decision Reasoning`);
  lines.push(`- **Market Vertical:** Entity operates outside the core BFSI/Fintech infrastructure domain.`);
  lines.push(`- **Workflow Adjacency:** No shared banking or payment orchestration surfaces identified.`);
  lines.push(`- **Strategic Fit:** Does not meet criteria for competitive intelligence or ecosystem partnership.`);
  
  if (battlecard.citations?.length) {
    lines.push(``);
    lines.push(`## Sources & Evidence`);
    for (const cit of battlecard.citations.slice(0, 3)) {
      lines.push(`- [${cit.id}](${cit.url}) ${cit.title} (${cit.source})`);
    }
  }
  
  return lines.join("\n");
}

export function buildInvalidInputBattlecard(input: string): Battlecard {
  return {
    competitor: input,
    generatedAt: new Date().toISOString(),
    researchDurationMs: 0,
    positioning: {
      tagline: "Invalid company name detected. Input appears to be a question or search query.",
      targetSegments: [],
      differentiators: [],
    },
    pricing_posture: { model: "unknown", entryPrice: "unknown", tiers: [], opacity: "opaque" },
    recent_moves: [],
    customer_truths: { positives: [], negatives: [], keyComplaints: [] },
    relationshipMode: "UNKNOWN",
    stackPosition: "unknown",
    VARS_layer: {
      validate: "The input provided does not appear to be a specific company name.",
      acknowledge: "The system is designed for competitive intelligence on BFSI entities.",
      reframe: "Please enter a valid company name (e.g., 'Razorpay', 'Cashfree') for analysis.",
      specify: "Questions and general queries are not supported in this pipeline.",
    },
    objection_handling: [],
    AE_BATTLECARD: {
      company_overview: "The input provided appears to be a question or search query, not a company name.",
      competitor_type: "invalid_input",
      category_contrast: "N/A",
      quick_dismisses: [
        "Ensure you are entering a specific Company Name.",
        "Avoid questions like 'what do you think?' or 'how does it work?'.",
        "The system expects a noun (Company/Entity), not a sentence."
      ],
      objection_handling: [],
      why_we_win: [],
      why_we_lose: [],
      pricing_positioning: "N/A",
      FUD_responses: [],
      proof_points: [],
      compete_aggressively_when: [],
      signal_trace: [],
      persona_objections: [],
    },
    sourceMap: {},
    citations: [],
    confidence: { 
      entityScore: 0.0, capabilityScore: 0.0, strategicScore: 0.0, marketScore: 0.0, evidenceScore: 0.0, overallScore: 0.0,
      factors: ["invalid_input_detected"] 
    },
    dataGaps: ["invalid_input"],
  };
}

export function renderInvalidInputMarkdown(battlecard: Battlecard): string {
  const lines: string[] = [];
  lines.push(`# Invalid Input Detected`);
  lines.push(`*Generated: ${new Date(battlecard.generatedAt).toLocaleString()}*`);
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Input Received`);
  lines.push(`> ${battlecard.competitor}`);
  lines.push("");
  lines.push("## Why this happened");
  lines.push("The Battlecard Pipeline is an automated research engine designed for **Company/Entity Analysis**. It expects a specific company name as input.");
  lines.push("");
  lines.push("### What to do next");
  lines.push("- Enter a specific **Company Name** (e.g., 'Razorpay', 'M2P', 'Setu').");
  lines.push("- Avoid asking questions or entering search phrases.");
  lines.push("- If you are looking for Blostem's profile, enter 'Blostem'.");
  lines.push("");
  lines.push("---");
  lines.push("*Please enter a valid entity name to proceed.*");
  
  return lines.join("\n");
}
