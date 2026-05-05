import { Badge } from "@/components/ui/badge";
import type { StatusBarProps } from "@/types";

export function StatusBar({ editor, mode }: StatusBarProps) {
  return (
    <div className="editor-statusbar">
      <Badge
        variant={mode === "edit" ? "default" : "outline"}
        className="text-[10px] h-5 font-normal"
      >
        {mode === "edit" ? "Editing" : "Preview"}
      </Badge>
      <span className="text-[10px] text-muted-foreground">
        {editor.getText().length} chars
      </span>
    </div>
  );
}
