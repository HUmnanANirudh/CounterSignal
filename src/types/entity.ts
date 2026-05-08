export type BusinessModel =
  | "transaction_linked"
  | "api_saas"
  | "license_as_service"
  | "retail_monetization"
  | "interbank_fee";

export type ComplianceType = 
  | "payment_compliance"
  | "deposit_compliance"
  | "lending_compliance"
  | "custody_compliance"
  | "tax_compliance";

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
  | "treasury_management"
  | "risk_scoring"
  | "ledger_infra"
  | "tax_compliance"
  | "unknown";

export type StackPosition = 
  | "consumer_facing_app"
  | "distribution_aggregator"
  | "product_orchestration"
  | "connectivity_layer"
  | "ledger_of_truth"
  | "asset_manufacturer"
  | "compliance_gate"
  | "checkout_interface"
  | "consumer_layer"
  | "distribution_layer"
  | "infra_layer"
  | "issuer_layer"
  | "unknown";

export type MarketRole = 
  | "direct_competitor"
  | "indirect_competitor"
  | "partner"
  | "non_competitor"
  | "ecosystem_player";

export type RelationshipMode = 
  | "DIRECT_COMPETITOR"
  | "INDIRECT_COMPETITOR"
  | "INTEGRATION_TARGET"
  | "SUPPLY_SIDE_PARTNER"
  | "NON_COMPETITOR_ECOSYSTEM"
  | "INTERNAL_PROFILE"
  | "UNKNOWN";

export type EntityRole = 
  | "competitor"
  | "supplier"
  | "distributor"
  | "benchmark"
  | "ecosystem_player"
  | "infrastructure_partner";

