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

export async function runPipeline(
  competitor: string,
  callbacks: PipelineCallbacks
): Promise<void> {
  const startTime = Date.now();

  try {
    callbacks.onStageChange("searching", `Researching ${competitor}...`);
    const { citations, rawContent } = await search(competitor);

    if (citations.length === 0) {
      throw new Error("Insufficient search results. Try a more specific competitor name.");
    }

    callbacks.onStageChange("searching", `Found ${citations.length} sources, preprocessing...`);
    const preprocessed = preprocess(rawContent);

    callbacks.onStageChange("extracting", "Extracting structured intelligence...");
    const extracted = await extract(preprocessed, competitor);

    callbacks.onStageChange("deriving", "Deriving signals and citation mapping...");
    const { signals, sourceMap } = deriveSignals(preprocessed, citations);
    const confidence = calculateConfidence(citations.length, signals, citations);

    callbacks.onStageChange("vars", "Generating VARS positioning and objection handling...");
    const { vars_layer, objection_handling } = await generateVarsAndObjections(
      extracted,
      signals,
      sourceMap,
      citations
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