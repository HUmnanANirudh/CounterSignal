import type { Editor } from "@tiptap/react";
export interface BattlecardEditorProps {
  html: string;
  onChange?: (html: string) => void;
  onExportPdf?: (html: string) => void;
  markdown?: string;
  onCopyMarkdown?: () => void;
}

export interface ToolbarButtonProps {
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

export interface ToolbarProps {
  editor: Editor;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onExportPdf: () => void;
  onCopyMarkdown?: () => void;
  hasMarkdown: boolean;
}

export interface StatusBarProps {
  editor: Editor;
  mode: EditorMode;
}

export interface PDFOptions {
  title?: string;
  subtitle?: string;
  filename?: string;
}
export type EditorMode = "edit" | "preview";