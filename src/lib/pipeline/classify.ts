/**
 * classify.ts — Competitor type detection + market role classification
 *
 * Rule-based classification using generic category patterns only.
 * No hardcoded company names — works for any competitor.
 *
 * Market roles:
 * - COMPETITOR: direct substitute for Blostem (gateway, wallet, infra)
 * - NON_COMPETITOR: different category (broker, lender, aggregator)
 * - SUPPLY_SIDE: product issuers (NBFCs, FD providers)
 */

export type CompetitorCategory =
  | "PAYMENT_GATEWAY"
  | "WALLET"
  | "BANKING_API"
  | "BROKER"
  | "LENDER"
  | "AGGREGATOR"
  | "INSURTECH"
  | "ISSUER"
  | "UNKNOWN";

export type MarketRole = "competitor" | "non_competitor" | "supply_side";

interface ClassificationResult {
  category: CompetitorCategory;
  confidence: number;
  signals: string[];
  isCompetitor: boolean;
  marketRole: MarketRole;
  reasoning: string;
}

// Detection patterns — purely category-based, no hardcoded company names
const CATEGORY_PATTERNS: Record<CompetitorCategory, Array<{ pattern: RegExp; weight: number }>> = {
  PAYMENT_GATEWAY: [
    { pattern: /payment\s*gateway|merchant\s*payment|payment\s*processor|checkout\s*solution/i, weight: 1.0 },
    { pattern: /payment\s*orchestration|payment\s*stack|gateway\s*api/i, weight: 0.9 },
    { pattern: /cross[\s-]?border\s*payment\s*aggregator/i, weight: 0.8 },
    { pattern: /upi\s*gateway|card\s*processing/i, weight: 0.7 },
  ],
  WALLET: [
    { pattern: /digital\s*wallet|mobile\s*wallet|wallet\s*balance|prepaid\s*wallet/i, weight: 1.0 },
    { pattern: /payments?\s*bank|digital\s*payments\s*platform/i, weight: 0.85 },
    { pattern: /bill\s*payment|recharge|mobile\s*recharge/i, weight: 0.6 },
    { pattern: /qr\s*code\s*payment|upi\s*payment/i, weight: 0.5 },
  ],
  BANKING_API: [
    { pattern: /banking[\s-]?as[\s-]?a[\s-]?service|baas|banking\s*api|open\s*banking/i, weight: 1.0 },
    { pattern: /neobank|neo[\s-]?bank/i, weight: 0.7 },
    { pattern: /fd\s*api|rd\s*api|deposit\s*api/i, weight: 0.9 },
    { pattern: /current\s*account\s*api/i, weight: 0.6 },
  ],
  BROKER: [
    { pattern: /stockbroker|brokerage\s*platform|trading\s*platform|demat\s*account/i, weight: 1.0 },
    { pattern: /mutual\s*fund\s*investment|ipo\s*subscription|intraday\s*trading/i, weight: 0.8 },
    { pattern: /brokerage\s*charges|per\s*trade\s*fee|equity\s*trading/i, weight: 0.7 },
    { pattern: /derivative\s*trading|options\s*trading/i, weight: 0.6 },
  ],
  LENDER: [
    { pattern: /lending\s*platform|personal\s*loan|loan\s*app|business\s*loan/i, weight: 1.0 },
    { pattern: /credit\s*card|loan\s*disbursement/i, weight: 0.7 },
    { pattern: /loan\s*against\s*mutual\s*fund/i, weight: 0.8 },
    { pattern: /bnpl|buy\s*now\s*pay\s*later/i, weight: 0.7 },
  ],
  AGGREGATOR: [
    { pattern: /loan\s*marketplace|credit\s*marketplace|compare\s*(loans?|insurance|financial)/i, weight: 1.0 },
    { pattern: /financial\s*products?\s*(comparison|aggregator|marketplace)/i, weight: 0.95 },
    { pattern: /insurance\s*aggregator|insurance\s*comparison/i, weight: 0.9 },
    { pattern: /credit\s*score\s*service|free\s*credit\s*score/i, weight: 0.8 },
    { pattern: /rate\s*compare|loan\s*comparison|loan\s*quotes/i, weight: 0.75 },
    { pattern: /marketplace.*loan|loan.*marketplace|loan\s*partner/i, weight: 0.7 },
  ],
  INSURTECH: [
    { pattern: /insurtech|insurance\s*tech|insurance\s*platform/i, weight: 1.0 },
    { pattern: /life\s*insurance|term\s*insurance|health\s*insurance/i, weight: 0.5 },
    { pattern: /insurance\s*aggregator/i, weight: 0.6 },
  ],
  ISSUER: [
    { pattern: /fixed\s*deposit|FD\s*interest|FD\s*rates?|\d+[%\.]?\s*p\.?a\.?\s*FD/i, weight: 1.0 },
    { pattern: /recurring\s*deposit|RD\s*interest|RD\s*rates?/i, weight: 0.95 },
    { pattern: /nbfc.*deposit|deposit\s*taking.*nbfc/i, weight: 0.9 },
    { pattern: /crisil\s*rating|icra\s*rating|credit\s*rating.*nbfc/i, weight: 0.85 },
    { pattern: /deposit\s*products?|fd\s*products?|rd\s*products?/i, weight: 0.8 },
    { pattern: /housing\s*finance|home\s*loan|nbfc.*lending/i, weight: 0.75 },
    { pattern: /deposit\s*issuers?|fd\s*issuers?|nbfc.*issuer/i, weight: 0.7 },
  ],
  UNKNOWN: [],
};

