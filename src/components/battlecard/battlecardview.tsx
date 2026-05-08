"use client"

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback } from "react";
import { markdownToHtml } from "@/lib/markdown-to-html";
import { exportHtmlToPdf } from "@/lib/export-pdf";
import { BattlecardEditor } from "./battlecard-editor";
import { BattleCardViewProps } from "@/types";
import { BattlecardSidebar } from "./battlecard-sidebar";

export function BattleCardView({ competitor, markdown, data, isLoading }: BattleCardViewProps) {

  const handleExportPdf = useCallback(
    (currentMarkdown: string) => {
      const htmlToExport = markdownToHtml(currentMarkdown);
      exportHtmlToPdf(htmlToExport, {
        title: `${competitor} Battlecard`,
        subtitle: `CounterSignal • ${new Date().toLocaleDateString()}`,
        filename: `${competitor.toLowerCase().replace(/\s+/g, "-")}-battlecard.pdf`,
      });
    },
    [competitor]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4 min-w-0">
          <Card className="p-6 space-y-6 h-100 border-border/60">
            <div className="space-y-3">
              <Skeleton className="h-9 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            <Separator className="opacity-50" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="space-y-4 pt-8">
              <Skeleton className="h-7 w-1/3" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </div>
          </Card>
        </div>
        
        <aside className="w-full lg:w-72 space-y-6">
          <Card className="p-4 space-y-6 border-border/60">
            <div className="space-y-2">
              <Skeleton className="h-3 w-1/2 mb-4" />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-7 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-6 border-border/60">
            <div className="space-y-2">
              <Skeleton className="h-3 w-1/2 mb-4" />
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-3 w-1/12" />
                    </div>
                    <Skeleton className="h-1.5 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </aside>
      </div>
    );
  }

  if (!markdown) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold">No battlecard {competitor}</h3>
        <p className="text-sm text-muted-foreground ">
          Enter a competitor name or press the <kbd className="text-sm mx-2">↵</kbd> to generate a battlecard
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-4 min-w-0">
        <BattlecardEditor
          onExportPdf={handleExportPdf}
          markdown={markdown}
        />
      </div>

      {data && <BattlecardSidebar data={data} />}
    </div>
  );
}
