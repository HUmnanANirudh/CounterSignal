/**
 * classify.ts — Competitor type detection + competition fit gate
 *
 * Rule-based classification using generic category patterns only.
 * No hardcoded company names — works for any competitor.
 */

export type CompetitorCategory =
  | "PAYMENT_GATEWAY"
  | "WALLET"
  | "BANKING_API"
  | "BROKER"
  | "LENDER"
  | "INSURTECH"
  | "NBFC"
  | "UNKNOWN";

interface ClassificationResult {
  category: CompetitorCategory;
  confidence: number;
  signals: string[];
  isCompetitor: boolean;
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
  NBFC: [
    { pattern: /nbfc|non[\s-]?banking\s*financial\s*company/i, weight: 1.0 },
    { pattern: /mudra\s*loan|msme\s*lending/i, weight: 0.6 },
    { pattern: /deposit\s*taking/i, weight: 0.5 },
  ],
  INSURTECH: [
    { pattern: /insurtech|insurance\s*tech|insurance\s*platform/i, weight: 1.0 },
    { pattern: /life\s*insurance|term\s*insurance|health\s*insurance/i, weight: 0.5 },
    { pattern: /insurance\s*aggregator/i, weight: 0.6 },
  ],
  UNKNOWN: [],
};

// Categories that compete with Blostem
const COMPETITOR_CATEGORIES: CompetitorCategory[] = [
  "PAYMENT_GATEWAY",
  "WALLET",
  "BANKING_API",
  "NBFC",
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
    NBFC: 0,
    INSURTECH: 0,
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
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category as CompetitorCategory;
    }
  }

  const isCompetitor = COMPETITOR_CATEGORIES.includes(maxCategory) && maxScore >= 0.6;

  let reasoning = "";
  if (maxScore === 0) {
    reasoning = "No category signals detected — unable to classify";
  } else if (isCompetitor) {
    reasoning = `${maxCategory} detected (score: ${maxScore.toFixed(1)}) — direct competitor`;
  } else if (maxCategory === "BROKER" || maxCategory === "LENDER" || maxCategory === "INSURTECH") {
    reasoning = `${maxCategory} detected — not a Blostem competitor`;
  } else {
    reasoning = `${maxCategory} detected (score: ${maxScore.toFixed(1)}) — below competitive threshold`;
  }

  return {
    category: maxCategory,
    confidence: Math.min(maxScore, 1.0),
    signals: signals.slice(0, 5),
    isCompetitor,
    reasoning,
  };
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
    case "NBFC": return "lending margin + regulatory overhead";
    case "INSURTECH": return "premium-based + commission";
    default: return "opaque";
  }
}

export interface NonCompetitorContext {
  competitor: string;
  category: CompetitorCategory;
  classification: string;
  why_not_competitor: string[];
  where_they_fit: string;
  how_they_overlap: string[];
  how_to_position_blostem: string;
  disqualify_fast: string[];
  signals: string[];
}

export function generateNonCompetitorContext(
  competitor: string,
  classification: ClassificationResult,
  _citations: Array<{ title: string; url: string; source: string }>
): NonCompetitorContext {
  const category = classification.category;

  const notCompetitorReasons: Record<CompetitorCategory, string[]> = {
    BROKER: [
      "Focuses on retail investing (stocks, derivatives) — not BFSI infrastructure",
      "Owns end-user relationship for trading — not an API/infra provider",
      "Different buyer persona: retail traders vs BFSI product teams",
    ],
    LENDER: [
      "Focuses on credit/lending products — not deposit/infrastructure",
      "Different regulatory path (lending vs banking infra)",
      "Different buyer: credit teams vs platform/infrastructure teams",
    ],
    INSURTECH: [
      "Focuses on insurance products — not BFSI infrastructure",
      "Different regulatory track (IRDAI vs RBI)",
      "Different product lifecycle and buyer persona",
    ],
    UNKNOWN: [
      "Cannot determine competitive overlap from available data",
      "Manual review recommended",
    ],
    PAYMENT_GATEWAY: [],
    WALLET: [],
    BANKING_API: [],
    NBFC: [],
  };

  const overlaps: Record<CompetitorCategory, string[]> = {
    BROKER: [
      "May use infrastructure providers behind the scenes (could be Blostem customer)",
      "Platform teams at brokerages may need FD/RD APIs for product features",
    ],
    LENDER: [
      "Could need deposit infrastructure for loan products",
      "May integrate FD/RD for lending against securities",
    ],
    INSURTECH: [
      "Insurance products may bundle savings components",
      "Could benefit from FD/RD infrastructure for premium financing",
    ],
    UNKNOWN: [],
    PAYMENT_GATEWAY: [],
    WALLET: [],
    BANKING_API: [],
    NBFC: [],
  };

  return {
    competitor,
    category,
    classification: "Not a direct competitor",
    why_not_competitor: notCompetitorReasons[category] || ["Unknown category — manual review needed"],
    where_they_fit: getWhereTheyFit(category),
    how_they_overlap: overlaps[category] || [],
    how_to_position_blostem: getHowToPosition(category),
    disqualify_fast: getDisqualifyFast(category),
    signals: classification.signals,
  };
}

function getWhereTheyFit(category: CompetitorCategory): string {
  switch (category) {
    case "BROKER": return "Customer-facing investing/trading platform";
    case "LENDER": return "Credit/lending platform";
    case "INSURTECH": return "Insurance distribution platform";
    case "UNKNOWN": return "Unable to determine";
    default: return "Unknown category";
  }
}

function getHowToPosition(category: CompetitorCategory): string {
  switch (category) {
    case "BROKER":
      return "If you're building infrastructure like brokerages use, you're not choosing a brokerage — you're choosing the layer underneath it.";
    case "LENDER":
      return "For deposit-backed lending products, you need BFSI infra, not just a lending platform.";
    case "INSURTECH":
      return "Insurance and BFSI infrastructure serve different buyers and use cases.";
    default:
      return "Understand the category boundary — this company solves different problems than Blostem.";
  }
}

function getDisqualifyFast(category: CompetitorCategory): string[] {
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
    case "INSURTECH":
      return [
        "Are you building insurance products or BFSI infrastructure?",
      ];
    default:
      return [
        "Confirm if this company overlaps with Blostem's target use case (BFSI infra for FD/RD/banking products)",
      ];
  }
}