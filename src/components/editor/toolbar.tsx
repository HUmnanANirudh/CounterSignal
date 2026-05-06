import { ToolbarProps } from "@/types/editor";
import { Button } from "@/components/ui/button";
import { ToolbarButton } from "./toolbar-button";
import {
  Download,
  FileText,
  Pencil,
  Eye,
} from "lucide-react";

export function Toolbar({
  mode,
  onModeChange,
  onExportPdf,
  onCopyMarkdown,
  hasMarkdown,
}: ToolbarProps) {
  const isPreview = mode === "preview";

  return (
    <div className="editor-toolbar flex items-center justify-between p-2 border-b bg-muted/20">
      <div className="flex items-center gap-1 flex-wrap">
        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 mr-2">
          <ToolbarButton
            onClick={() => onModeChange("edit")}
            active={mode === "edit"}
            title="Edit mode"
          >
            <Pencil className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => onModeChange("preview")}
            active={isPreview}
            title="Preview mode"
          >
            <Eye className="size-3.5" />
          </ToolbarButton>
        </div>
      </div>

      {/* Right side — Export actions */}
      <div className="flex items-center gap-2 ml-auto">
        {hasMarkdown && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 h-7"
            onClick={onCopyMarkdown}
          >
            <FileText className="size-3" />
            Copy MD
          </Button>
        )}
        <Button
          variant="default"
          size="sm"
          className="text-xs gap-1.5 h-7"
          onClick={onExportPdf}
        >
          <Download className="size-3" />
          Export PDF
        </Button>
      </div>
    </div>
  );
}