// Categories that compete with Blostem (infra layer)
const COMPETITOR_CATEGORIES: CompetitorCategory[] = [
  "PAYMENT_GATEWAY",
  "WALLET",
  "BANKING_API",
];

// Categories that are supply-side (product issuers)
// These are partners/supply layer, not competitors
const SUPPLY_SIDE_CATEGORIES: CompetitorCategory[] = [
  "ISSUER",
];

// Categories that are non-competitors (different market segment)
const NON_COMPETITOR_CATEGORIES: CompetitorCategory[] = [
  "BROKER",
  "LENDER",
  "AGGREGATOR",
  "INSURTECH",
];

export function detectCompetitorCategory(
  competitorName: string,
  rawContent: string,
  tagline: string = ""
): ClassificationResult {
  const combined = `${tagline} ${rawContent} ${competitorName}`.toLowerCase();

  const scores: Record<CompetitorCategory, number> = {
    PAYMENT_GATEWAY: 0,
    WALLET: 0,
    BANKING_API: 0,
    BROKER: 0,
    LENDER: 0,
    AGGREGATOR: 0,
    INSURTECH: 0,
    ISSUER: 0,
    UNKNOWN: 0,
  };

  const signals: string[] = [];

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (category === "UNKNOWN") continue;

    for (const { pattern, weight } of patterns) {
      if (pattern.test(combined)) {
        scores[category as CompetitorCategory] += weight;
        signals.push(`${category}:${pattern.source}`);
      }
    }
  }

  let maxScore = 0;
  let maxCategory: CompetitorCategory = "UNKNOWN";

  for (const [category, score] of Object.entries(scores)) {
    if (category === "UNKNOWN") continue;
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category as CompetitorCategory;
    }
  }

  // Fallback: if UNKNOWN, try to infer best fit from signals
  if (maxCategory === "UNKNOWN" || maxScore < 0.6) {
    // Soft classification fallback for UNKNOWN
    const fallbackCategory = inferBestFitFromSignals(combined, competitorName);
    if (fallbackCategory !== "UNKNOWN") {
      maxCategory = fallbackCategory;
      maxScore = 0.5; // Lower confidence for fallback
      signals.push(`fallback:${fallbackCategory}`);
    }
  }

  const isCompetitor = COMPETITOR_CATEGORIES.includes(maxCategory) && maxScore >= 0.6;
  const isSupplySide = SUPPLY_SIDE_CATEGORIES.includes(maxCategory);
  const isNonCompetitor = NON_COMPETITOR_CATEGORIES.includes(maxCategory);

  let marketRole: MarketRole = "non_competitor";
  if (isCompetitor) marketRole = "competitor";
  else if (isSupplySide) marketRole = "supply_side";
  else if (isNonCompetitor) marketRole = "non_competitor";

  let reasoning = "";
  if (maxScore === 0) {
    reasoning = "No category signals detected — using fallback inference";
    // Infer anyway from company name patterns
    const inferred = inferBestFitFromSignals(combined, competitorName);
    if (inferred !== "UNKNOWN") {
      maxCategory = inferred;
      marketRole = SUPPLY_SIDE_CATEGORIES.includes(inferred) ? "supply_side" :
                   COMPETITOR_CATEGORIES.includes(inferred) ? "competitor" : "non_competitor";
      reasoning = `${inferred} inferred from context`;
    }
  } else if (isCompetitor) {
    reasoning = `${maxCategory} detected (score: ${maxScore.toFixed(1)}) — direct competitor`;
  } else if (isSupplySide) {
    reasoning = `${maxCategory} detected (score: ${maxScore.toFixed(1)}) — supply-side (partner)`;
  } else {
    reasoning = `${maxCategory} detected (score: ${maxScore.toFixed(1)}) — not a Blostem competitor`;
  }

  return {
    category: maxCategory,
    confidence: Math.min(maxScore, 1.0),
    signals: signals.slice(0, 5),
    isCompetitor,
    marketRole,
    reasoning,
  };
}

