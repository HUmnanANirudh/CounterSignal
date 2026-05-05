import type { ToolbarButtonProps } from "@/types/editor";

export function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        inline-flex items-center justify-center rounded-md
        size-7 text-sm transition-all duration-150
        ${
          active
            ? "bg-foreground/10 text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
        }
        ${disabled ? "opacity-30 pointer-events-none" : "cursor-pointer"}
      `}
    >
      {children}
    </button>
  );
}
