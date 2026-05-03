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

// AE-Aligned Battlecard Types
export type CompetitorType = "wallet" | "gateway" | "infra" | "NBFC" | "unknown";

export interface AEObjectionHandling {
  objection: string;
  counter: string;
  evidence: string[];
}

export interface SignalTrace {
  signal: string;
  weapon: string;
  type: string;
}

export interface AE_BATTLECARD {
  company_overview: string;
  competitor_type: CompetitorType;
  category_contrast: string;  // e.g. "Razorpay = payments layer; Blostem = BFSI infra layer"
  quick_dismisses: string[];
  objection_handling: AEObjectionHandling[];
  why_we_win: string[];
  why_we_lose: string[];
  pricing_positioning: string;
  landmines: string[];
  FUD_responses: string[];
  proof_points: string[];
  compete_aggressively_when: string[];
  signal_trace: SignalTrace[];
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

  positioning: Positioning;
  pricing_posture: PricingPosture;
  recent_moves: RecentMove[];
  customer_truths: CustomerTruths;

  // Legacy VARS layer (kept for backwards compatibility)
  VARS_layer: VARSLayer;
  objection_handling: ObjectionHandling[];

  // New AE-aligned layer
  AE_BATTLECARD: AE_BATTLECARD;

  sourceMap: Record<string, string[]>;
  citations: Citation[];
  confidence: Confidence;
  dataGaps: string[];
}

export interface BattlecardInput {
  competitorName: string;
}

export interface ExtractedData {
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