import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Toolbar, StatusBar } from "@/components/editor";
import type { BattlecardEditorProps, EditorMode } from "@/types";
import ReactMarkdown from "react-markdown";

export function BattlecardEditor({
  onChange,
  onExportPdf,
  markdown = "",
  onCopyMarkdown,
}: BattlecardEditorProps) {
  const [mode, setMode] = useState<EditorMode>("edit");
  const [content, setContent] = useState(markdown);

  // Sync content when incoming markdown changes
  useEffect(() => {
    setContent(markdown);
  }, [markdown]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContent(newValue);
    onChange?.(newValue);
  };

  const handleExportPdf = useCallback(() => {
    onExportPdf?.(content);
  }, [content, onExportPdf]);

  const handleCopyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success("Markdown copied to clipboard");
    });
    onCopyMarkdown?.();
  }, [content, onCopyMarkdown]);

  return (
    <Card className="overflow-hidden border border-border/60 shadow-lg flex flex-col h-[600px]">
      <Toolbar
        mode={mode}
        onModeChange={setMode}
        onExportPdf={handleExportPdf}
        onCopyMarkdown={handleCopyMarkdown}
        hasMarkdown={!!content}
      />

      <div className={`flex-1 bg-background ${mode === "preview" ? "overflow-auto" : "flex flex-col"}`}>
        {mode === "edit" ? (
          <textarea
            value={content}
            onChange={handleChange}
            className="flex-1 w-full p-4 resize-none focus:outline-none font-mono text-sm bg-transparent"
            placeholder="Enter markdown..."
          />
        ) : (
          <div className="p-6 prose prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <StatusBar contentLength={content.length} mode={mode} />
    </Card>
  );
}
