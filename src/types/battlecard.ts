import { RelationshipMode, StackPosition } from "./entity";

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

export type EventType =
  | "LICENSE_ACTION"
  | "REGULATORY_ENFORCEMENT"
  | "STRATEGIC_RESTRUCTURE"
  | "FUNDING"
  | "PRODUCT_LAUNCH"
  | "MARKET_EXPANSION"
  | "financial_result"
  | "operational_incident"
  | "leadership_change"
  | "compliance_event"
  | "unknown";

export interface RecentMove {
  name: string;
  date: string;
  impact: "high" | "medium" | "low";
  type: EventType;
  strategic_relevance?: string;
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

export interface MarketRelationshipModel {
  primary: RelationshipMode;
  secondary: RelationshipMode[];
  overlap_score: number;
}

export type CapabilityOrigin = "native" | "partnered" | "orchestrated" | "indirect" | "absent" | "unknown";

export interface AE_BATTLECARD {
  company_overview: string;
  competitor_type: CompetitorType;
  entity_role?: string; // e.g. "competitor", "supplier"
  category_contrast: string;
  relationship_mode?: RelationshipMode; // Legacy field
  relationship?: MarketRelationshipModel; // New compositional model
  quick_dismisses: string[];
  objection_handling: AEObjectionHandling[];
  persona_objections: PersonaObjection[];
  why_we_win: string[];
  why_we_lose: string[];
  pricing_positioning: string;
  FUD_responses: string[];
  proof_points: string[];
  compete_aggressively_when: string[];
  signal_trace: SignalTrace[];
  strategic_overlap?: Record<string, {
    exists: boolean;
    ownership: CapabilityOrigin;
    evidence: string;
    confidence: number;
  }>;
  strategic_relationship?: string;
  strategic_risks?: string[];
  recent_launches?: RecentMove[];
  strategic_events?: RecentMove[];
  executive_signal?: string;
  pricing_framing?: string[];
  customer_sentiment?: {
    positives: string[];
    negatives: string[];
  };
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
  entityScore: number;     // Identity & category accuracy
  capabilityScore: number; // Feature/overlap accuracy
  strategicScore: number;  // GTM reasoning/implication accuracy
  marketScore: number;     // Category/macro understanding
  evidenceScore: number;   // Source quality & diversity
  overallScore: number;
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
  relationshipMode: RelationshipMode;
  stackPosition: StackPosition;

  VARS_layer: VARSLayer;
  objection_handling: ObjectionHandling[];

  AE_BATTLECARD: AE_BATTLECARD;

  signals?: Signal[];

  sourceMap: Record<string, string[]>;
  citations: Citation[];
  confidence: Confidence;
  dataGaps: string[];

  // Structured sentiment analysis (Step 2)
  sentiment_analysis?: import("./sentiment").SentimentAnalysis;

  // Pricing evidence (Step 3)
  pricing_evidence?: import("./sentiment").PricingEvidence[];

  // Clustered events (Step 4)
  event_clusters?: import("./sentiment").EventCluster[];
}

export interface BattlecardInput {
  competitorName: string;
}