/**
 * classify.ts — Competitor type detection + market role classification
 *
 * Business model classification with capability detection:
 * - INFRA: API/SDK rails for BFSI (account aggregator, UPI stack, mandate APIs)
 * - PAYMENT_GATEWAY: Payment processing (gateway, checkout, merchant payments)
 * - WALLET: Digital wallet (mobile wallet, prepaid wallet, recharge)
 * - ISSUER: FD/RD/NBFC product issuers (fixed deposit, recurring deposit)
 * - AGGREGATOR: Marketplace/distribution (loan marketplace, comparison)
 * - END_PRODUCT: Neobank/business banking app (current account, neobank)
 * - BROKER: Trading/investing (stockbroker, demat, trading platform)
 *
 * Precedence: INFRA > ISSUER > PAYMENT_GATEWAY > WALLET > END_PRODUCT > AGGREGATOR > BROKER
 *
 * Key distinction: WHO OWNS THE FINANCIAL PRODUCT
 * - Issuer: YES (FD, loans)
 * - Infra: NO (just provides API rails)
 * - Distribution: NO (just sells/aggregates)
 * - End product: NO (just UI, product is elsewhere)
 */

export type CompetitorCategory =
  | "INFRA_LAYER"      // API/SDK rails for BFSI (account aggregator, UPI stack, mandate APIs)
  | "PAYMENT_GATEWAY"  // Payment processing (gateway, checkout, merchant payments)
  | "PAYMENT_MOR"      // Merchant of Record - global tax/compliance for SaaS
  | "WALLET"           // Digital wallet (mobile wallet, prepaid wallet, recharge)
  | "ISSUER"           // FD/RD/NBFC product issuers (fixed deposit, recurring deposit)
  | "AGGREGATOR"       // Marketplace (loan marketplace, comparison)
  | "END_PRODUCT"      // Neobank (current account, neobank)
  | "BROKER"           // Trading/investing (stockbroker, demat, trading platform)
  | "LENDER"           // Lending platform (personal loan, business loan)
  | "UNKNOWN";

export type MarketRole = "competitor" | "non_competitor" | "supply_side";

interface ClassificationResult {
  category: CompetitorCategory;
  confidence: number;
  signals: string[];
  isCompetitor: boolean;
  marketRole: MarketRole;
  reasoning: string;
  capabilityProfile: CapabilityProfile;
}

interface CapabilityProfile {
  hasAPI: boolean;
  hasInfraRails: boolean;
  ownsFinancialProduct: boolean;
  isMarketplace: boolean;
  isEndUserApp: boolean;
  hasPaymentProcessing: boolean;
  hasWalletBalance: boolean;
  isMoR: boolean;
}

// Capability extraction - detects WHAT the company does
function extractCapabilities(combined: string): CapabilityProfile {
  const lower = combined.toLowerCase();

  // INFRA signals: API/SDK + BFSI rails
  const hasAPI = /\bapi\b|\bsdk\b|\bdeveloper\s*(?:platform|suite|tools)\b/i.test(lower);
  const hasInfraRails = /\baccount\s*aggregator\b|\bAA\b|\bupi\s*stack\b|\bbanking\s*rails\b|\bmandate\b|\baadhaar\s*pay\b|\baccount-to-account\b/i.test(lower);
  const hasOrchestration = /\borchestration\b|\bembed\b|\binfra\b|\binfrastructure\b/i.test(lower);

  // PRODUCT signals: owns FD/loans/insurance
  const hasFixedDeposit = /\bfixed\s*deposit\b|\bFD\s*interest\b/i.test(lower);
  const hasLending = /\bpersonal\s*loan\b|\bbusiness\s*loan\b|\bloan\s*disbursement\b|\bcredit\s*card\b/i.test(lower);
  const hasInsurance = /\blife\s*insurance\b|\bterm\s*insurance\b|\bhealth\s*insurance\b/i.test(lower);

  // MARKETPLACE signals
  const hasMarketplace = /\bloan\s*marketplace\b|\bcredit\s*marketplace\b|\bcompare\s*(?:loans?|insurance)\b|\baggregator\b.*\bloan\b/i.test(lower);

  // END PRODUCT signals: consumer/business banking app
  const hasEndUserApp = /\bbusiness\s*account\b|\bcurrent\s*account\b|\bneobank\b|\bapp\s*for\s*smes\b|\bbanking\s*app\b/i.test(lower);

  // PAYMENT signals
  const hasPaymentProcessing = /\bpayment\s*gateway\b|\bcheckout\b|\bmerchant\s*payment\b|\bcard\s*processing\b|\bupi\s*gateway\b/i.test(lower);

  // WALLET signals
  const hasWalletBalance = /\bdigital\s*wallet\b|\bmobile\s*wallet\b|\bwallet\s*balance\b|\bprepaid\s*wallet\b|\brecharge\b|\bbill\s*payment\b/i.test(lower);

  // MoR (Merchant of Record) signals - global tax + compliance for SaaS
  const hasMoR = /\bmerchant of record\b|\bglobal tax\b|\binternational payments?\b|\btax compliance.*saas\b/i.test(lower);

  return {
    hasAPI: hasAPI || hasOrchestration,
    hasInfraRails,
    ownsFinancialProduct: hasFixedDeposit || hasLending || hasInsurance,
    isMarketplace: hasMarketplace,
    isEndUserApp: hasEndUserApp,
    hasPaymentProcessing,
    hasWalletBalance,
    isMoR: hasMoR,
  };
}

