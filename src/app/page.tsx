"use client";

import { useState, useRef } from "react";
import type { PipelineStage, Battlecard } from "@/types";
import { PipelineIndicator } from "@/components/pipeline-indicator";
import { BattlecardDisplay } from "@/components/battlecard-display";

const ALL_STAGES: PipelineStage[] = ["searching", "extracting", "deriving", "vars", "rendering"];

export default function Home() {
  const [competitor, setCompetitor] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [battlecard, setBattlecard] = useState<Battlecard | null>(null);
  const [currentStage, setCurrentStage] = useState<PipelineStage>("idle");
  const [completedStages, setCompletedStages] = useState<PipelineStage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const battlecardRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!competitor.trim() || isGenerating) return;

    setIsGenerating(true);
    setMarkdown("");
    setBattlecard(null);
    setError(null);
    setCurrentStage("searching");
    setCompletedStages([]);

    try {
      const response = await fetch("/api/battlecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorName: competitor }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(5));

            if (data.type === "status") {
              setCurrentStage(data.stage);
              if (data.stage !== "idle" && !completedStages.includes(data.stage)) {
                const stageIndex = ALL_STAGES.findIndex((s) => s === data.stage);
                const prevStages = ALL_STAGES.slice(0, stageIndex);
                setCompletedStages((prev) => [...new Set([...prev, ...prevStages, data.stage])]);
              }
            } else if (data.type === "chunk") {
              setMarkdown((prev) => prev + data.content);
            } else if (data.type === "done") {
              setBattlecard(data.battlecard);
              setCurrentStage("complete");
              setCompletedStages([...ALL_STAGES]);
            } else if (data.type === "error") {
              setError(data.message);
              setCurrentStage("error");
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate battlecard");
      setCurrentStage("error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!battlecardRef.current) return;

    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const element = battlecardRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${battlecard?.competitor || "battlecard"}-battlecard.pdf`);
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
            disabled={!competitor.trim() || isGenerating}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate"}
          </button>
        </div>

        {(isGenerating || currentStage !== "idle") && (
          <div className="mb-6 p-4 bg-muted rounded-md">
            <p className="text-sm font-medium mb-2">Pipeline Progress</p>
            <PipelineIndicator currentStage={currentStage} stages={completedStages} />
          </div>
        )}

        {error && (
          <div className="p-4 mb-6 bg-destructive/10 text-destructive rounded-md">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {markdown && (
          <div ref={battlecardRef}>
            <BattlecardDisplay
              markdown={markdown}
              battlecard={battlecard ?? undefined}
              onDownloadPdf={battlecard ? handleDownloadPdf : undefined}
            />
          </div>
        )}

        {!isGenerating && !markdown && !error && (
          <div className="text-center py-16 text-muted-foreground">
            <p>Enter a competitor name and click Generate to create a battlecard.</p>
          </div>
        )}
      </div>
    </div>
  );
}