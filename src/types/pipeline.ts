// Pipeline Types - shared interfaces for the pipeline

export interface PipelineConfig {
  minDocuments: number;
  minDomains: number;
  recentDays: number;
  cacheTTL: number;
}

export const PIPELINE_CONFIG: PipelineConfig = {
  minDocuments: 5,
  minDomains: 2,
  recentDays: 180,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
};

// Signal types for signal derivation
export type SignalType =
  | "financial_event"
  | "regulatory_risk"
  | "product_capability"
  | "customer_sentiment"
  | "operational_risk";

export interface PreprocessedData {
  pricing_candidates: string[];
  review_blocks: string[];
  complaint_sentences: string[];
  feature_mentions: string[];
  dates: string[];
  raw_content: string;
}

// Extracted intelligence from LLM extraction
export interface ExtractedIntelligence {
  positioning: {
    tagline: string;
    targetSegments: string[];
    differentiators: string[];
  };
  pricing_posture: {
    model: string;
    entryPrice: string;
    tiers: Array<{ name: string; price: string; features: string[] }>;
    opacity: "clear" | "opaque";
  };
  customer_truths: {
    positives: string[];
    negatives: string[];
    keyComplaints: string[];
  };
  recent_moves?: Array<{ name: string; date: string }>;
}

// Search debug info
export interface SearchDebugInfo {
  entityConfidence: number;
  domainCount: number;
  sourcesByDomain: Record<string, number>;
  relevantResults: number;
  totalResults: number;
  minimalIntelligence?: {
    company_overview: string;
    key_insight: string;
    overlap: string;
  };
  inferredCategory?: {
    category: string;
    confidence: number;
  };
}

export interface SearchResult {
  citations: Array<{
    id: string;
    title: string;
    url: string;
    source: string;
    date?: string;
    score?: number;
  }>;
  rawContent: string;
  debugInfo: SearchDebugInfo;
  entityCategoryHint: string | null;
}
