"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { BattlecardDisplayProps, Citation } from "@/types";

function CitationSpan({ id, children }: { id: string; children: React.ReactNode }) {
  return <span className="cursor-help underline decoration-dotted" title={`Citation: ${id}`}>{children}</span>;
}

function CitationSource({ citation }: { citation: Citation }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="cursor-help underline decoration-dotted decoration-2">{citation.id}</span>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-popover border border-border rounded-md shadow-lg text-xs">
          <span className="font-medium block truncate">{citation.title}</span>
          <span className="text-muted-foreground mt-1 block truncate">{citation.url}</span>
        </span>
      )}
    </span>
  );
}

export function BattlecardDisplay({ markdown, battlecard, onDownloadPdf }: BattlecardDisplayProps) {
  const citations = battlecard?.citations || [];

  const citationMap = new Map(citations.map(c => [c.id, c]));

  const components = {
    p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
      let processed = children;
      if (typeof children === 'string') {
        processed = children.replace(/\[(citation-\d+)\]/g, (match, id) => {
          return `<citation-span data-id="${id}">${match}</citation-span>`;
        });
      }
      return <p {...props}>{processed}</p>;
    }
  };

  const processedMarkdown = markdown.replace(/\[(citation-\d+)\]/g, (match, id) => {
    return `**${id}**`;
  });

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
        <ReactMarkdown
          components={{
            strong: ({ children, ...props }) => {
              const text = String(children);
              if (text.match(/^citation-\d+$/)) {
                const citation = citationMap.get(text);
                if (citation) {
                  return <CitationSource citation={citation} />;
                }
              }
              return <strong {...props}>{children}</strong>;
            }
          }}
        >
          {processedMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
}