// Fallback inference when no category scores above threshold
function inferBestFitFromSignals(combined: string, competitorName: string): CompetitorCategory {
  const nameLower = competitorName.toLowerCase();

  // ISSUER signals: FD/NBFC providers
  if (/fixed\s*deposit|recurring\s*deposit|FD|RD|interest\s*rate/i.test(combined) ||
      /nbfc|housing\s*finance|deposit\s*taking/i.test(combined) ||
      /\d+\s*%\s*(p\.?a\.?|per\s*annum)/i.test(combined)) {
    return "ISSUER";
  }

  // AGGREGATOR signals: marketplace/comparison
  if (/loan\s*marketplace|credit\s*marketplace|compare\s*(loans?|insurance)/i.test(combined) ||
      /financial\s*products?\s*(comparison|aggregator)/i.test(combined) ||
      /credit\s*score\s*service/i.test(combined)) {
    return "AGGREGATOR";
  }

  // LENDER signals
  if (/lending|loan\s*app|personal\s*loan|business\s*loan|bnpl/i.test(combined)) {
    return "LENDER";
  }

  // PAYMENT_GATEWAY signals
  if (/payment\s*gateway|merchant\s*payment|upi\s*gateway|checkout/i.test(combined)) {
    return "PAYMENT_GATEWAY";
  }

  // WALLET signals
  if (/digital\s*wallet|mobile\s*wallet|prepaid\s*wallet|upi\s*payment/i.test(combined)) {
    return "WALLET";
  }

  // BROKER signals
  if (/stockbroker|brokerage|trading\s*platform|demat/i.test(combined)) {
    return "BROKER";
  }

  // INSURTECH signals
  if (/insurance|insurtech|policy/i.test(combined) && /marketplace|comparison|platform/i.test(combined)) {
    return "INSURTECH";
  }

  return "UNKNOWN";
}

export function isBlostemCompetitor(category: CompetitorCategory): boolean {
  return COMPETITOR_CATEGORIES.includes(category);
}