// INFRA detection - API-first BFSI infrastructure
const INFRA_SIGNALS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\baccount\s*aggregator\b/i, weight: 1.0 },
  { pattern: /\bAA\b.*\bapi\b|\bapi\b.*\bAA\b/i, weight: 0.95 },
  { pattern: /\bupi\s*stack\b/i, weight: 0.95 },
  { pattern: /\bbanking\s*rails\b/i, weight: 0.95 },
  { pattern: /\bfinancial\s*account\b/i, weight: 0.9 },
  { pattern: /\bmandate\s*api\b/i, weight: 0.9 },
  { pattern: /\bAPI\s*(?:for|to)\s*(?:banking|payments|financial)\b/i, weight: 0.85 },
  { pattern: /\bSDK\b.*\bbanking\b/i, weight: 0.85 },
  { pattern: /\bembed\b.*\bfintech\b/i, weight: 0.8 },
  { pattern: /\borchestration\b.*\bpayment\b/i, weight: 0.8 },
];

// Payment MoR patterns (Merchant of Record - global tax + compliance)
const PAYMENT_MOR_SIGNALS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bmerchant of record\b/i, weight: 1.0 },
  { pattern: /\bglobal tax\b/i, weight: 0.95 },
  { pattern: /\binternational payments?\b/i, weight: 0.9 },
  { pattern: /\btax compliance\b.*\bsaas\b/i, weight: 0.9 },
  { pattern: /\bglobal pay(ment)?\b/i, weight: 0.85 },
  { pattern: /\bcompliance[\s-]as[\s-]a[\s-]service\b/i, weight: 0.85 },
];

// Payment gateway patterns
const PAYMENT_GATEWAY_SIGNALS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bpayment\s*gateway\b/i, weight: 1.0 },
  { pattern: /\bmerchant\s*payment\b/i, weight: 0.95 },
  { pattern: /\bpayment\s*processor\b/i, weight: 0.95 },
  { pattern: /\bcheckout\s*solution\b/i, weight: 0.9 },
  { pattern: /\bcard\s*processing\b/i, weight: 0.8 },
];

// Wallet patterns
const WALLET_SIGNALS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bdigital\s*wallet\b/i, weight: 1.0 },
  { pattern: /\bmobile\s*wallet\b/i, weight: 0.95 },
  { pattern: /\bprepaid\s*wallet\b/i, weight: 0.95 },
  { pattern: /\bwallet\s*balance\b/i, weight: 0.8 },
];

// END_PRODUCT patterns
const END_PRODUCT_SIGNALS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bbusiness\s*account\b/i, weight: 1.0 },
  { pattern: /\bcurrent\s*account\b/i, weight: 0.95 },
  { pattern: /\bneobank\b/i, weight: 0.95 },
  { pattern: /\bapp\s*for\s*smes\b/i, weight: 0.9 },
  { pattern: /\bbanking\s*app\b/i, weight: 0.85 },
];

