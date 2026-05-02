export interface PricingTier {
  name: string;
  price: string;
  features: string[];
}

export interface Positioning {
  tagline: string;
  targetSegments: string[];
  differentiators: string[];
}

export interface PricingPosture {
  model: string;
  entryPrice: string;
  tiers: PricingTier[];
  opacity: "clear" | "opaque";
}

export interface RecentMove {
  name: string;
  date: string;
  impact: "high" | "medium" | "low";
}

export interface CustomerTruths {
  positives: string[];
  negatives: string[];
  keyComplaints: string[];
}

export interface VARSLayer {
  validate: string;
  acknowledge: string;
  reframe: string;
  specify: string;
}

export interface ObjectionHandling {
  objection: string;
  counter: string;
  evidence: string;
}

export interface Citation {
  id: string;
  title: string;
  url: string;
  source: string;
  date?: string;
  score?: number;
}

export interface Confidence {
  score: number;
  factors: string[];
}

export interface PreprocessedData {
  pricing_candidates: string[];
  review_blocks: string[];
  complaint_sentences: string[];
  feature_mentions: string[];
  dates: string[];
  raw_content: string;
}

export interface Battlecard {
  competitor: string;
  generatedAt: string;
  researchDurationMs: number;

  competitor_summary: string;
  positioning: Positioning;
  pricing_posture: PricingPosture;
  recent_moves: RecentMove[];
  customer_truths: CustomerTruths;

  VARS_layer: VARSLayer;

  objection_handling: ObjectionHandling[];

  sourceMap: Record<string, string[]>;
  citations: Citation[];
  confidence: Confidence;
  dataGaps: string[];
}

export interface BattlecardInput {
  competitorName: string;
}

export interface ExtractedData {
  competitor_summary: string;
  positioning: { tagline: string; targetSegments: string[]; differentiators: string[] };
  pricing_posture: { model: string; entryPrice: string; tiers: PricingTier[]; opacity: "clear" | "opaque" };
  recent_moves: Array<{ name: string; date: string; impact: "high" | "medium" | "low" }>;
  customer_truths: { positives: string[]; negatives: string[]; keyComplaints: string[] };
}

export interface BattlecardDisplayProps {
  markdown: string;
  battlecard?: Battlecard;
  onDownloadPdf?: () => void;
}