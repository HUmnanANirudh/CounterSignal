"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PipelineStage, Battlecard } from "@/types";
import { PipelineIndicator } from "@/components/pipeline-indicator";
import { BattlecardDisplay } from "@/components/battlecard-display";

const ALL_STAGES: PipelineStage[] = ["searching", "extracting", "deriving", "vars", "rendering"];

async function fetchBattlecard(competitorName: string, onStageChange: (stage: PipelineStage, message: string) => void, onChunk: (content: string) => void): Promise<Battlecard> {
  const response = await fetch("/api/battlecard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ competitorName }),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) throw new Error("No response body");

  let battlecard: Battlecard | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

    for (const line of lines) {
      try {
        const data = JSON.parse(line.slice(5));

        if (data.type === "status") {
          onStageChange(data.stage, data.message);
        } else if (data.type === "chunk") {
          onChunk(data.content);
        } else if (data.type === "done") {
          battlecard = data.battlecard;
        } else if (data.type === "error") {
          throw new Error(data.message);
        }
      } catch {
        // Skip malformed lines
      }
    }
  }

  if (!battlecard) {
    throw new Error("No battlecard received");
  }

  return battlecard;
}

export default function Home() {
  const [competitor, setCompetitor] = useState("");
  const [currentStage, setCurrentStage] = useState<PipelineStage>("idle");
  const [completedStages, setCompletedStages] = useState<PipelineStage[]>([]);
  const [markdown, setMarkdown] = useState("");
  const [markdownForPdf, setMarkdownForPdf] = useState("");
  const battlecardRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const battlecardQuery = useQuery({
    queryKey: ["battlecard"],
    queryFn: async () => {
      setMarkdown("");
      return fetchBattlecard(competitor, (stage) => {
        setCurrentStage(stage);
        if (stage !== "idle" && !ALL_STAGES.includes(stage as PipelineStage)) return;
        const stageIndex = ALL_STAGES.findIndex((s) => s === stage);
        if (stageIndex >= 0) {
          setCompletedStages(ALL_STAGES.slice(0, stageIndex + 1));
        }
      }, (content) => {
        setMarkdown((prev) => prev + content);
        setMarkdownForPdf((prev) => prev + content);
      });
    },
    enabled: false,
    retry: false,
  });

  const handleGenerate = () => {
    if (!competitor.trim()) return;
    queryClient.removeQueries({ queryKey: ["battlecard"] });
    setCurrentStage("searching");
    setCompletedStages([]);
    setMarkdown("");
    setMarkdownForPdf("");
    battlecardQuery.refetch();
  };

  const handleDownloadPdf = async () => {
    if (!battlecardQuery.data) return;

    try {
      const { default: jsPDF } = await import("jspdf");

      const competitor = battlecardQuery.data.competitor;
      const confidence = Math.round(battlecardQuery.data.confidence.score * 100);
      const generatedAt = new Date(battlecardQuery.data.generatedAt).toLocaleString();
      const markdown = markdownForPdf;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const addText = (text: string, size: number, isBold: boolean = false) => {
        pdf.setFontSize(size);
        pdf.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = pdf.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          if (y > 270) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, margin, y);
          y += size * 0.4;
        });
      };

      const addHeading = (text: string, size: number) => {
        y += 3;
        addText(text, size, true);
        y += 2;
      };

      addText(`${competitor} Battlecard`, 18, true);
      y += 2;
      addText(`Generated: ${generatedAt} | Confidence: ${confidence}%`, 9);
      y += 8;

      const lines = markdown.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          y += 3;
          continue;
        }
        if (trimmed.startsWith("# ")) {
          addHeading(trimmed.replace("# ", ""), 16);
        } else if (trimmed.startsWith("## ")) {
          addHeading(trimmed.replace("## ", ""), 13);
        } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          addText(trimmed.replace(/\*\*/g, ""), 10, true);
        } else if (trimmed.startsWith("- ")) {
          addText(trimmed, 9);
        } else {
          const cleanLine = trimmed
            .replace(/\*\*/g, "")
            .replace(/\[(citation-\d+)\]/g, "[$1]")
            .replace(/\|/g, " ");
          addText(cleanLine, 9);
        }
        y += 1;
      }

      pdf.save(`${competitor}-battlecard.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">CounterSignal</h1>
          <p className="text-muted-foreground">Real-time Competitive Sales Engine for BFSI AEs</p>
        </header>

        <div className="flex gap-4 mb-8">
          <input
            type="text"
            value={competitor}
            onChange={(e) => setCompetitor(e.target.value)}
            placeholder="Enter competitor name (e.g., Stripe, Plaid, Adyen)"
            className="flex-1 px-4 py-3 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
          <button
            onClick={handleGenerate}
            disabled={!competitor.trim() || battlecardQuery.isFetching}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {battlecardQuery.isFetching ? "Generating..." : "Generate"}
          </button>
        </div>

        {(battlecardQuery.isFetching || battlecardQuery.isError) && (
          <div className="mb-6 p-4 bg-muted rounded-md">
            <p className="text-sm font-medium mb-2">Pipeline Progress</p>
            <PipelineIndicator currentStage={currentStage} stages={completedStages} />
          </div>
        )}

        {battlecardQuery.isError && (
          <div className="p-4 mb-6 bg-destructive/10 text-destructive rounded-md">
            <p className="font-medium">Error</p>
            <p className="text-sm">{battlecardQuery.error?.message || "Failed to generate battlecard"}</p>
          </div>
        )}

        {markdown && (
          <div ref={battlecardRef}>
            <BattlecardDisplay
              markdown={markdown}
              battlecard={battlecardQuery.data}
              onDownloadPdf={battlecardQuery.data ? handleDownloadPdf : undefined}
            />
          </div>
        )}

        {!battlecardQuery.isFetching && !markdown && !battlecardQuery.isError && (
          <div className="text-center py-16 text-muted-foreground">
            <p>Enter a competitor name and click Generate to create a battlecard.</p>
          </div>
        )}
      </div>
    </div>
  );
}