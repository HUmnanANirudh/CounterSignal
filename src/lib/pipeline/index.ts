import { search } from "./search";
import { preprocess } from "./preprocess";
import { extract } from "./extract";
import { deriveSignals, calculateConfidence } from "./signals";
import { generateVarsAndObjections } from "./vars-objections";
import { renderMarkdown } from "./render";
import type { Battlecard, PipelineStage } from "@/types";

export interface PipelineCallbacks {
  onStageChange: (stage: PipelineStage, message: string) => void;
  onChunk: (markdown: string) => void;
  onComplete: (battlecard: Battlecard) => void;
  onError: (error: Error) => void;
}

export const GLOBAL_TIMEOUT_MS = 55000;
export const STAGE_TIMEOUTS: Record<string, number> = {
  search: 12000,
  preprocess: 4000,
  extract: 10000,
  derive: 2000,
  vars: 10000,
  render: 5000,
};

async function withTimeout<T>(promise: Promise<T>, ms: number, stage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${stage} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function runPipeline(
  competitor: string,
  callbacks: PipelineCallbacks
): Promise<void> {
  const startTime = Date.now();
  let elapsed = 0;

  try {
    callbacks.onStageChange("searching", `Researching ${competitor}...`);
    const { citations, rawContent } = await withTimeout(search(competitor), STAGE_TIMEOUTS.search, "search");
    elapsed = Date.now() - startTime;

    if (citations.length === 0) {
      throw new Error("Insufficient search results. Try a more specific competitor name.");
    }

    if (elapsed > GLOBAL_TIMEOUT_MS - 10000) {
      callbacks.onStageChange("error", "Request timed out during search.");
      return;
    }

    callbacks.onStageChange("searching", `Found ${citations.length} sources, preprocessing...`);
    const preprocessed = await withTimeout(Promise.resolve(preprocess(rawContent)), STAGE_TIMEOUTS.preprocess, "preprocess");

    callbacks.onStageChange("extracting", "Extracting structured intelligence...");
    const extracted = await withTimeout(extract(preprocessed, competitor), STAGE_TIMEOUTS.extract, "extract");
    elapsed = Date.now() - startTime;

    callbacks.onStageChange("deriving", "Deriving signals and citation mapping...");
    const { signals, sourceMap } = deriveSignals(preprocessed, citations);
    const confidence = calculateConfidence(citations.length, signals, citations);

    if (elapsed > GLOBAL_TIMEOUT_MS - 10000) {
      callbacks.onStageChange("rendering", "Generating intelligence-only battlecard...");
      const battlecard: Battlecard = {
        competitor,
        generatedAt: new Date().toISOString(),
        researchDurationMs: elapsed,
        competitor_summary: extracted.competitor_summary,
        positioning: extracted.positioning,
        pricing_posture: { ...extracted.pricing_posture, tiers: [] },
        recent_moves: [],
        customer_truths: extracted.customer_truths,
        VARS_layer: { validate: "", acknowledge: "", reframe: "", specify: "" },
        objection_handling: [],
        sourceMap,
        citations: citations.slice(0, 6),
        confidence,
        dataGaps: ["VARS skipped due to timeout"],
      };
      callbacks.onChunk(renderMarkdown(battlecard));
      callbacks.onComplete(battlecard);
      return;
    }

    callbacks.onStageChange("vars", "Generating VARS positioning and objection handling...");
    const { vars_layer, objection_handling } = await withTimeout(
      generateVarsAndObjections(extracted, signals, sourceMap, citations),
      STAGE_TIMEOUTS.vars,
      "vars"
    );

    callbacks.onStageChange("rendering", "Rendering battlecard...");
    const battlecard: Battlecard = {
      competitor,
      generatedAt: new Date().toISOString(),
      researchDurationMs: Date.now() - startTime,
      competitor_summary: extracted.competitor_summary,
      positioning: extracted.positioning,
      pricing_posture: extracted.pricing_posture,
      recent_moves: [],
      customer_truths: extracted.customer_truths,
      VARS_layer: vars_layer,
      objection_handling,
      sourceMap,
      citations: citations.slice(0, 6),
      confidence,
      dataGaps: [],
    };

    const markdown = renderMarkdown(battlecard);
    callbacks.onChunk(markdown);
    callbacks.onComplete(battlecard);
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}