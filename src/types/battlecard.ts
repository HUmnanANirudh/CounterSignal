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

export type CompetitorType = string;

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

export interface PersonaObjection {
  persona: "CTO" | "Founder" | "Compliance";
  objection: string;
  counter: string;
  landmine: string;
}

export interface AE_BATTLECARD {
  company_overview: string;
  competitor_type: CompetitorType;
  category_contrast: string;
  quick_dismisses: string[];
  objection_handling: AEObjectionHandling[]; // Legacy for backward compat
  persona_objections: PersonaObjection[]; // New targeted content
  why_we_win: string[];
  why_we_lose: string[];
  pricing_positioning: string;
  landmines: string[]; // Legacy
  FUD_responses: string[];
  proof_points: string[];
  compete_aggressively_when: string[];
  signal_trace: SignalTrace[];
  strategic_overlap?: Record<string, "native" | "partnered" | "partial" | "none">;
  strategic_relationship?: string;
  why_this_appears_in_deals?: string[];
  do_not_compete_when?: string[];
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
  entityScore: number;
  strategicScore: number;
  factors: string[];
}

export interface Signal {
  id: string;
  type: string;
  value: string; // The raw extracted chunk
  summary?: string; // Cleaned, max 15 words
  evidence?: string; // Cleaned sentence containing the signal
  citationIds: string[];
  normalizedType?: string;
  authorityScore?: number;
  corroborationCount?: number;
}

export interface Battlecard {
  competitor: string;
  generatedAt: string;
  researchDurationMs: number;

  positioning: Positioning;
  pricing_posture: PricingPosture;
  recent_moves: RecentMove[];
  customer_truths: CustomerTruths;

  VARS_layer: VARSLayer;
  objection_handling: ObjectionHandling[];

  AE_BATTLECARD: AE_BATTLECARD;

  signals?: Signal[];

  sourceMap: Record<string, string[]>;
  citations: Citation[];
  confidence: Confidence;
  dataGaps: string[];
}

export interface BattlecardInput {
  competitorName: string;
}