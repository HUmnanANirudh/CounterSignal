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
  "slow integration": "integration_issue",
  "difficult setup": "ease_of_use_issue",
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
};

export function normalizeSignal(text: string): NormalizedSignalType {
  const lower = text.toLowerCase();
  for (const [keyword, normalized] of Object.entries(SIGNAL_NORMALIZATIONS)) {
    if (lower.includes(keyword)) return normalized;
  }
  return "general";
}

const NEGATIVE_CONTEXT = /investigation|violation|penalty|fraud allegation|money launder|regulatory action|outage|chargeback issue|breach|fine|lawsuit|class action|scam|freeze|loss|bankrupt|vulnerabilit|exploit|hack/i;

export function classifyNegativeSignal(text: string): NegativeSignalType {
  const lower = text.toLowerCase();

  if (/fraud|security|compliance|data|credential/i.test(lower)) {
    if (NEGATIVE_CONTEXT.test(lower) || /scam|breach|leak|class.*action|lawsuit/i.test(lower)) {
      return "trust_risk";
    }
  }
  if (/₹\s*\d+\s*(?:cr|crore)|money.*launder|sanction.*popup/i.test(lower)) {
    return "trust_risk";
  }

  if (/rbi|regulatory|ban|suspended|compliance.*issue|penalty|fine|sec.*fine|enforcement.*action|investigation/i.test(lower)) {
    return "regulatory";
  }
  if (/loss|declin|revenue.*drop|widen.*loss|net.*loss|operating.*loss|default|bankrupt|insolven/i.test(lower)) {
    return "financial_health";
  }
  if (/outage|service.*disrupt|downtime|system.*fail|breach|leak/i.test(lower)) {
    return "reliability";
  }
  if (/pivot|restructur|shut.*down|close.*operation|layoff/i.test(lower)) {
    return "strategy_drift";
  }

  return "general";
}

export function classifySeverity(normalizedType: string): SignalSeverity {
  const highSeverityTypes = ["trust_risk", "financial_health", "regulatory"];
  if (highSeverityTypes.includes(normalizedType)) return "HIGH";
  if (normalizedType === "reliability" || normalizedType === "strategy_drift") return "MEDIUM";
  return "LOW";
}

export function classifySignalType(text: string, normalizedType?: string): NormalizedSignalType {
  if (normalizedType && normalizedType !== "general") {
    return normalizedType as NormalizedSignalType;
  }

  // Check negative signals first
  const negative = classifyNegativeSignal(text);
  if (negative !== "general") return negative;

  const lower = text.toLowerCase();
  if (/high.*fee|expensive|overpriced|hidden.*cost|pricing.*issue|costly/i.test(lower)) return "pricing_complaint";
  if (/support.*delay|poor.*support|unresponsive|support.*issue/i.test(lower)) return "support_issue";
  if (/integration.*complex|difficult.*integration|api.*issue/i.test(lower)) return "integration_issue";
  if (/slow.*onboard|onboard.*delay|weeks.*to.*start/i.test(lower)) return "onboarding_delay";
  if (/buggy|broken|glitch|quality.*issue/i.test(lower)) return "quality_issue";

  return "general";
}