// Aggregator patterns
const AGGREGATOR_SIGNALS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bloan\s*marketplace\b/i, weight: 1.0 },
  { pattern: /\bcredit\s*marketplace\b/i, weight: 1.0 },
  { pattern: /\bcompare\s*(?:loans?|insurance|financial\s*products?)/i, weight: 0.95 },
  { pattern: /\bfinancial\s*products?\s*comparison\b/i, weight: 0.95 },
  { pattern: /\bcredit\s*score\s*service\b/i, weight: 0.85 },
];

// Issuer patterns (FD/NBFC providers)
const ISSUER_SIGNALS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /\bfixed\s*deposit\b/i, weight: 1.0 },
  { pattern: /\bFD\s*interest\b/i, weight: 1.0 },
  { pattern: /\bRD\s*interest\b/i, weight: 0.95 },
  { pattern: /\bnbfc.*\bdeposit\b|\bdeposit\b.*\bnbfc/i, weight: 0.9 },
  { pattern: /\bcrisil\s*(?:a|b|c|d|aa)/i, weight: 0.85 },
];

// Helper to score a category
function scoreCategory(signals: Array<{ pattern: RegExp; weight: number }>, text: string): number {
  let score = 0;
  for (const { pattern, weight } of signals) {
    if (pattern.test(text)) {
      score += weight;
    }
  }
  return score;
}

// Categories that compete with Blostem (infra layer)
const COMPETITOR_CATEGORIES: CompetitorCategory[] = [
  "INFRA_LAYER",
  "PAYMENT_GATEWAY",
  "PAYMENT_MOR",
  "WALLET",
];

// Categories that are supply-side (product issuers)
const SUPPLY_SIDE_CATEGORIES: CompetitorCategory[] = [
  "ISSUER",
];

// Categories that are non-competitors
const NON_COMPETITOR_CATEGORIES: CompetitorCategory[] = [
  "AGGREGATOR",
  "END_PRODUCT",
  "BROKER",
  "LENDER",
];

