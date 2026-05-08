import { Card} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Battlecard } from "@/types";
import { STACK_POSITION_LABELS } from "@/types/entity";

interface BattlecardSidebarProps {
  data: Battlecard;
}

export function BattlecardSidebar({ data }: BattlecardSidebarProps) {
  return (
    <aside className="w-full lg:w-72 space-y-6">
      <Card className="p-4 border-border/60 shadow-sm">
        <h3 className="text-sm font-medium  text-muted-foreground uppercase tracking-wider">Intelligence Profile</h3>
        <div className="space-y-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Relationship Mode</div>
            <Badge 
              variant="outline" 
              className={`capitalize ${
                data.relationshipMode === "DIRECT_COMPETITOR" ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400" :
                data.relationshipMode === "SUPPLY_SIDE_PARTNER" ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400" :
                data.relationshipMode === "INTERNAL_PROFILE" ? "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400" :
                data.relationshipMode === "INTEGRATION_TARGET" ? "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                data.relationshipMode === "UNKNOWN" ? "border-muted-foreground/50 bg-muted/50 text-muted-foreground" :
                "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400"
              }`}
            >
              {data.relationshipMode.replace("_", " ")}
            </Badge>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Stack Position</div>
            <div className="text-sm font-semibold capitalize">
              {STACK_POSITION_LABELS[data.stackPosition] || data.stackPosition.replace("_", " ")}
            </div>
          </div>
          </div>
      </Card>

      <Card className="p-4 border-border/60 shadow-sm">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Confidence Metrics</h4>
        <TooltipProvider>
          <div className="space-y-5">
            <MetricItem 
              label="Entity Certainty" 
              value={data.confidence.entityScore} 
              tooltip="Confidence in the identity and categorization of this entity."
            />
            <MetricItem 
              label="Capability Accuracy" 
              value={data.confidence.capabilityScore} 
              tooltip="Measures confidence in inferred infrastructure overlap based on available public evidence."
            />
            <MetricItem 
              label="Strategic Depth" 
              value={data.confidence.strategicScore} 
              tooltip="Accuracy of GTM reasoning and strategic implications derived from signals."
            />
            <div className="pt-2 border-t border-border/60">
              <MetricItem 
                label="Overall Reliability" 
                value={data.confidence.overallScore} 
                tooltip="Aggregated confidence score for this intelligence report."
                isLarge
              />
            </div>
          </div>
        </TooltipProvider>
      </Card>
    </aside>
  );
}

function MetricItem({ label, value, tooltip, isLarge = false }: { label: string; value: number; tooltip: string; isLarge?: boolean }) {
  const percentage = Math.round(value * 100);
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`text-muted-foreground ${isLarge ? "text-sm font-semibold" : "text-[11px] font-medium"}`}>{label}</span>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3 w-3 text-muted-foreground/50 cursor-help outline-none" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-64 text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        <span className={`${isLarge ? "text-lg font-bold" : "text-sm font-bold"}`}>{percentage}%</span>
      </div>
      <div className={`w-full bg-secondary/50 rounded-full ${isLarge ? "h-2" : "h-1.5"}`}>
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            value > 0.7 ? "bg-green-500" : value > 0.4 ? "bg-orange-500" : "bg-red-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
