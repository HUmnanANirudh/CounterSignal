export type SentimentTopic =
  | "support"
  | "pricing"
  | "reliability"
  | "onboarding"
  | "api_quality"
  | "settlement_speed"
  | "compliance"
  | "ux"
  | "documentation"
  | "hidden_fees"
  | "account_holds"
  | "integration_friction";

export type SentimentPolarity = "positive" | "negative" | "mixed" | "neutral";

export interface SentimentSignal {
  id: string;
  polarity: SentimentPolarity;
  topic: SentimentTopic;
  quote: string; // Exact or near-exact quote from user
  source: string; // Domain source
  sourceType: "forum" | "review" | "app_review" | "employment" | "news";
  sourceUrl?: string;
  date?: string;
  confidence: number; // 0-1, based on source quality + clarity
  citationId?: string;
}

export interface SentimentCluster {
  topic: SentimentTopic;
  polarity: SentimentPolarity;
  pattern: "recurring" | "emerging" | "isolated";
  patternConfidence: "HIGH" | "MEDIUM" | "LOW";
  frequency: number; // Number of signals in cluster
  signals: SentimentSignal[];
  summary: string; // Human-readable pattern description
  evidence: string; // Representative quote
}

export interface PricingEvidence {
  model:
    | "MDR"
    | "subscription"
    | "usage_based"
    | "SaaS"
    | "take_rate"
    | "enterprise_contract"
    | "float_income"
    | "spread_based"
    | "unknown";

  evidence: string; // Direct quote or specific description
  confidence: "HIGH" | "MEDIUM" | "LOW";
  source: string;
  sourceUrl?: string;
  citationId?: string;
}

export interface FinancialEvent {
  id: string;
  type: import("./battlecard").EventType;

  eventFamily: string; // e.g., "RBI Enforcement", "Loss Reporting"
  date: string;
  headline: string;
  implications: string[];
  sources: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  citationIds: string[];
}

export interface EventCluster {
  eventFamily: string;
  headline: string;
  dateRange: string;
  implications: string[];
  events: FinancialEvent[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Sentiment analysis result for a competitor.
 * Produced during preprocessing, consumed during rendering.
 */
export interface SentimentAnalysis {
  clusters: SentimentCluster[];
  totalSignals: number;
  uniqueTopics: Set<SentimentTopic>;
  overallPolarity: SentimentPolarity;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidenceSources: { domain: string; count: number }[];
  gaps: string[]; // Topics with no signals
}