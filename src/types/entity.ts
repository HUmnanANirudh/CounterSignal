export type BusinessModel = 
  | "transaction_linked" 
  | "api_saas" 
  | "license_as_service" 
  | "retail_monetization" 
  | "interbank_fee";

export type CustodyModel = 
  | "mor_custody" 
  | "escrow_mediated" 
  | "none_direct_rail"
  | "not_applicable";

export type InfraLayer = 
  | "payment_orchestration" 
  | "account_aggregation" 
  | "core_banking_rails" 
  | "card_issuance" 
  | "lending_ops"
  | "wealth_tech"
  | "collections_ops"
  | "identity_rails"
  | "unknown";

export type MarketRelationship = 
  | "direct_competitor"
  | "indirect_competitor"
  | "substitute"
  | "ecosystem_partner"
  | "infrastructure_supplier"
  | "distributor"
  | "issuer";

export interface BFSICategoryMetadata {
  role: "competitor" | "non_competitor" | "supply_side";
  label: string;
  definition: string;
  pricing: string;
  precedence: number;
  businessModel: BusinessModel;
  custodyModel: CustodyModel;
  infraLayer: InfraLayer;
  primaryBuyer: "CTO" | "Founder" | "Compliance" | "Product";
  signals: Array<{ pattern: RegExp; weight: number }>;
}

