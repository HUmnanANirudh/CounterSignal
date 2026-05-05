import { ToolbarProps } from "@/types/editor";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ToolbarButton } from "./toolbar-button";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Minus,
  Undo,
  Redo,
  Download,
  FileText,
  Pencil,
  Eye,
} from "lucide-react";

export function Toolbar({
  editor,
  mode,
  onModeChange,
  onExportPdf,
  onCopyMarkdown,
  hasMarkdown,
}: ToolbarProps) {
  const isPreview = mode === "preview";

  return (
    <div className="editor-toolbar">
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

        {/* Only show formatting controls in edit mode */}
        {!isPreview && (
          <>
            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Text formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold"
            >
              <Bold className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic"
            >
              <Italic className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="size-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Headings */}
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              active={editor.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="size-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Bullet list"
            >
              <List className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Numbered list"
            >
              <ListOrdered className="size-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Block elements */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              title="Quote"
            >
              <Quote className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive("codeBlock")}
              title="Code block"
            >
              <Code className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal rule"
            >
              <Minus className="size-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo className="size-3.5" />
            </ToolbarButton>
          </>
        )}
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