export function getPricingModelForCategory(category: CompetitorCategory): string {
  switch (category) {
    case "BROKER": return "brokerage (per-trade / zero-brokerage segments)";
    case "PAYMENT_GATEWAY": return "transaction + MDR + settlement-based (volume-linked)";
    case "WALLET": return "transaction + MDR + wallet-based";
    case "BANKING_API": return "subscription + usage-based (API calls)";
    case "LENDER": return "lending margin + transaction-based";
    case "AGGREGATOR": return "commission-based (CPA/CPL model)";
    case "ISSUER": return "interest spread + deposit margin (NBFC model)";
    case "INSURTECH": return "premium-based + commission";
    default: return "opaque";
  }
}

export interface SupplySideContext {
  competitor: string;
  category: CompetitorCategory;
  classification: string;
  what_they_offer: string[];
  why_it_matters_to_blostem: string[];
  opportunity: string[];
  ae_positioning: string;
  disqualify_questions: string[];
}

export function generateSupplySideContext(
  competitor: string,
  classification: ClassificationResult,
  _citations: Array<{ title: string; url: string; source: string }>
): SupplySideContext {
  const category = classification.category;

  const whatTheyOffer: Record<CompetitorCategory, string[]> = {
    ISSUER: [
      "Fixed deposits (FD) with competitive interest rates",
      "Recurring deposits (RD) for systematic savings",
      "Credit-rated instruments (CRISIL/ICRA rated)",
      "NBFC-backed deposit products",
      "Often partnered with wealth platforms for FD distribution",
    ],
    UNKNOWN: ["Financial products and services"],
    PAYMENT_GATEWAY: [],
    WALLET: [],
    BANKING_API: [],
    BROKER: [],
    LENDER: [],
    AGGREGATOR: [],
    INSURTECH: [],
  };

  const whyItMatters: Record<CompetitorCategory, string[]> = {
    ISSUER: [
      "Blostem can integrate with issuers like this to offer FD/RD products",
      "They are part of the product layer, not competition to infra",
      "Potential partnership for expanding Blostem's product catalog",
      "End customers may come through Blostem to access these products",
    ],
    UNKNOWN: ["May be relevant to Blostem's ecosystem"],
    PAYMENT_GATEWAY: [],
    WALLET: [],
    BANKING_API: [],
    BROKER: [],
    LENDER: [],
    AGGREGATOR: [],
    INSURTECH: [],
  };

  const opportunity: Record<CompetitorCategory, string[]> = {
    ISSUER: [
      "Partner with issuer to offer their FD/RD products via Blostem",
      "Expand product catalog through API integration with issuers",
      "Co-sell with issuer to wealth management platforms",
    ],
    UNKNOWN: ["Explore partnership opportunities"],
    PAYMENT_GATEWAY: [],
    WALLET: [],
    BANKING_API: [],
    BROKER: [],
    LENDER: [],
    AGGREGATOR: [],
    INSURTECH: [],
  };

  return {
    competitor,
    category,
    classification: "Supply-side (product issuer) — not a competitor",
    what_they_offer: whatTheyOffer[category] || ["Financial products"],
    why_it_matters_to_blostem: whyItMatters[category] || ["Part of the ecosystem"],
    opportunity: opportunity[category] || ["Explore integration"],
    ae_positioning: getAEPositioning(category),
    disqualify_questions: getSupplySideDisqualify(category),
  };
}

function getAEPositioning(category: CompetitorCategory): string {
  switch (category) {
    case "ISSUER":
      return "You don't compete with issuers like this — you integrate them. Position Blostem as the infra layer that can distribute their FD/RD products.";
    case "AGGREGATOR":
      return "You're solving distribution. Blostem sits underneath to power the products you distribute.";
    default:
      return "This company is part of the ecosystem, not a competitor.";
  }
}

function getSupplySideDisqualify(category: CompetitorCategory): string[] {
  switch (category) {
    case "ISSUER":
      return [
        "Are you building infrastructure to distribute FD/RD products?",
        "Do you need APIs to access multiple deposit products?",
        "Are you looking for a layer that can connect to multiple issuers?",
      ];
    case "AGGREGATOR":
      return [
        "Are you building a marketplace or the infra powering financial products?",
        "Do you need underlying products to populate your platform?",
      ];
    default:
      return [
        "Confirm what layer of the stack this company occupies relative to Blostem",
      ];
  }
}

