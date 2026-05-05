import type { BFSICategory } from "@/types/entity";
import type { ClassificationResult } from "@/types/pipeline";
import { getMarketRole } from "@/types/entity";

export type { ClassificationResult };

const CLASSIFICATION_SIGNALS: Record<string, Array<{ pattern: RegExp; weight: number }>> = {
  payment_gateway: [
    { pattern: /\b(payment\s*gateway|checkout|upi|mdr|transaction|payment\s*processor)\b/i, weight: 2 },
    { pattern: /\b(razorpay|cashfree|stripe|payu|easebuzz|billdesk)\b/i, weight: 2 },
  ],
  wallet: [
    { pattern: /\b(wallet|digital\s*wallet|mobile\s*wallet|prepaid\s*wallet)\b/i, weight: 2 },
    { pattern: /\b(paytm|mobikwik)\b/i, weight: 2 },
  ],
  upi_app: [
    { pattern: /\b(upi\s*app|unified\s*payments|payment\s*app)\b/i, weight: 2 },
    { pattern: /\b(phonepe|google\s*pay|gpay|tez)\b/i, weight: 2 },
  ],
  payment_orchestration: [
    { pattern: /\b(payment\s*orchestration|payment\s*rails)\b/i, weight: 2 },
    { pattern: /\b(juspay)\b/i, weight: 2 },
  ],
  merchant_of_record: [
    { pattern: /\b(merchant\s*of\s*record|global\s*tax|international\s*payment|tax\s*compliance)\b/i, weight: 2 },
    { pattern: /\b(dodo|paddle)\b/i, weight: 2 },
  ],
  banking_api_infra: [
    { pattern: /\b(banking\s*api|api\s*banking|bank\s*integration|account\s*aggregator)\b/i, weight: 2 },
    { pattern: /\b(AA\b|account\s*aggregator|upi\s*stack)\b/i, weight: 2 },
    { pattern: /\b(setu|decentro|yap|open\.?tech)\b/i, weight: 2 },
  ],
  embedded_finance_infra: [
    { pattern: /\b(embedded\s*finance|embedded\s*banking|BaaS)\b/i, weight: 2 },
    { pattern: /\b(fintech\s*infra)\b/i, weight: 1 },
  ],
  neobanking_infra: [
    { pattern: /\b(neobanking\s*infra|neo\s*bank)\b/i, weight: 2 },
    { pattern: /\b(zeta|m2p)\b/i, weight: 2 },
  ],
  nbfc: [
    { pattern: /\b(NBFC|non\s*banking\s*finance|loan\s*provider)\b/i, weight: 2 },
    { pattern: /\b(shriram|bajaj\s*finance|muthoot)\b/i, weight: 2 },
    { pattern: /\b(fixed\s*deposit|fd\s*interest|rd\s*interest)\b/i, weight: 1.5 },
  ],
  lending_platform: [
    { pattern: /\b(lending\s*platform|personal\s*loan|business\s*loan)\b/i, weight: 2 },
    { pattern: /\b(kreditbee|lendingkart|avail)\b/i, weight: 2 },
  ],
  loan_aggregator: [
    { pattern: /\b(loan\s*aggregator|loan\s*marketplace|credit\s*comparison)\b/i, weight: 2 },
    { pattern: /\b(paisabazaar|bankbazaar)\b/i, weight: 2 },
  ],
  bnpl: [
    { pattern: /\b(BNPL|buy\s*now\s*pay\s*later|lazypay|simpl)\b/i, weight: 2 },
  ],
  broker: [
    { pattern: /\b(stockbroker|brokerage|trading\s*platform|demat)\b/i, weight: 2 },
    { pattern: /\b(zerodha|groww|upstox|angel\s*one)\b/i, weight: 2 },
    { pattern: /\b(stocks|investing|mutual\s*funds?)\b/i, weight: 1 },
  ],
  wealth_platform: [
    { pattern: /\b(wealth\s*platform|wealth\s*management)\b/i, weight: 2 },
    { pattern: /\b(indmoney|kuvera|scripbox)\b/i, weight: 2 },
  ],
  robo_advisor: [
    { pattern: /\b(robo\s*advisor|automated\s*investing)\b/i, weight: 2 },
    { pattern: /\b(smallcase)\b/i, weight: 1.5 },
  ],
  fd_provider: [
    { pattern: /\b(FD\s*provider|fixed\s*deposit\s*provider)\b/i, weight: 2 },
  ],
  rd_provider: [
    { pattern: /\b(RD\s*provider|recurring\s*deposit\s*provider)\b/i, weight: 2 },
  ],
  issuer: [
    { pattern: /\b(issuer|product\s*issuer)\b/i, weight: 2 },
  ],
  marketplace: [
    { pattern: /\b(marketplace|comparison\s*platform|aggregator)\b/i, weight: 2 },
    { pattern: /\b(paisabazaar|bankbazaar|policybazaar)\b/i, weight: 2 },
  ],
  distribution_api: [
    { pattern: /\b(distribution\s*api|embedd?ed\s*distribution)\b/i, weight: 2 },
  ],
  embedded_distribution: [
    { pattern: /\b(B2B\s*SaaS.*financial|financial\s*product\s*distribution)\b/i, weight: 2 },
  ],
  insurtech: [
    { pattern: /\b(insurtech|insurance\s*tech)\b/i, weight: 2 },
    { pattern: /\b(acko|digit|olicybazaar)\b/i, weight: 2 },
  ],
  insurance_aggregator: [
    { pattern: /\b(insurance\s*aggregator)\b/i, weight: 2 },
    { pattern: /\b(policybazaar)\b/i, weight: 2 },
  ],
  core_banking: [
    { pattern: /\b(core\s*banking|core\s*banking\s*system)\b/i, weight: 2 },
    { pattern: /\b(finacle|mambu|oracle\s*fs)\b/i, weight: 2 },
  ],
  ledger_infra: [
    { pattern: /\b(ledger\s*infra|ledger\s*as\s*a\s*service)\b/i, weight: 2 },
  ],
  kyc_aml: [
    { pattern: /\b(KYC|AML|kyc\s*aml|identity\s*verification)\b/i, weight: 2 },
    { pattern: /\b(hyperverge|signzy|idfy)\b/i, weight: 2 },
  ],
  fraud_risk: [
    { pattern: /\b(fraud\s*risk|fraud\s*prevention|payment\s*risk)\b/i, weight: 2 },
    { pattern: /\b(riskified)\b/i, weight: 2 },
  ],
  regtech: [
    { pattern: /\b(regtech|regulatory\s*tech|compliance\s*tech)\b/i, weight: 2 },
    { pattern: /\b(perfios|idfy)\b/i, weight: 2 },
  ],
  bigtech_finance: [
    { pattern: /\b(bigtech\s*finance|google\s*pay|amazon\s*pay|meta\s*pay)\b/i, weight: 2 },
  ],
  crypto_fintech: [
    { pattern: /\b(crypto|bitcoin|blockchain\s*fintech)\b/i, weight: 2 },
    { pattern: /\b(coindcx|wazirx|zebpay)\b/i, weight: 2 },
  ],
  cross_border_payments: [
    { pattern: /\b(cross\s*border|cross-border|international\s*remittance)\b/i, weight: 2 },
    { pattern: /\b(wise|payoneer|remitly|stripe\s*atlas)\b/i, weight: 2 },
  ],
};

