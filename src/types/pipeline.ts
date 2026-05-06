import type { BFSICategory, MarketRole } from "./entity";
import type { Citation } from "./battlecard";
import type { NegativeSignalType } from "./signals";

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
  cacheTTL: 24 * 60 * 60 * 1000,
};

export interface PreprocessedData {
  pricing_candidates: string[];
  review_blocks: string[];
  complaint_sentences: string[];
  feature_mentions: string[];
  dates: string[];
  raw_content: string;
  negative_signals: Array<{
    text: string;
    type: NegativeSignalType;
  }>;
}

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
  VARS?: {
    validate?: string;
    acknowledge?: string;
    reframe: string;
    specify: string;
  };
  strategic_overlap?: string[];
  recent_moves?: Array<{ name: string; date: string }>;
}

export interface ClassificationResult {
  category: BFSICategory;
  confidence: number;
  signals: string[];
  isCompetitor: boolean;
  marketRole: MarketRole;
  reasoning: string;
}

export interface ResolvedEntity {
  canonicalName: string;
  aliases: string[];
  domain: string | null;
  categoryHint: BFSICategory;
  confidence: number;
  classification: {
    primaryRole: MarketRole;
    category: BFSICategory;
  };
}

export interface EntityResolutionResult {
  resolved: ResolvedEntity | null;
  is_verified: boolean;
  match_sources: string[];
  rejection_reasons: string[];
  entityConfidence: number;
}

export type PipelineStage =
  | "searching"
  | "classifying"
  | "preprocessing"
  | "extracting"
  | "deriving"
  | "normalizing"
  | "primitives"
  | "vars"
  | "rendering";

export interface PipelineCallbacks {
  onStageChange: (stage: PipelineStage, message: string) => void;
  onChunk: (markdown: string) => void;
  onComplete: (battlecard: import("./battlecard").Battlecard) => void;
  onError: (error: Error) => void;
}

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
    category?: string;
  };
  inferredCategory?: {
    category: string;
    confidence: number;
    reasoning?: string;
  };
}

export interface SearchResult {
  citations: Citation[];
  rawContent: string;
  entityCategoryHint: string;
  debugInfo?: SearchDebugInfo;
}
