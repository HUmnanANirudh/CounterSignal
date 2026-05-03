import { Battlecard } from "./battlecard";

export interface ExtractedIntelligence {
  positioning: { tagline: string; targetSegments: string[]; differentiators: string[] };
  pricing_posture: { model: string; entryPrice: string; opacity: "clear" | "opaque" };
  customer_truths: { positives: string[]; negatives: string[]; keyComplaints: string[] };
}

export interface Signal {
  id: string;
  type: "pricing" | "complaint" | "launch" | "feature" | "positive";
  value: string;
  citationIds: string[];
  normalizedType?: string;
}

export type PipelineStage =
  | "idle"
  | "searching"
  | "preprocessing"
  | "extracting"
  | "deriving"
  | "primitives"
  | "vars"
  | "rendering"
  | "complete"
  | "error";

export interface PipelineState {
  stage: PipelineStage;
  message: string;
}
export interface PipelineIndicatorProps {
  currentStage: PipelineStage;
  stages: PipelineStage[];
}

export interface SSEMessage {
  type: "status" | "chunk" | "done" | "error";
  stage?: PipelineStage;
  message?: string;
  content?: string;
  battlecard?: Battlecard;
}