// Classification with capability override and precedence
export function detectCompetitorCategory(
  competitorName: string,
  rawContent: string,
  tagline: string = ""
): ClassificationResult {
  // SELF-COMPANY BYPASS: Blostem is the reference frame, not a candidate
  if (competitorName.toLowerCase() === "blostem") {
    return {
      category: "UNKNOWN",
      confidence: 1.0,
      signals: ["self:blostem_reference"],
      isCompetitor: false,
      marketRole: "non_competitor",
      reasoning: "Blostem is your company — internal profile, not a competitor",
      capabilityProfile: {
        hasAPI: false,
        hasInfraRails: false,
        ownsFinancialProduct: false,
        isMarketplace: false,
        isEndUserApp: false,
        hasPaymentProcessing: false,
        hasWalletBalance: false,
        isMoR: false,
      },
    };
  }

  const combined = `${tagline} ${rawContent} ${competitorName}`.toLowerCase();

  // Step 1: Extract capabilities (deterministic)
  const capabilities = extractCapabilities(combined);

  // Step 2: Score each category
  const scores: Record<CompetitorCategory, number> = {
    INFRA_LAYER: scoreCategory(INFRA_SIGNALS, combined),
    PAYMENT_GATEWAY: scoreCategory(PAYMENT_GATEWAY_SIGNALS, combined),
    PAYMENT_MOR: scoreCategory(PAYMENT_MOR_SIGNALS, combined),
    WALLET: scoreCategory(WALLET_SIGNALS, combined),
    ISSUER: scoreCategory(ISSUER_SIGNALS, combined),
    AGGREGATOR: scoreCategory(AGGREGATOR_SIGNALS, combined),
    END_PRODUCT: scoreCategory(END_PRODUCT_SIGNALS, combined),
    BROKER: 0,
    LENDER: 0,
    UNKNOWN: 0,
  };

  // Broker detection
  if (/\bstockbroker\b|\bbrokerage\b|\btrading\s*platform\b|\bdemat\b/i.test(combined)) {
    scores.BROKER = 0.85;
  }

  // Lender detection
  if (/\blending\s*platform\b|\bpersonal\s*loan\b|\bloan\s*app\b/i.test(combined)) {
    scores.LENDER = 0.85;
  }

  // Step 3: Collect signals
  const signals: string[] = [];
  const addSignal = (cat: string, p: RegExp) => {
    if (p.test(combined)) signals.push(`${cat}:${p.source.slice(0, 20)}`);
  };

  INFRA_SIGNALS.forEach(s => addSignal("INFRA", s.pattern));
  PAYMENT_GATEWAY_SIGNALS.forEach(s => addSignal("GATEWAY", s.pattern));
  WALLET_SIGNALS.forEach(s => addSignal("WALLET", s.pattern));
  ISSUER_SIGNALS.forEach(s => addSignal("ISSUER", s.pattern));
  AGGREGATOR_SIGNALS.forEach(s => addSignal("AGGREGATOR", s.pattern));
  END_PRODUCT_SIGNALS.forEach(s => addSignal("END_PRODUCT", s.pattern));

  // Step 4: CAPABILITY OVERRIDES

  // Override A: If has infra rails + API, force INFRA (account aggregator pattern)
  if (capabilities.hasInfraRails && (capabilities.hasAPI || scores.INFRA_LAYER >= 0.5)) {
    scores.INFRA_LAYER = Math.max(scores.INFRA_LAYER, 1.5);
    signals.push("cap:infra_rails_override");
  }

  // Override B: If owns financial product, it's ISSUER not infra
  if (capabilities.ownsFinancialProduct && scores.ISSUER >= 0.5) {
    scores.ISSUER = Math.max(scores.ISSUER, 1.5);
    scores.INFRA_LAYER = 0;
    signals.push("cap:owns_product_override");
  }

  // Override C: Marketplace overrides (loan marketplace pattern)
  if (capabilities.isMarketplace && !capabilities.ownsFinancialProduct) {
    scores.AGGREGATOR = Math.max(scores.AGGREGATOR, 1.2);
    signals.push("cap:marketplace_override");
  }

  // Override D: End user app overrides infra (neobank pattern)
  if (capabilities.isEndUserApp && !capabilities.hasAPI) {
    scores.END_PRODUCT = Math.max(scores.END_PRODUCT, 1.2);
    scores.INFRA_LAYER = 0;
    signals.push("cap:end_user_app_override");
  }

  // Override E: MoR capability overrides to PAYMENT_MOR
  if (capabilities.isMoR || scores.PAYMENT_MOR >= 0.5) {
    scores.PAYMENT_MOR = Math.max(scores.PAYMENT_MOR, 1.2);
    signals.push("cap:mor_override");
  }

  // Step 5: Find winner by precedence
  // INFRA > ISSUER > PAYMENT_MOR > PAYMENT_GATEWAY > WALLET > END_PRODUCT > AGGREGATOR > BROKER > LENDER
  const precedence: CompetitorCategory[] = [
    "INFRA_LAYER", "ISSUER", "PAYMENT_MOR", "PAYMENT_GATEWAY", "WALLET", "END_PRODUCT", "AGGREGATOR", "BROKER", "LENDER", "UNKNOWN"
  ];

  let maxScore = 0;
  let maxCategory: CompetitorCategory = "UNKNOWN";

  for (const cat of precedence) {
    const score = scores[cat] || 0;
    if (score > maxScore) {
      maxScore = score;
      maxCategory = cat;
    }
  }

  // Step 6: Fallback - capability-based
  if (maxScore < 0.5) {
    if (capabilities.hasAPI && !capabilities.ownsFinancialProduct && !capabilities.isMarketplace && !capabilities.isEndUserApp) {
      maxCategory = "INFRA_LAYER";
      maxScore = 0.6;
      signals.push("fallback:api_infra");
    } else if (capabilities.ownsFinancialProduct) {
      maxCategory = "ISSUER";
      maxScore = 0.6;
      signals.push("fallback:owns_product");
    } else if (capabilities.isMarketplace) {
      maxCategory = "AGGREGATOR";
      maxScore = 0.6;
      signals.push("fallback:marketplace");
    }
  }

  const isCompetitor = COMPETITOR_CATEGORIES.includes(maxCategory) && maxScore >= 0.5;
  const isSupplySide = SUPPLY_SIDE_CATEGORIES.includes(maxCategory);
  const isNonCompetitor = NON_COMPETITOR_CATEGORIES.includes(maxCategory);

  let marketRole: MarketRole = "non_competitor";
  if (isCompetitor) marketRole = "competitor";
  else if (isSupplySide) marketRole = "supply_side";
  else if (isNonCompetitor) marketRole = "non_competitor";

  let reasoning = "";
  if (maxScore === 0) {
    reasoning = "No clear signals — defaulting to non-competitor";
    maxCategory = "UNKNOWN";
    marketRole = "non_competitor";
  } else if (isCompetitor) {
    reasoning = `${maxCategory} (score: ${maxScore.toFixed(1)}) — ${roleDesc(maxCategory)}`;
  } else if (isSupplySide) {
    reasoning = `${maxCategory} (score: ${maxScore.toFixed(1)}) — supply-side partner`;
  } else {
    reasoning = `${maxCategory} (score: ${maxScore.toFixed(1)}) — non-competitor (${roleDesc(maxCategory)})`;
  }

  return {
    category: maxCategory,
    confidence: Math.min(maxScore, 1.0),
    signals: signals.slice(0, 6),
    isCompetitor,
    marketRole,
    reasoning,
    capabilityProfile: capabilities,
  };
}