export const BFSI_TAXONOMY: Record<string, BFSICategoryMetadata> = {
  // 1. PAYMENT LAYER
  payment_gateway: {
    role: "competitor" as const,
    label: "Payment Gateway (Checkout & Acquiring)",
    definition: "payment orchestration & merchant acquiring layer",
    pricing: "transaction + MDR (volume-linked)",
    precedence: 130,
    businessModel: "transaction_linked",
    custodyModel: "mor_custody",
    infraLayer: "payment_orchestration",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(payment\s*gateway|checkout|upi|mdr|transaction|payment\s*processor)\b/i, weight: 2 },
      { pattern: /\b(razorpay|cashfree|stripe|payu|easebuzz|billdesk)\b/i, weight: 2 },
    ]
  },
  payment_aggregator: {
    role: "competitor" as const,
    label: "Payment Aggregator (Merchant Aggregation)",
    definition: "merchant aggregation & settlement layer",
    pricing: "transaction + MDR (volume-linked)",
    precedence: 125,
    businessModel: "transaction_linked",
    custodyModel: "mor_custody",
    infraLayer: "payment_orchestration",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(payment\s*aggregator|merchant\s*aggregator)\b/i, weight: 2 },
    ]
  },
  wallet: {
    role: "competitor" as const,
    label: "Wallet (Consumer Liquidity)",
    definition: "consumer liquidity & closed-loop payment layer",
    pricing: "transaction + MDR + wallet-based",
    precedence: 120,
    businessModel: "retail_monetization",
    custodyModel: "mor_custody",
    infraLayer: "payment_orchestration",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(wallet|digital\s*wallet|mobile\s*wallet|prepaid\s*wallet)\b/i, weight: 2 },
      { pattern: /\b(paytm|mobikwik)\b/i, weight: 2 },
    ]
  },
  upi_app: {
    role: "competitor" as const,
    label: "UPI App (Consumer Interface)",
    definition: "consumer UPI interface layer",
    pricing: "UPI interchange + MDR",
    precedence: 115,
    businessModel: "retail_monetization",
    custodyModel: "none_direct_rail",
    infraLayer: "payment_orchestration",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(upi\s*app|unified\s*payments|payment\s*app)\b/i, weight: 2 },
      { pattern: /\b(phonepe|google\s*pay|gpay|tez)\b/i, weight: 2 },
    ]
  },
  payment_orchestration: {
    role: "competitor" as const,
    label: "Payment Orchestration (Routing & Logic)",
    definition: "payment routing & checkout logic layer",
    pricing: "API usage-based (per-call)",
    precedence: 140,
    businessModel: "api_saas",
    custodyModel: "none_direct_rail",
    infraLayer: "payment_orchestration",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(payment\s*orchestration|payment\s*rails)\b/i, weight: 2 },
      { pattern: /\b(juspay)\b/i, weight: 2 },
    ]
  },
  merchant_of_record: {
    role: "competitor" as const,
    label: "Merchant of Record (Compliance Abstraction)",
    definition: "payment compliance & tax abstraction layer",
    pricing: "subscription + transaction markup",
    precedence: 145,
    businessModel: "license_as_service",
    custodyModel: "mor_custody",
    infraLayer: "payment_orchestration",
    primaryBuyer: "Compliance",
    signals: [
      { pattern: /\b(merchant\s*of\s*record|global\s*tax|international\s*payment|tax\s*compliance)\b/i, weight: 2 },
      { pattern: /\b(dodo|paddle)\b/i, weight: 2 },
    ]
  },
  // 2. BANKING INFRA
  banking_api_infra: {
    role: "competitor" as const,
    label: "Banking API Infra (Access Layer)",
    definition: "banking API & account access layer",
    pricing: "API usage-based (per-call)",
    precedence: 150,
    businessModel: "api_saas",
    custodyModel: "none_direct_rail",
    infraLayer: "account_aggregation",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(banking\s*api|api\s*banking|bank\s*integration|account\s*aggregator)\b/i, weight: 2 },
      { pattern: /\b(AA\b|account\s*aggregator|upi\s*stack)\b/i, weight: 2 },
      { pattern: /\b(setu|decentro|yap|open\.?tech)\b/i, weight: 2 },
    ]
  },
  embedded_finance_infra: {
    role: "competitor" as const,
    label: "Embedded Finance Infra (Product Layer)",
    definition: "embedded product issuance layer",
    pricing: "API usage-based (per-call)",
    precedence: 148,
    businessModel: "api_saas",
    custodyModel: "none_direct_rail",
    infraLayer: "core_banking_rails",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(embedded\s*finance|embedded\s*banking|BaaS)\b/i, weight: 2 },
      { pattern: /\b(fintech\s*infra)\b/i, weight: 1 },
    ]
  },
  neobanking_infra: {
    role: "competitor" as const,
    label: "Neobanking Infra (Full Stack)",
    definition: "full-stack banking tech layer",
    pricing: "API usage-based (per-call)",
    precedence: 147,
    businessModel: "api_saas",
    custodyModel: "none_direct_rail",
    infraLayer: "core_banking_rails",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(neobanking\s*infra|neo\s*bank)\b/i, weight: 2 },
      { pattern: /\b(zeta|m2p)\b/i, weight: 2 },
    ]
  },
  // 3. LENDING
  nbfc: {
    role: "supply_side" as const,
    label: "NBFC (Capital & Licensing)",
    definition: "lending, capital & regulatory licensing layer",
    pricing: "interest spread + processing fees",
    precedence: 110,
    businessModel: "license_as_service",
    custodyModel: "none_direct_rail",
    infraLayer: "lending_ops",
    primaryBuyer: "Founder",
    signals: [
      { pattern: /\b(NBFC|non\s*banking\s*finance|loan\s*provider)\b/i, weight: 2 },
      { pattern: /\b(shriram|bajaj\s*finance|muthoot)\b/i, weight: 2 },
      { pattern: /\b(fixed\s*deposit|fd\s*interest|rd\s*interest)\b/i, weight: 1.5 },
    ]
  },
  lending_platform: {
    role: "supply_side" as const,
    label: "Lending Platform (Lifecycle Mgt)",
    definition: "loan lifecycle & management layer",
    pricing: "interest spread + processing fees",
    precedence: 105,
    businessModel: "transaction_linked",
    custodyModel: "none_direct_rail",
    infraLayer: "lending_ops",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(lending\s*platform|personal\s*loan|business\s*loan)\b/i, weight: 2 },
      { pattern: /\b(kreditbee|lendingkart|avail)\b/i, weight: 2 },
    ]
  },
  loan_aggregator: {
    role: "non_competitor" as const,
    label: "Loan Aggregator (Lead Gen)",
    definition: "lead generation & loan discovery layer",
    pricing: "commission (CPA/CPL)",
    precedence: 100,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Founder",
    signals: [
      { pattern: /\b(loan\s*aggregator|loan\s*marketplace|credit\s*comparison)\b/i, weight: 2 },
      { pattern: /\b(paisabazaar|bankbazaar)\b/i, weight: 2 },
    ]
  },
  bnpl: {
    role: "non_competitor" as const,
    label: "BNPL (POS Financing)",
    definition: "point-of-sale financing layer",
    pricing: "merchant fees + late fees",
    precedence: 95,
    businessModel: "transaction_linked",
    custodyModel: "mor_custody",
    infraLayer: "lending_ops",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(BNPL|buy\s*now\s*pay\s*later|lazypay|simpl)\b/i, weight: 2 },
    ]
  },
  // 4. WEALTH
  broker: {
    role: "non_competitor" as const,
    label: "Broker (Distribution)",
    definition: "securities distribution & trading layer",
    pricing: "brokerage (per-trade)",
    precedence: 90,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "wealth_tech",
    primaryBuyer: "Founder",
    signals: [
      { pattern: /\b(stockbroker|brokerage|trading\s*platform|demat)\b/i, weight: 2 },
      { pattern: /\b(zerodha|groww|upstox|angel\s*one)\b/i, weight: 2 },
      { pattern: /\b(stocks|investing|mutual\s*funds?)\b/i, weight: 1 },
    ]
  },
  wealth_platform: {
    role: "non_competitor" as const,
    label: "Wealth Platform (Management)",
    definition: "consumer wealth management layer",
    pricing: "AUM fee + transaction charges",
    precedence: 85,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "wealth_tech",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(wealth\s*platform|wealth\s*management)\b/i, weight: 2 },
      { pattern: /\b(indmoney|kuvera|scripbox)\b/i, weight: 2 },
    ]
  },
  robo_advisor: {
    role: "non_competitor" as const,
    label: "Robo Advisor (Automation)",
    definition: "automated investment advisory layer",
    pricing: "AUM fee + transaction charges",
    precedence: 80,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "wealth_tech",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(robo\s*advisor|automated\s*investing)\b/i, weight: 2 },
      { pattern: /\b(smallcase)\b/i, weight: 1.5 },
    ]
  },
  // 5. ASSET MANUFACTURERS
  fd_provider: {
    role: "supply_side" as const,
    label: "FD Provider (Asset Manufacturer)",
    definition: "asset manufacturing (FD/RD) layer",
    pricing: "opaque",
    precedence: 70,
    businessModel: "license_as_service",
    custodyModel: "none_direct_rail",
    infraLayer: "core_banking_rails",
    primaryBuyer: "Compliance",
    signals: [
      { pattern: /\b(FD\s*provider|fixed\s*deposit\s*provider)\b/i, weight: 2 },
    ]
  },
  rd_provider: {
    role: "supply_side" as const,
    label: "RD Provider (Asset Manufacturer)",
    definition: "asset manufacturing (RD) layer",
    pricing: "opaque",
    precedence: 65,
    businessModel: "license_as_service",
    custodyModel: "none_direct_rail",
    infraLayer: "core_banking_rails",
    primaryBuyer: "Compliance",
    signals: [
      { pattern: /\b(RD\s*provider|recurring\s*deposit\s*provider)\b/i, weight: 2 },
    ]
  },
  issuer: {
    role: "supply_side" as const,
    label: "Issuer (Regulatory Holder)",
    definition: "regulatory product issuance layer",
    pricing: "opaque",
    precedence: 60,
    businessModel: "license_as_service",
    custodyModel: "none_direct_rail",
    infraLayer: "core_banking_rails",
    primaryBuyer: "Compliance",
    signals: [
      { pattern: /\b(issuer|product\s*issuer)\b/i, weight: 2 },
    ]
  },
  // 6. DISTRIBUTION
  marketplace: {
    role: "non_competitor" as const,
    label: "Marketplace (Discovery)",
    definition: "financial product discovery layer",
    pricing: "commission (CPA/CPL)",
    precedence: 75,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(marketplace|comparison\s*platform|aggregator)\b/i, weight: 2 },
      { pattern: /\b(paisabazaar|bankbazaar|policybazaar)\b/i, weight: 2 },
    ]
  },
  distribution_api: {
    role: "non_competitor" as const,
    label: "Distribution API (Affiliate Infra)",
    definition: "affiliate & distribution infra layer",
    pricing: "opaque",
    precedence: 55,
    businessModel: "api_saas",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(distribution\s*api|embedd?ed\s*distribution)\b/i, weight: 2 },
    ]
  },
  embedded_distribution: {
    role: "non_competitor" as const,
    label: "Embedded Distribution (Point of Need)",
    definition: "point-of-need distribution layer",
    pricing: "opaque",
    precedence: 50,
    businessModel: "api_saas",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(B2B\s*SaaS.*financial|financial\s*product\s*distribution)\b/i, weight: 2 },
    ]
  },
  // 7. INSURANCE
  insurtech: {
    role: "non_competitor" as const,
    label: "Insurtech (Insurance Infra)",
    definition: "insurance infrastructure layer",
    pricing: "premium commission",
    precedence: 45,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(insurtech|insurance\s*tech)\b/i, weight: 2 },
      { pattern: /\b(acko|digit|policybazaar)\b/i, weight: 2 },
    ]
  },
  insurance_aggregator: {
    role: "non_competitor" as const,
    label: "Insurance Aggregator (Policy Lead Gen)",
    definition: "insurance lead generation layer",
    pricing: "premium commission",
    precedence: 40,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(insurance\s*aggregator)\b/i, weight: 2 },
      { pattern: /\b(policybazaar)\b/i, weight: 2 },
    ]
  },
  // 8. CORE SYSTEMS
  core_banking: {
    role: "non_competitor" as const,
    label: "Core Banking (Ledger of Truth)",
    definition: "banking ledger of truth layer",
    pricing: "opaque",
    precedence: 35,
    businessModel: "api_saas",
    custodyModel: "none_direct_rail",
    infraLayer: "core_banking_rails",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(core\s*banking|core\s*banking\s*system)\b/i, weight: 2 },
      { pattern: /\b(finacle|mambu|oracle\s*fs)\b/i, weight: 2 },
    ]
  },
  ledger_infra: {
    role: "non_competitor" as const,
    label: "Ledger Infra (Software Balances)",
    definition: "software ledger & reconciliation layer",
    pricing: "opaque",
    precedence: 30,
    businessModel: "api_saas",
    custodyModel: "none_direct_rail",
    infraLayer: "core_banking_rails",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(ledger\s*infra|ledger\s*as\s*a\s*service)\b/i, weight: 2 },
    ]
  },
  // 9. COMPLIANCE
  kyc_aml: {
    role: "competitor" as const,
    label: "KYC/AML (Identity Compliance)",
    definition: "identity & compliance safety layer",
    pricing: "opaque",
    precedence: 25,
    businessModel: "api_saas",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Compliance",
    signals: [
      { pattern: /\b(KYC|AML|kyc\s*aml|identity\s*verification)\b/i, weight: 2 },
      { pattern: /\b(hyperverge|signzy|idfy)\b/i, weight: 2 },
    ]
  },
  fraud_risk: {
    role: "competitor" as const,
    label: "Fraud/Risk (Safety Layer)",
    definition: "transaction risk & fraud safety layer",
    pricing: "opaque",
    precedence: 20,
    businessModel: "api_saas",
    custodyModel: "not_applicable",
    infraLayer: "payment_orchestration",
    primaryBuyer: "Compliance",
    signals: [
      { pattern: /\b(fraud\s*risk|fraud\s*prevention|payment\s*risk)\b/i, weight: 2 },
      { pattern: /\b(riskified)\b/i, weight: 2 },
    ]
  },
  regtech: {
    role: "competitor" as const,
    label: "Regtech (Reporting Layer)",
    definition: "regulatory reporting & compliance layer",
    pricing: "opaque",
    precedence: 15,
    businessModel: "api_saas",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Compliance",
    signals: [
      { pattern: /\b(regtech|regulatory\s*tech|compliance\s*tech)\b/i, weight: 2 },
      { pattern: /\b(perfios|idfy)\b/i, weight: 2 },
    ]
  },
  // 10. EDGE CASES
  bigtech_finance: {
    role: "non_competitor" as const,
    label: "Bigtech Finance (Scale Distribution)",
    definition: "scale-based distribution layer",
    pricing: "opaque",
    precedence: 10,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(bigtech\s*finance|google\s*pay|amazon\s*pay|meta\s*pay)\b/i, weight: 2 },
    ]
  },
  crypto_fintech: {
    role: "non_competitor" as const,
    label: "Crypto Fintech (Alt Assets)",
    definition: "alternative asset infrastructure layer",
    pricing: "opaque",
    precedence: 5,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(crypto|bitcoin|blockchain\s*fintech)\b/i, weight: 2 },
      { pattern: /\b(coindcx|wazirx|zebpay)\b/i, weight: 2 },
    ]
  },
  cross_border_payments: {
    role: "non_competitor" as const,
    label: "Cross-border Payments (FX & Settlement)",
    definition: "FX settlement & cross-border layer",
    pricing: "opaque",
    precedence: 0,
    businessModel: "transaction_linked",
    custodyModel: "escrow_mediated",
    infraLayer: "payment_orchestration",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(cross\s*border|cross-border|international\s*remittance)\b/i, weight: 2 },
      { pattern: /\b(wise|payoneer|remitly|stripe\s*atlas)\b/i, weight: 2 },
    ]
  },
  collections_infra: {
    role: "competitor" as const,
    label: "Collections Infra (Debt Recovery)",
    definition: "debt recovery & collections orchestration layer",
    pricing: "commission + platform fee",
    precedence: 102,
    businessModel: "api_saas",
    custodyModel: "none_direct_rail",
    infraLayer: "collections_ops",
    primaryBuyer: "Compliance",
    signals: [
      { pattern: /\b(collections\s*infra|debt\s*recovery|collections\s*platform)\b/i, weight: 2 },
      { pattern: /\b(credgenics|spocto)\b/i, weight: 2 },
    ]
  },
  escrow_infra: {
    role: "competitor" as const,
    label: "Escrow Infra (Safe Settlement)",
    definition: "safe settlement & escrow orchestration layer",
    pricing: "per-escrow fee",
    precedence: 108,
    businessModel: "api_saas",
    custodyModel: "escrow_mediated",
    infraLayer: "payment_orchestration",
    primaryBuyer: "Founder",
    signals: [
      { pattern: /\b(escrow\s*as\s*a\s*service|digital\s*escrow)\b/i, weight: 2 },
      { pattern: /\b(castler|voso)\b/i, weight: 2 },
    ]
  },
  card_network: {
    role: "supply_side" as const,
    label: "Card Network (Railing)",
    definition: "card network & settlement railing layer",
    pricing: "interchange",
    precedence: 160,
    businessModel: "interbank_fee",
    custodyModel: "none_direct_rail",
    infraLayer: "card_issuance",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(card\s*network|visa|mastercard|npci|rupay)\b/i, weight: 2 },
    ]
  },
  credit_bureau: {
    role: "supply_side" as const,
    label: "Credit Bureau (Identity/Credit Data)",
    definition: "credit data & identity history layer",
    pricing: "per-report fee",
    precedence: 155,
    businessModel: "api_saas",
    custodyModel: "not_applicable",
    infraLayer: "identity_rails",
    primaryBuyer: "Compliance",
    signals: [
      { pattern: /\b(credit\s*bureau|cibil|experian|equifax|crif)\b/i, weight: 2 },
    ]
  }
} as const;

