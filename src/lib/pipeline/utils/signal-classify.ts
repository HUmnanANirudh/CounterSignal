import type { NormalizedSignalType, NegativeSignalType, SignalSeverity } from "@/types";

export const SIGNAL_NORMALIZATIONS: Record<string, NormalizedSignalType> = {
  "high fees": "pricing_complaint",
  "expensive": "pricing_complaint",
  "costly": "pricing_complaint",
  "overpriced": "pricing_complaint",
  "hidden fee": "pricing_complaint",
  "hidden cost": "pricing_complaint",
  "unpredictable pricing": "pricing_complaint",
  "transaction fee": "pricing_complaint",
  "slow onboarding": "onboarding_delay",
  "takes weeks": "onboarding_delay",
  "slow integration": "integration_complexity",
  "difficult setup": "integration_complexity",
  "integration delay": "integration_complexity",
  "confusing": "ease_of_use_issue",
  "poor support": "support_issue",
  "unresponsive": "support_issue",
  "buggy": "quality_issue",
  "broken": "quality_issue",
  "reliability": "reliability",
  "outage": "reliability",
  "payout delay": "payout_issue",
  "account freeze": "account_issue",
  "refund": "refund_issue",
  "api docs": "developer_experience",
  "sdk": "developer_experience",
};

export function normalizeSignal(text: string): NormalizedSignalType {
  const lower = text.toLowerCase();
  for (const [keyword, normalized] of Object.entries(SIGNAL_NORMALIZATIONS)) {
    if (lower.includes(keyword)) return normalized;
  }
  return "general";
}

export function classifyNegativeSignal(text: string): NegativeSignalType {
  const lower = text.toLowerCase();

  // 1. TRUST & RISK (High Priority)
  if (/fraud|security|breach|hack|credential|scam|leak|liability|custody|merchant.*custody/i.test(lower)) {
    return "trust_risk";
  }

  // 2. REGULATORY (Specific to laws/penalties)
  if (/rbi|fema|regulatory.*action|ban|suspended|penalty|fine|enforcement.*action|investigation|license.*cancel/i.test(lower)) {
    return "regulatory";
  }

  // 3. FINANCIAL HEALTH
  if (/loss|declin|revenue.*drop|widen.*loss|net.*loss|operating.*loss|burn|default|bankrupt|insolven/i.test(lower)) {
    return "financial_health";
  }

  // 4. OPERATIONAL / INFRA COMPLEXITY
  if (/complex.*infra|infrastructure.*complexity|multi.*bank.*orchestration|operational.*burden|manual.*process|manual.*reconciliation/i.test(lower)) {
    return "operational";
  }

  // 5. DEVELOPER EXPERIENCE
  if (/api.*documentation|developer.*experience|dx|sdk.*quality|sandbox.*issue|endpoint.*latency/i.test(lower)) {
    return "developer_experience";
  }

  // 6. MARKET POSITION
  if (/dominance|market.*share|distribution.*network|acquisition|merged|valuation.*drop/i.test(lower)) {
    return "market_position";
  }

  // 7. PRODUCT EXPANSION
  if (/launch|new.*feature|roll.*out|entering.*market|product.*roadmap/i.test(lower)) {
    return "product_expansion";
  }

  // 8. RELIABILITY
  if (/outage|service.*disrupt|downtime|system.*fail|latency|payout.*delay/i.test(lower)) {
    return "reliability";
  }

  return "general";
}

export function classifySeverity(normalizedType: string): SignalSeverity {
  const highSeverityTypes: string[] = ["trust_risk", "financial_health", "regulatory"];
  if (highSeverityTypes.includes(normalizedType)) return "HIGH";
  
  const mediumSeverityTypes: string[] = ["reliability", "operational", "strategy_drift", "market_position"];
  if (mediumSeverityTypes.includes(normalizedType)) return "MEDIUM";
  
  return "LOW";
}

export function classifySignalType(text: string, normalizedType?: string): NormalizedSignalType {
  if (normalizedType && normalizedType !== "general") {
    return normalizedType as NormalizedSignalType;
  }

  const negative = classifyNegativeSignal(text);
  if (negative !== "general") return negative;

  const lower = text.toLowerCase();
  if (/\b(high.*fee|expensive|overpriced|hidden.*cost|pricing.*issue)\b/i.test(lower) && !/\b(profitable|quarter|result|revenue)\b/i.test(lower)) return "pricing_complaint";
  if (/support.*delay|poor.*support|unresponsive/i.test(lower)) return "support_issue";
  if (/integration.*complex|difficult.*integration|api.*issue/i.test(lower)) return "integration_complexity";
  if (/slow.*onboard|onboard.*delay/i.test(lower)) return "onboarding_delay";
  if (/buggy|broken|glitch|quality.*issue/i.test(lower)) return "quality_issue";

  return "general";
}
