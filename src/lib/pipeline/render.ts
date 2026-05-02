import type { Battlecard } from "@/types/battlecard";

export function renderMarkdown(battlecard: Battlecard): string {
  const { competitor, AE_BATTLECARD, citations, confidence, dataGaps } = battlecard;

  const escape = (str: string | undefined | null): string => {
    if (!str) return "";
    return str.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/"/g, "'").slice(0, 300);
  };

  let md = `# ${competitor} Battlecard\n\n`;
  md += `**Generated:** ${new Date(battlecard.generatedAt).toLocaleString()} | **Confidence:** ${Math.round(confidence.score * 100)}%\n\n`;

  // Company Overview
  if (AE_BATTLECARD.company_overview) {
    md += `## Company Overview\n\n`;
    md += `${escape(AE_BATTLECARD.company_overview)}\n\n`;
  }

  // Quick Dismisses (1-liners for fast call use)
  if (AE_BATTLECARD.quick_dismisses?.length) {
    md += `## Quick Dismisses\n\n`;
    for (const dismiss of AE_BATTLECARD.quick_dismisses) {
      md += `- ${escape(dismiss)}\n`;
    }
    md += "\n";
  }

  // Objection Handling
  if (AE_BATTLECARD.objection_handling?.length) {
    md += `## Objection Handling\n\n`;
    for (const obj of AE_BATTLECARD.objection_handling) {
      md += `**Objection:** "${escape(obj.objection)}"\n`;
      md += `**Counter:** ${escape(obj.counter)}\n`;
      if (obj.evidence?.length) {
        md += `**Evidence:** ${obj.evidence.map(e => `[${e}]`).join(", ")}\n`;
      }
      md += "\n";
    }
  }

  // Why We Win
  if (AE_BATTLECARD.why_we_win?.length) {
    md += `## Why We Win\n\n`;
    for (const win of AE_BATTLECARD.why_we_win) {
      md += `- ${escape(win)}\n`;
    }
    md += "\n";
  }

  // Why We Lose
  if (AE_BATTLECARD.why_we_lose?.length) {
    md += `## Why We Lose\n\n`;
    for (const lose of AE_BATTLECARD.why_we_lose) {
      md += `- ${escape(lose)}\n`;
    }
    md += "\n";
  }

  // Pricing Positioning
  if (AE_BATTLECARD.pricing_positioning) {
    md += `## Pricing Positioning\n\n`;
    md += `${escape(AE_BATTLECARD.pricing_positioning)}\n\n`;
  }

  // Landmines
  if (AE_BATTLECARD.landmines?.length) {
    md += `## Landmines (Questions to Expose Gaps)\n\n`;
    for (const landmine of AE_BATTLECARD.landmines) {
      md += `- ${escape(landmine)}\n`;
    }
    md += "\n";
  }

  // FUD Responses
  if (AE_BATTLECARD.FUD_responses?.length) {
    md += `## FUD Flip\n\n`;
    for (const fud of AE_BATTLECARD.FUD_responses) {
      md += `- ${escape(fud)}\n`;
    }
    md += "\n";
  }

  // Proof Points
  if (AE_BATTLECARD.proof_points?.length) {
    md += `## Proof Points\n\n`;
    for (const proof of AE_BATTLECARD.proof_points) {
      md += `- ${escape(proof)}\n`;
    }
    md += "\n";
  }

  // Sources
  md += `## Sources\n\n`;
  for (const citation of citations) {
    md += `- **[${citation.id}]** ${escape(citation.title)} — ${escape(citation.source)}\n`;
    md += `  ${citation.url}\n`;
  }

  if (dataGaps?.length) {
    md += `\n**Data Gaps:** ${dataGaps.map(d => escape(d)).join(", ")}\n`;
  }

  return md;
}

export function renderSectionMarkdown(section: string, content: string): string {
  return `## ${section}\n\n${content}\n\n`;
}