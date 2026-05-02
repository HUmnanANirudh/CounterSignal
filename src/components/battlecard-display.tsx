"use client";

import ReactMarkdown from "react-markdown";
import type { BattlecardDisplayProps  } from "@/types";


export function BattlecardDisplay({ markdown, battlecard, onDownloadPdf }: BattlecardDisplayProps) {
  return (
    <div className="space-y-4">
      {battlecard && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Confidence: {Math.round(battlecard.confidence.score * 100)}%</span>
            <span>|</span>
            <span>{battlecard.researchDurationMs}ms</span>
            {battlecard.dataGaps.length > 0 && (
              <>
                <span>|</span>
                <span className="text-amber-600 dark:text-amber-400">
                  Data gaps: {battlecard.dataGaps.join(", ")}
                </span>
              </>
            )}
          </div>
          {onDownloadPdf && (
            <button
              onClick={onDownloadPdf}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Download PDF
            </button>
          )}
        </div>
      )}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}