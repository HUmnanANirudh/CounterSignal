import type { Editor } from "@tiptap/react";
export interface BattlecardEditorProps {
  onChange?: (markdown: string) => void;
  onExportPdf?: (markdown: string) => void;
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
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onExportPdf: () => void;
  onCopyMarkdown?: () => void;
  hasMarkdown: boolean;
}

export interface StatusBarProps {
  contentLength: number;
  mode: EditorMode;
}

export interface PDFOptions {
  title?: string;
  subtitle?: string;
  filename?: string;
}
export type EditorMode = "edit" | "preview";

export interface BattleCardViewProps {
  competitor: string;
  markdown: string;
  isLoading: boolean;
}

export interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
}

export interface BattlecardResult {
  markdown: string;
  error?: string;
}