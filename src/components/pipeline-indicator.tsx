import type { PipelineStage,PipelineIndicatorProps } from "@/types";

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: "searching", label: "Searching" },
  { key: "extracting", label: "Extracting" },
  { key: "deriving", label: "Deriving" },
  { key: "vars", label: "VARS" },
  { key: "rendering", label: "Rendering" },
];

export function PipelineIndicator({ currentStage, stages }: PipelineIndicatorProps) {

  return (
    <div className="flex items-center gap-2 text-sm">
      {STAGES.map((stage) => {
        const isComplete = stages.includes(stage.key) && stage.key !== currentStage;
        const isCurrent = stage.key === currentStage;

        let icon = "[ ]";
        if (isComplete) icon = "[✓]";
        else if (isCurrent) icon = "[...]";

        return (
          <span
            key={stage.key}
            className={
              isComplete
                ? "text-green-600 dark:text-green-400"
                : isCurrent
                ? "text-blue-600 dark:text-blue-400 animate-pulse"
                : "text-muted-foreground"
            }
          >
            {icon} {stage.label}
          </span>
        );
      })}
    </div>
  );
}