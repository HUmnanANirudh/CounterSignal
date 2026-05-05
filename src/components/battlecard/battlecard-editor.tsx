import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Toolbar, StatusBar } from "@/components/editor";
import type { BattlecardEditorProps, EditorMode } from "@/types";

export function BattlecardEditor({
  html,
  onChange,
  onExportPdf,
  markdown,
  onCopyMarkdown,
}: BattlecardEditorProps) {
  const [mode, setMode] = useState<EditorMode>("edit");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: html,
    editable: mode === "edit",
    editorProps: {
      attributes: {
        class: "battlecard-editor-content",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Toggle editable when mode changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(mode === "edit");
    }
  }, [mode, editor]);

  // Sync content when incoming HTML changes (new battlecard generated)
  useEffect(() => {
    if (editor && html && editor.getHTML() !== html) {
      editor.commands.setContent(html);
    }
  }, [html, editor]);

  const handleExportPdf = useCallback(() => {
    if (!editor) return;
    onExportPdf?.(editor.getHTML());
  }, [editor, onExportPdf]);

  const handleCopyMarkdown = useCallback(() => {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown).then(() => {
      toast.success("Markdown copied to clipboard");
    });
    onCopyMarkdown?.();
  }, [markdown, onCopyMarkdown]);

  if (!editor) return null;

  return (
    <Card className="overflow-hidden border border-border/60 shadow-lg">
      <Toolbar
        editor={editor}
        mode={mode}
        onModeChange={setMode}
        onExportPdf={handleExportPdf}
        onCopyMarkdown={handleCopyMarkdown}
        hasMarkdown={!!markdown}
      />

      <div
        className={`editor-wrapper ${mode === "preview" ? "preview-mode" : "edit-mode"}`}
      >
        <EditorContent editor={editor} className="battlecard-editor" />
      </div>

      <StatusBar editor={editor} mode={mode} />
    </Card>
  );
}