export type BFSICategory = keyof typeof BFSI_TAXONOMY;
export type MarketRole = "competitor" | "non_competitor" | "supply_side";

export interface EntityClassification {
  primaryRole: MarketRole;
  category: BFSICategory;
  subCategory?: string;
  marketRoleDetail?: string;
}

// DERIVED HELPERS - Truly DRY
export function getMarketRole(category: BFSICategory): MarketRole {
  return BFSI_TAXONOMY[category].role;
}

export const BFSI_CATEGORY_LABELS = Object.fromEntries(
  Object.entries(BFSI_TAXONOMY).map(([k, v]) => [k, v.label])
) as unknown as Record<BFSICategory, string>;

export const CATEGORY_DEFINITIONS = Object.fromEntries(
  Object.entries(BFSI_TAXONOMY).map(([k, v]) => [k, v.definition])
) as unknown as Record<BFSICategory, string>;

export const CLASSIFICATION_SIGNALS = Object.fromEntries(
  Object.entries(BFSI_TAXONOMY).map(([k, v]) => [k, v.signals])
) as unknown as Record<BFSICategory, Array<{ pattern: RegExp; weight: number }>>;

export const CATEGORY_PRECEDENCE = Object.keys(BFSI_TAXONOMY)
  .sort((a, b) => (BFSI_TAXONOMY[b as BFSICategory].precedence) - (BFSI_TAXONOMY[a as BFSICategory].precedence)) as BFSICategory[];

export function getPricingModelForCategory(category: BFSICategory): string {
  return BFSI_TAXONOMY[category].pricing;
}

export interface CategoryStrategy {
  validate: string;
  acknowledge: string;
  reframe: string;
  specify: string;
}