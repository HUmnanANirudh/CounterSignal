// BFSI Classification Taxonomy
// 10-layer classification for fintech entities

export type BFSICategory =
  // 1. PAYMENT LAYER (transaction movement)
  | "payment_gateway"
  | "payment_aggregator"
  | "wallet"
  | "upi_app"
  | "payment_orchestration"
  | "merchant_of_record"
  // 2. BANKING INFRA (direct battlefield)
  | "banking_api_infra"
  | "embedded_finance_infra"
  | "neobanking_infra"
  // 3. LENDING / CREDIT
  | "nbfc"
  | "lending_platform"
  | "loan_aggregator"
  | "bnpl"
  // 4. WEALTH / INVESTMENT
  | "broker"
  | "wealth_platform"
  | "robo_advisor"
  // 5. DEPOSIT / SAVINGS SUPPLY SIDE
  | "fd_provider"
  | "rd_provider"
  | "issuer"
  // 6. DISTRIBUTION LAYER
  | "marketplace"
  | "distribution_api"
  | "embedded_distribution"
  // 7. INSURANCE
  | "insurtech"
  | "insurance_aggregator"
  // 8. CORE BANKING / LEDGER
  | "core_banking"
  | "ledger_infra"
  // 9. COMPLIANCE / RISK
  | "kyc_aml"
  | "fraud_risk"
  | "regtech"
  // 10. GLOBAL / EDGE CASES
  | "bigtech_finance"
  | "crypto_fintech"
  | "cross_border_payments";

export type MarketRole = "competitor" | "non_competitor" | "supply_side";

export interface EntityClassification {
  primaryRole: MarketRole;
  category: BFSICategory;
}

// Map category to market role
export function getMarketRole(category: BFSICategory): MarketRole {
  switch (category) {
    case "payment_gateway":
    case "payment_aggregator":
    case "wallet":
    case "upi_app":
    case "payment_orchestration":
    case "merchant_of_record":
    case "banking_api_infra":
    case "embedded_finance_infra":
    case "neobanking_infra":
    case "kyc_aml":
    case "fraud_risk":
    case "regtech":
      return "competitor";
    case "nbfc":
    case "lending_platform":
    case "fd_provider":
    case "rd_provider":
    case "issuer":
      return "supply_side";
    default:
      return "non_competitor";
  }
}

// BFSI Category labels for display
export const BFSI_CATEGORY_LABELS: Record<BFSICategory, string> = {
  payment_gateway: "Payment Gateway",
  payment_aggregator: "Payment Aggregator",
  wallet: "Wallet",
  upi_app: "UPI App",
  payment_orchestration: "Payment Orchestration",
  merchant_of_record: "Merchant of Record",
  banking_api_infra: "Banking API Infra",
  embedded_finance_infra: "Embedded Finance Infra",
  neobanking_infra: "Neobanking Infra",
  nbfc: "NBFC",
  lending_platform: "Lending Platform",
  loan_aggregator: "Loan Aggregator",
  bnpl: "BNPL",
  broker: "Broker",
  wealth_platform: "Wealth Platform",
  robo_advisor: "Robo Advisor",
  fd_provider: "FD Provider",
  rd_provider: "RD Provider",
  issuer: "Issuer",
  marketplace: "Marketplace",
  distribution_api: "Distribution API",
  embedded_distribution: "Embedded Distribution",
  insurtech: "Insurtech",
  insurance_aggregator: "Insurance Aggregator",
  core_banking: "Core Banking",
  ledger_infra: "Ledger Infra",
  kyc_aml: "KYC/AML",
  fraud_risk: "Fraud/Risk",
  regtech: "Regtech",
  bigtech_finance: "Bigtech Finance",
  crypto_fintech: "Crypto Fintech",
  cross_border_payments: "Cross-border Payments",
};

// Scoring weights for classification signals
export const CLASSIFICATION_SIGNALS = {
  payment_gateway: ["payment gateway", "checkout", "upi", "mdr", "transaction", "razorpay", "cashfree", "stripe", "payu"],
  wallet: ["wallet", "digital wallet", "mobile wallet", "paytm", "mobikwik"],
  upi_app: ["upi app", "phonepe", "google pay", "gpay", "tez"],
  payment_orchestration: ["payment orchestration", "juspay"],
  merchant_of_record: ["merchant of record", "dodo", "paddle", "global tax"],
  banking_api_infra: ["banking api", "account aggregator", "setu", "decentro", "yap", "open.tech"],
  nbfc: ["nbfc", "shriram", "bajaj", "loan", "lending", "fixed deposit"],
  broker: ["broker", "zerodha", "groww", "upstox", "trading", "stocks", "demat"],
  marketplace: ["marketplace", "loan marketplace", "comparison", "paisabazaar", "bankbazaar"],
} as const;