// Precedence order for tie-breaking
const CATEGORY_PRECEDENCE: BFSICategory[] = [
  "banking_api_infra",
  "merchant_of_record",
  "payment_orchestration",
  "payment_gateway",
  "wallet",
  "upi_app",
  "nbfc",
  "lending_platform",
  "loan_aggregator",
  "bnpl",
  "broker",
  "wealth_platform",
  "marketplace",
  "insurtech",
];

// Deterministic scoring classifier
export function classifyCompetitor(
  competitorName: string,
  content: string
): ClassificationResult {
  const combined = `${competitorName} ${content}`.toLowerCase();
  const scores: Record<string, number> = {};
  const signals: string[] = [];

  // Calculate scores for each category
  for (const [category, patternList] of Object.entries(CLASSIFICATION_SIGNALS)) {
    let categoryScore = 0;
    for (const { pattern, weight } of patternList) {
      if (pattern.test(combined)) {
        categoryScore += weight;
        signals.push(`${category}:${pattern.source.slice(0, 20)}`);
      }
    }
    scores[category] = categoryScore;
  }

  // Find max score
  let maxScore = 0;
  let maxCategory: BFSICategory = "payment_gateway"; // default

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category as BFSICategory;
    }
  }

  // Tie-breaking by precedence
  if (maxScore > 0) {
    const tiedCategories = Object.entries(scores)
      .filter(([, s]) => s === maxScore)
      .map(([c]) => c as BFSICategory);

    if (tiedCategories.length > 1) {
      for (const cat of CATEGORY_PRECEDENCE) {
        if (tiedCategories.includes(cat)) {
          maxCategory = cat;
          break;
        }
      }
    }
  }

  // Rule: Never return unknown if signals exist
  if (maxScore < 0.5) {
    maxCategory = "payment_gateway"; // Default fallback
  }

  const marketRole = getMarketRole(maxCategory);

  return {
    category: maxCategory,
    confidence: maxScore > 0 ? Math.min(1, maxScore / 6) : 0.3,
    signals: signals.slice(0, 6),
    isCompetitor: marketRole === "competitor",
    marketRole,
    reasoning: `Score: ${maxScore.toFixed(1)}, category: ${maxCategory}`,
  };
}

// Map BFSICategory to pricing model
export function getPricingModelForCategory(category: BFSICategory): string {
  switch (category) {
    case "payment_gateway":
    case "payment_aggregator":
      return "transaction + MDR (volume-linked)";
    case "wallet":
      return "transaction + MDR + wallet-based";
    case "upi_app":
      return "UPI interchange + MDR";
    case "payment_orchestration":
      return "API usage-based (per-call)";
    case "merchant_of_record":
      return "subscription + transaction markup";
    case "banking_api_infra":
    case "embedded_finance_infra":
      return "API usage-based (per-call)";
    case "nbfc":
    case "lending_platform":
      return "interest spread + processing fees";
    case "loan_aggregator":
      return "commission (CPA/CPL)";
    case "bnpl":
      return "merchant fees + late fees";
    case "broker":
      return "brokerage (per-trade)";
    case "wealth_platform":
      return "AUM fee + transaction charges";
    case "insurtech":
    case "insurance_aggregator":
      return "premium commission";
    default:
      return "opaque";
  }
}