export interface BFSICategoryMetadata {
  role: MarketRole;
  relationshipMode: RelationshipMode;
  stackPosition: StackPosition;
  entityRole: EntityRole;
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
  // 1. PAYMENT LAYER (transaction movement)
  payment_gateway: {
    role: "direct_competitor",
    relationshipMode: "DIRECT_COMPETITOR",
    stackPosition: "checkout_interface",
    entityRole: "competitor",
    label: "Payment Gateway",
    definition: "checkout & acquiring layer",
    pricing: "transaction + MDR (volume-linked)",
    precedence: 130,
    businessModel: "transaction_linked",
    custodyModel: "mor_custody",
    infraLayer: "payment_orchestration",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(payment\s*gateway|checkout|mdr|payment\s*processor)\b/i, weight: 2 },
      { pattern: /\b(razorpay|cashfree|stripe|payu|easebuzz|billdesk)\b/i, weight: 2 },
      { pattern: /\b(payment\s*aggregation|merchant\s*onboarding|transaction\s*settlement)\b/i, weight: 1.5 },
    ]
  },
  payment_aggregator: {
    role: "indirect_competitor",
    relationshipMode: "INDIRECT_COMPETITOR",
    stackPosition: "distribution_aggregator",
    entityRole: "competitor",
    label: "Payment Aggregator",
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
    role: "indirect_competitor",
    relationshipMode: "INDIRECT_COMPETITOR",
    stackPosition: "consumer_facing_app",
    entityRole: "competitor",
    label: "Wallet",
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
    role: "indirect_competitor",
    relationshipMode: "INDIRECT_COMPETITOR",
    stackPosition: "consumer_facing_app",
    entityRole: "competitor",
    label: "UPI App",
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
    role: "direct_competitor",
    relationshipMode: "DIRECT_COMPETITOR",
    stackPosition: "product_orchestration",
    entityRole: "competitor",
    label: "Payment Orchestration",
    definition: "payment routing & logic layer",
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
    role: "direct_competitor",
    relationshipMode: "DIRECT_COMPETITOR",
    stackPosition: "compliance_gate",
    entityRole: "competitor",
    label: "Merchant of Record",
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
  // 2. BANKING INFRA (direct battlefield)
  banking_api_infra: {
    role: "direct_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "connectivity_layer",
    entityRole: "infrastructure_partner",
    label: "Banking API Infra",
    definition: "banking API & account access layer (infra layer)",
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
    role: "direct_competitor",
    relationshipMode: "DIRECT_COMPETITOR",
    stackPosition: "product_orchestration",
    entityRole: "competitor",
    label: "Embedded Finance Infra",
    definition: "embedded product issuance layer (Blostem-type)",
    pricing: "API usage-based (per-call)",
    precedence: 148,
    businessModel: "api_saas",
    custodyModel: "none_direct_rail",
    infraLayer: "core_banking_rails",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(embedded\s*finance|embedded\s*banking|BaaS)\b/i, weight: 2 },
    ]
  },
  neobanking_infra: {
    role: "indirect_competitor",
    relationshipMode: "INDIRECT_COMPETITOR",
    stackPosition: "ledger_of_truth",
    entityRole: "competitor",
    label: "Neobanking Infra",
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
  // 3. LENDING / CREDIT
  nbfc: {
    role: "partner",
    relationshipMode: "SUPPLY_SIDE_PARTNER",
    stackPosition: "issuer_layer",
    entityRole: "supplier",
    label: "NBFC",
    definition: "capital & regulatory licensing layer (supply-side)",
    pricing: "interest spread + processing fees",
    precedence: 110,
    businessModel: "license_as_service",
    custodyModel: "none_direct_rail",
    infraLayer: "lending_ops",
    primaryBuyer: "Founder",
    signals: [
      { pattern: /\b(NBFC|non\s*banking\s*finance|loan\s*provider)\b/i, weight: 2 },
      { pattern: /\b(shriram|bajaj\s*finance|muthoot)\b/i, weight: 2 },
    ]
  },
  lending_platform: {
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "competitor",
    label: "Lending Platform",
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
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "distributor",
    label: "Loan Aggregator",
    definition: "lead generation & loan discovery layer",
    pricing: "commission (CPA/CPL)",
    precedence: 100,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Founder",
    signals: [
      { pattern: /\b(loan\s*aggregator|loan\s*marketplace|credit\s*comparison)\b/i, weight: 2 },
    ]
  },
  bnpl: {
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "competitor",
    label: "BNPL",
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
  // 4. WEALTH / INVESTMENT
  broker: {
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "benchmark",
    label: "Broker",
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
    ]
  },
  wealth_platform: {
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "distributor",
    label: "Wealth Platform",
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
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "competitor",
    label: "Robo Advisor",
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
  // 5. DEPOSIT / SAVINGS SUPPLY SIDE
  fd_provider: {
    role: "partner",
    relationshipMode: "SUPPLY_SIDE_PARTNER",
    stackPosition: "issuer_layer",
    entityRole: "supplier",
    label: "FD Provider",
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
    role: "partner",
    relationshipMode: "SUPPLY_SIDE_PARTNER",
    stackPosition: "issuer_layer",
    entityRole: "supplier",
    label: "RD Provider",
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
    role: "partner",
    relationshipMode: "SUPPLY_SIDE_PARTNER",
    stackPosition: "issuer_layer",
    entityRole: "supplier",
    label: "Issuer",
    definition: "regulatory product issuance layer (generic umbrella)",
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
  // 6. DISTRIBUTION LAYER
  marketplace: {
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "distributor",
    label: "Marketplace",
    definition: "financial product discovery layer",
    pricing: "commission (CPA/CPL)",
    precedence: 75,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(financial\s*marketplace|product\s*comparison\s*platform|aggregator|investment\s*marketplace)\b/i, weight: 2 },
      { pattern: /\b(policybazaar|bankbazaar|paisabazaar)\b/i, weight: 2 },
      { pattern: /\b(compare\s*loans|compare\s*cards|compare\s*insurance)\b/i, weight: 1.5 },
    ]
  },
  distribution_api: {
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "infrastructure_partner",
    label: "Distribution API",
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
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "distributor",
    label: "Embedded Distribution",
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
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "competitor",
    label: "Insurtech",
    definition: "insurance infrastructure layer",
    pricing: "premium commission",
    precedence: 45,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(insurtech|insurance\s*tech)\b/i, weight: 2 },
      { pattern: /\b(acko|digit)\b/i, weight: 2 },
    ]
  },
  insurance_aggregator: {
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "distributor",
    label: "Insurance Aggregator",
    definition: "insurance lead generation layer",
    pricing: "premium commission",
    precedence: 40,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(insurance\s*aggregator)\b/i, weight: 2 },
    ]
  },
  // 8. CORE BANKING / LEDGER
  core_banking: {
    role: "ecosystem_player",
    relationshipMode: "SUPPLY_SIDE_PARTNER",
    stackPosition: "issuer_layer",
    entityRole: "ecosystem_player",
    label: "Core Banking",
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
    role: "ecosystem_player",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "infra_layer",
    entityRole: "ecosystem_player",
    label: "Ledger Infra",
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
  // 9. COMPLIANCE / RISK
  kyc_aml: {
    role: "ecosystem_player",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "infra_layer",
    entityRole: "ecosystem_player",
    label: "KYC/AML",
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
    role: "ecosystem_player",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "infra_layer",
    entityRole: "ecosystem_player",
    label: "Fraud/Risk",
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
    role: "ecosystem_player",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "infra_layer",
    entityRole: "ecosystem_player",
    label: "Regtech",
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
  // 10. GLOBAL / EDGE CASES
  bigtech_finance: {
    role: "ecosystem_player",
    relationshipMode: "INDIRECT_COMPETITOR",
    stackPosition: "distribution_layer",
    entityRole: "ecosystem_player",
    label: "Bigtech Finance",
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
    role: "non_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "distribution_layer",
    entityRole: "ecosystem_player",
    label: "Crypto Fintech",
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
    role: "ecosystem_player",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "infra_layer",
    entityRole: "ecosystem_player",
    label: "Cross-border Payments",
    definition: "FX settlement & cross-border layer",
    pricing: "opaque",
    precedence: 0,
    businessModel: "transaction_linked",
    custodyModel: "escrow_mediated",
    infraLayer: "payment_orchestration",
    primaryBuyer: "CTO",
    signals: [
      { pattern: /\b(cross\s*border|cross-border|international\s*remittance)\b/i, weight: 2 },
      { pattern: /\b(wise|payoneer)\b/i, weight: 2 },
    ]
  },
  collections_infra: {
    role: "direct_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "infra_layer",
    entityRole: "competitor",
    label: "Collections Infra",
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
    role: "direct_competitor",
    relationshipMode: "INTEGRATION_TARGET",
    stackPosition: "infra_layer",
    entityRole: "competitor",
    label: "Escrow Infra",
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
    role: "partner",
    relationshipMode: "SUPPLY_SIDE_PARTNER",
    stackPosition: "issuer_layer",
    entityRole: "supplier",
    label: "Card Network",
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
    role: "partner",
    relationshipMode: "SUPPLY_SIDE_PARTNER",
    stackPosition: "issuer_layer",
    entityRole: "supplier",
    label: "Credit Bureau",
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
  },
  non_bfsi: {
    role: "non_competitor",
    relationshipMode: "UNKNOWN",
    stackPosition: "unknown",
    entityRole: "ecosystem_player",
    label: "Non-BFSI Entity",
    definition: "Entity outside of the core BFSI or Fintech infrastructure market",
    pricing: "N/A",
    precedence: 0,
    businessModel: "retail_monetization",
    custodyModel: "not_applicable",
    infraLayer: "unknown",
    primaryBuyer: "Product",
    signals: [
      { pattern: /\b(e-commerce|ecommerce|online\s*shopping|retail\s*brand|lifestyle\s*platform|apparel|fashion|electronics|grocer)\b/i, weight: 1.5 },
      { pattern: /\b(tata\s*cliq|ajio|myntra|flipkart|amazon|reliance\s*retail)\b/i, weight: 2 },
    ]
  }
} as const;

export type BFSICategory = keyof typeof BFSI_TAXONOMY;

// DERIVED HELPERS - Truly DRY
export function getMarketRole(category: BFSICategory): MarketRole {
  return BFSI_TAXONOMY[category].role;
}

export function getRelationshipMode(category: BFSICategory): RelationshipMode {
  return BFSI_TAXONOMY[category].relationshipMode;
}

export function getStackPosition(category: BFSICategory): StackPosition {
  return BFSI_TAXONOMY[category].stackPosition;
}

export function getEntityRole(category: BFSICategory): EntityRole {
  return BFSI_TAXONOMY[category].entityRole;
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
  strategicGoal: string;
}
export const STACK_POSITION_LABELS: Record<StackPosition, string> = {
  consumer_facing_app: "Consumer Interface",
  distribution_aggregator: "Marketplace / Aggregator",
  product_orchestration: "Product Orchestration Layer",
  connectivity_layer: "Connectivity Middleware",
  ledger_of_truth: "Core Banking Ledger",
  asset_manufacturer: "Product Issuer",
  compliance_gate: "Compliance Gatekeeper",
  checkout_interface: "Checkout / Payment Rail",
  consumer_layer: "Consumer Distribution",
  distribution_layer: "Distribution Channel",
  infra_layer: "Infrastructure Rails",
  issuer_layer: "Asset Issuance",
  unknown: "Market Layer",
};
