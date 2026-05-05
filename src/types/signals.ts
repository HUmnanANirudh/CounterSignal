export type NegativeSignalType =
  | "trust_risk"
  | "financial_health"
  | "regulatory"
  | "reliability"
  | "strategy_drift"
  | "general";

export type NormalizedSignalType =
  | NegativeSignalType
  | "pricing_complaint"
  | "support_issue"
  | "integration_issue"
  | "onboarding_delay"
  | "ease_of_use_issue"
  | "quality_issue"
  | "reliability_issue"
  | "payout_issue"
  | "account_issue"
  | "refund_issue"
  | "positive"
  | "feature";

export type SignalSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface SignalAppearance {
  normalizedType: string;
  text: string;
  citationIds: string[];
  domains: Set<string>;
  domainTypes: Set<string>;
  severity: SignalSeverity;
}
