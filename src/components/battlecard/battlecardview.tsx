"use client"

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallback, useMemo, useState } from "react";
import { markdownToHtml } from "@/lib/markdown-to-html";
import { exportHtmlToPdf } from "@/lib/export-pdf";
import { BattlecardEditor } from "@/components/battlecard";
import { BattleCardViewProps } from "@/types";

export function BattleCardView({ competitor, markdown, isLoading }: BattleCardViewProps) {
  const html = useMemo(() => {
    if (!markdown) return "";
    return markdownToHtml(markdown);
  }, [markdown]);

  const [editedHtml, setEditedHtml] = useState("");

  const handleExportPdf = useCallback(
    (currentHtml: string) => {
      exportHtmlToPdf(currentHtml, {
        title: `${competitor} Battlecard`,
        subtitle: `CounterSignal • ${new Date().toLocaleDateString()}`,
        filename: `${competitor.toLowerCase().replace(/\s+/g, "-")}-battlecard.pdf`,
      });
    },
    [competitor]
  );

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Separator />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  if (!markdown) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold">No battlecard for {competitor}</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Enter a competitor name to generate a battlecard
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <BattlecardEditor
        html={html}
        onChange={setEditedHtml}
        onExportPdf={handleExportPdf}
        markdown={markdown}
      />
    </div>
  );
}