function roleDesc(cat: CompetitorCategory): string {
  switch (cat) {
    case "INFRA_LAYER": return "BFSI API/SDK rails (direct competitor)";
    case "PAYMENT_GATEWAY": return "payment processing";
    case "PAYMENT_MOR": return "Merchant of Record - global tax/compliance";
    case "WALLET": return "digital wallet";
    case "ISSUER": return "FD/RD product issuer (partner)";
    case "AGGREGATOR": return "marketplace/distribution";
    case "END_PRODUCT": return "neobank/business app";
    case "BROKER": return "trading/investing platform";
    case "LENDER": return "lending platform";
    default: return "unclassified";
  }
}

export function getPricingModelForCategory(cat: CompetitorCategory): string {
  switch (cat) {
    case "BROKER": return "brokerage (per-trade)";
    case "PAYMENT_GATEWAY": return "transaction + MDR (volume-linked)";
    case "PAYMENT_MOR": return "subscription + per-transaction (tax/compliance markup)";
    case "WALLET": return "transaction + MDR + wallet-based";
    case "INFRA_LAYER": return "API usage-based (per-call)";
    case "LENDER": return "lending margin + transaction";
    case "AGGREGATOR": return "commission (CPA/CPL)";
    case "ISSUER": return "interest spread + deposit margin";
    case "END_PRODUCT": return "subscription + usage";
    default: return "opaque";
  }
}

export interface SupplySideContext {
  competitor: string;
  category: CompetitorCategory;
  classification: string;
  what_they_offer: string[];
  why_it_matters: string[];
  opportunity: string[];
  ae_positioning: string;
  disqualify_questions: string[];
}