export interface StrategicContext {
  competitor: string;
  category: CompetitorCategory;
  classification: string;
  market_role: string;
  where_they_fit: string;
  overlap: string[];
  partner_potential: string[];
  ae_positioning: string;
  disqualify_questions: string[];
}

export function generateStrategicContext(
  competitor: string,
  classification: ClassificationResult,
  _citations: Array<{ title: string; url: string; source: string }>
): StrategicContext {
  const category = classification.category;

  // AGGREGATOR-specific content
  const aggregatorReasons = [
    "Aggregators sit above the product layer — they distribute, not issue",
    "They depend on lenders/NBFCs/issuers underneath (potential Blostem customers)",
    "Different buyer: growth/experience teams vs BFSI infra teams",
    "Marketplace model vs infra layer — different problems solved",
  ];

  const aggregatorOverlaps = [
    "May compete for end-customer attention",
    "Could integrate infra providers like Blostem for product expansion",
    "Platform teams may need FD/RD APIs for savings features",
  ];

  const aggregatorPositioning = "If you're building a marketplace, you're not choosing infra — you're choosing what powers the products in your marketplace.";

  const aggregatorDisqualify = [
    "Are you building a marketplace or the infra powering financial products?",
    "Do you need underlying FD/RD/banking products for your platform?",
  ];

  const aggregatorPartner = [
    "Could be a distribution channel for Blostem-powered products",
    "Their platform could embed Blostem APIs for product features",
    "Potential co-sell to their platform customers",
  ];

  return {
    competitor,
    category,
    classification: "Non-competitor (marketplace/distribution layer)",
    market_role: "distribution_layer",
    where_they_fit: getStrategicWhereTheyFit(category),
    overlap: category === "AGGREGATOR" ? aggregatorOverlaps : getStrategicOverlap(category),
    partner_potential: category === "AGGREGATOR" ? aggregatorPartner : [],
    ae_positioning: category === "AGGREGATOR" ? aggregatorPositioning : getStrategicPositioning(category),
    disqualify_questions: category === "AGGREGATOR" ? aggregatorDisqualify : getStrategicDisqualify(category),
  };
}

function getStrategicWhereTheyFit(category: CompetitorCategory): string {
  switch (category) {
    case "BROKER": return "Customer-facing investing/trading platform";
    case "LENDER": return "Credit/lending platform";
    case "AGGREGATOR": return "Financial products marketplace (comparison/distribution)";
    case "INSURTECH": return "Insurance distribution platform";
    default: return "Distribution layer for financial products";
  }
}

function getStrategicOverlap(category: CompetitorCategory): string[] {
  switch (category) {
    case "BROKER":
      return ["Platform teams may need FD/RD APIs for savings features"];
    case "LENDER":
      return ["Could integrate FD/RD for lending against securities"];
    default:
      return ["Limited overlap with BFSI infra layer"];
  }
}

function getStrategicPositioning(category: CompetitorCategory): string {
  switch (category) {
    case "BROKER":
      return "If you're building infrastructure like brokerages use, you're not choosing a brokerage — you're choosing the layer underneath it.";
    case "LENDER":
      return "For deposit-backed lending products, you need BFSI infra, not just a lending platform.";
    default:
      return "Understand the category boundary — this company solves different problems than Blostem.";
  }
}

function getStrategicDisqualify(category: CompetitorCategory): string[] {
  switch (category) {
    case "BROKER":
      return [
        "Are you building a trading platform or BFSI infrastructure?",
        "Do you need FD/RD APIs for your product, or are you building brokerage features?",
      ];
    case "LENDER":
      return [
        "Are you building a lending product or BFSI infrastructure?",
        "Do you need deposit products (FD/RD) for your lending book?",
      ];
    default:
      return [
        "Confirm if this company overlaps with Blostem's target use case (BFSI infra for FD/RD/banking products)",
      ];
  }
}