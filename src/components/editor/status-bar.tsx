import { Badge } from "@/components/ui/badge";
import type { StatusBarProps } from "@/types";

export function StatusBar({ contentLength, mode }: StatusBarProps) {
  return (
    <div className="editor-statusbar">
      <Badge
        variant={mode === "edit" ? "default" : "outline"}
        className="text-[10px] h-5 font-normal"
      >
        {mode === "edit" ? "Editing Markdown" : "Preview"}
      </Badge>
      <span className="text-[10px] text-muted-foreground">
        {contentLength} chars
      </span>
    </div>
  );
}