export function generateSupplySideContext(competitor: string, classification: ClassificationResult): SupplySideContext {
  const cat = classification.category;

  return {
    competitor,
    category: cat,
    classification: "Supply-side (product issuer) — partner, not competitor",
    what_they_offer: cat === "ISSUER" ? [
      "Fixed deposits (FD) with competitive interest rates",
      "Recurring deposits (RD) for systematic savings",
      "Credit-rated instruments (CRISIL/ICRA rated)",
      "NBFC-backed deposit products",
    ] : ["Financial products"],
    why_it_matters: cat === "ISSUER" ? [
      "Blostem can integrate with issuers to offer FD/RD products",
      "They are product layer, not infra competition",
      "Potential partnership for product catalog expansion",
    ] : ["Part of the BFSI ecosystem"],
    opportunity: cat === "ISSUER" ? [
      "Partner to offer FD/RD products via Blostem",
      "Expand product catalog through API integration",
    ] : ["Explore integration opportunities"],
    ae_positioning: cat === "ISSUER"
      ? "You don't compete with issuers — you integrate them. Blostem can distribute their FD/RD products."
      : "This company is part of the ecosystem, not a competitor.",
    disqualify_questions: cat === "ISSUER" ? [
      "Are you building infra to distribute FD/RD products?",
      "Do you need APIs to access multiple deposit products?",
    ] : ["Confirm what layer this company occupies"],
  };
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

export function generateStrategicContext(competitor: string, classification: ClassificationResult): StrategicContext {
  const cat = classification.category;

  const whereTheyFit: Record<CompetitorCategory, string> = {
    BROKER: "Customer-facing investing/trading platform",
    LENDER: "Credit/lending platform",
    AGGREGATOR: "Financial products marketplace (comparison/distribution)",
    END_PRODUCT: "Neobank/business banking app",
    INFRA_LAYER: "BFSI API/SDK infrastructure",
    PAYMENT_GATEWAY: "Payment processing",
    PAYMENT_MOR: "Merchant of Record - handles global tax and compliance for SaaS",
    WALLET: "Digital wallet",
    ISSUER: "FD/RD product issuer",
    UNKNOWN: "Unclassified",
  };

  const overlaps: Record<CompetitorCategory, string[]> = {
    BROKER: ["Platform teams may need FD/RD APIs for savings features"],
    LENDER: ["Could integrate FD/RD for lending against securities"],
    AGGREGATOR: ["May integrate infra providers like Blostem for product expansion"],
    END_PRODUCT: ["Business banking needs may overlap with BFSI infra"],
    INFRA_LAYER: ["Direct overlap — API/SDK infrastructure"],
    PAYMENT_GATEWAY: ["Payment layer — may need BFSI infra for deposits"],
    PAYMENT_MOR: ["Partial overlap — handles global payments tax but not BFSI product APIs"],
    WALLET: ["Wallet + deposits overlap potential"],
    ISSUER: ["Product issuers can be distribution partners"],
    UNKNOWN: ["Limited overlap with BFSI infra layer"],
  };

  const positioning: Record<CompetitorCategory, string> = {
    BROKER: "If you're building infra, you're not choosing a brokerage — you're choosing the layer underneath it.",
    LENDER: "For deposit-backed lending, you need BFSI infra, not just a lending platform.",
    AGGREGATOR: "If you're building a marketplace, you're not choosing infra — you're choosing what powers the products.",
    END_PRODUCT: "Business banking app vs BFSI infra layer — different problems solved.",
    INFRA_LAYER: "Direct infra competition — position against API/SDK capabilities.",
    PAYMENT_GATEWAY: "Payment layer vs BFSI infra — different scope.",
    PAYMENT_MOR: "MoR handles global tax/compliance for payments — different layer, but may compete at payment infra.",
    WALLET: "Wallet vs BFSI infra — different product layer.",
    ISSUER: "Issuers are partners, not competitors.",
    UNKNOWN: "Understand the layer this company occupies.",
  };

  const disqualify: Record<CompetitorCategory, string[]> = {
    BROKER: [
      "Are you building a trading platform or BFSI infrastructure?",
      "Do you need FD/RD APIs for your product?",
    ],
    LENDER: [
      "Are you building a lending product or BFSI infrastructure?",
      "Do you need deposit products (FD/RD) for your book?",
    ],
    AGGREGATOR: [
      "Are you building a marketplace or the infra powering financial products?",
      "Do you need underlying products to populate your platform?",
    ],
    END_PRODUCT: [
      "Are you building a neobank UI or BFSI infrastructure?",
      "Do you need APIs for banking products?",
    ],
    INFRA_LAYER: [
      "Are you comparing API/SDK infrastructure providers?",
      "What specific rails (AA, UPI, mandates) do you need?",
    ],
    PAYMENT_GATEWAY: [
      "Are you comparing payment gateways or BFSI infra?",
      "Do you need deposit/banking APIs beyond payments?",
    ],
    PAYMENT_MOR: [
      "Are you evaluating MoR solutions or BFSI infrastructure?",
      "Do you need APIs for FD/RD/banking products or just payment compliance?",
    ],
    WALLET: [
      "Are you comparing wallets or BFSI infrastructure?",
      "Do you need FD/RD product integration?",
    ],
    ISSUER: [
      "Are you looking for product issuers or infrastructure?",
    ],
    UNKNOWN: [
      "Confirm if this company overlaps with Blostem's BFSI infra target",
    ],
  };

  return {
    competitor,
    category: cat,
    classification: `${cat} — ${roleDesc(cat)}`,
    market_role: getMarketRoleLabel(cat),
    where_they_fit: whereTheyFit[cat] || "Unknown",
    overlap: overlaps[cat] || ["Limited overlap"],
    partner_potential: cat === "AGGREGATOR" ? ["Distribution channel for Blostem-powered products"] : [],
    ae_positioning: positioning[cat] || "Understand the category boundary.",
    disqualify_questions: disqualify[cat] || ["Confirm overlap with BFSI infra"],
  };
}

function getMarketRoleLabel(cat: CompetitorCategory): string {
  if (COMPETITOR_CATEGORIES.includes(cat)) return "competitor";
  if (SUPPLY_SIDE_CATEGORIES.includes(cat)) return "supply_side";
  return "non_competitor";
}