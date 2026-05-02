import type { Battlecard } from "@/types/battlecard";

export function renderMarkdown(battlecard: Battlecard): string {
  const { competitor, VARS_layer, objection_handling, citations, confidence, dataGaps, positioning } = battlecard;

  const escape = (str: string | undefined | null): string => {
    if (!str) return "";
    return str.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/"/g, "'").slice(0, 300);
  };

  let md = `# ${competitor} Battlecard\n\n`;
  md += `**Generated:** ${new Date(battlecard.generatedAt).toLocaleString()} | **Confidence:** ${Math.round(confidence.score * 100)}%\n\n`;
  if (battlecard.competitor_summary) {
    md += `> ${escape(battlecard.competitor_summary)}\n\n`;
  }

  md += `## Positioning\n\n`;
  md += `**Tagline:** ${escape(positioning?.tagline)}\n\n`;
  md += `**Target Segments:** ${positioning?.targetSegments?.length ? positioning.targetSegments.join(", ") : "N/A"}\n\n`;
  md += `**Key Differentiators:**\n${positioning?.differentiators?.length ? positioning.differentiators.map(d => `- ${escape(d)}`).join("\n") : "- N/A"}\n\n`;

  md += `## Pricing Posture\n\n`;
  md += `**Model:** ${escape(battlecard.pricing_posture?.model)}\n`;
  md += `**Entry Price:** ${escape(battlecard.pricing_posture?.entryPrice)}\n`;
  md += `**Transparency:** ${battlecard.pricing_posture?.opacity === "clear" ? "✓ Transparent" : "⚠ Opaque (pricing not publicly available)"}\n\n`;

  if (battlecard.recent_moves?.length) {
    md += `## Recent Moves\n\n`;
    for (const move of battlecard.recent_moves) {
      md += `- **${escape(move.name)}** (${escape(move.date)}) — ${move.impact} impact\n`;
    }
    md += "\n";
  }

  const ct = battlecard.customer_truths;
  md += `## Customer Truths\n\n`;
  md += `**What they like:** ${ct?.positives?.length ? ct.positives.map(p => escape(p)).join("; ") : "Limited data"}\n\n`;
  md += `**What they dislike:** ${ct?.negatives?.length ? ct.negatives.map(n => escape(n)).join("; ") : "Limited data"}\n\n`;
  md += `**Key complaints:** ${ct?.keyComplaints?.length ? ct.keyComplaints.map(c => escape(c)).join("; ") : "Limited data"}\n\n`;

  md += `## VARS Layer\n\n`;
  md += `**Validate:** ${escape(VARS_layer?.validate)}\n\n`;
  md += `**Acknowledge:** ${escape(VARS_layer?.acknowledge)}\n\n`;
  md += `**Reframe:** ${escape(VARS_layer?.reframe)}\n\n`;
  md += `**Specify:** ${escape(VARS_layer?.specify)}\n\n`;

  if (objection_handling?.length) {
    md += `## Objection Handling\n\n`;
    for (const obj of objection_handling) {
      md += `**Objection:** "${escape(obj.objection)}"\n`;
      md += `**Counter:** ${escape(obj.counter)}\n`;
      md += `**Evidence:** [${obj.evidence}]\n\n`;
    }
  }

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