import type { Battlecard } from "@/types/battlecard";

export function renderMarkdown(battlecard: Battlecard): string {
  const { competitor, VARS_layer, objection_handling, citations, confidence, dataGaps } = battlecard;

  let md = `# ${competitor} — Battlecard\n\n`;
  md += `**Generated:** ${new Date(battlecard.generatedAt).toLocaleString()} | **Confidence:** ${Math.round(confidence.score * 100)}%\n\n`;
  md += `> ${battlecard.competitor_summary}\n\n`;

  md += `## Positioning\n`;
  md += `**Tagline:** ${battlecard.positioning.tagline}\n`;
  md += `**Target Segments:** ${battlecard.positioning.targetSegments.join(", ") || "N/A"}\n`;
  md += `**Key Differentiators:** ${battlecard.positioning.differentiators.map((d) => `- ${d}`).join("\n") || "N/A"}\n\n`;

  md += `## Pricing Posture\n`;
  md += `**Model:** ${battlecard.pricing_posture.model}\n`;
  md += `**Entry Price:** ${battlecard.pricing_posture.entryPrice}\n`;
  md += `**Transparency:** ${battlecard.pricing_posture.opacity === "clear" ? "✓ Transparent" : "⚠ Opaque (pricing not publicly available)"}\n\n`;

  if (battlecard.recent_moves.length > 0) {
    md += `## Recent Moves\n`;
    for (const move of battlecard.recent_moves) {
      md += `- **${move.name}** (${move.date}) — ${move.impact} impact\n`;
    }
    md += "\n";
  }

  md += `## Customer Truths\n`;
  md += `**What they like:** ${battlecard.customer_truths.positives.join("; ") || "Limited data"}\n`;
  md += `**What they dislike:** ${battlecard.customer_truths.negatives.join("; ") || "Limited data"}\n`;
  md += `**Key complaints:** ${battlecard.customer_truths.keyComplaints.join("; ") || "Limited data"}\n\n`;

  md += `## VARS Layer\n\n`;
  md += `| Stage | Statement |\n`;
  md += `|-------|----------|\n`;
  md += `| **Validate** | ${VARS_layer.validate} |\n`;
  md += `| **Acknowledge** | ${VARS_layer.acknowledge} |\n`;
  md += `| **Reframe** | ${VARS_layer.reframe} |\n`;
  md += `| **Specify** | ${VARS_layer.specify} |\n\n`;

  if (objection_handling.length > 0) {
    md += `## Objection Handling\n\n`;
    for (const obj of objection_handling) {
      md += `**Objection:** "${obj.objection}"\n`;
      md += `**Counter:** ${obj.counter}\n`;
      md += `**Evidence:** ${obj.evidence}\n\n`;
    }
  }

  md += `## Sources\n\n`;
  for (const citation of citations) {
    md += `- [${citation.id}] ${citation.title} — ${citation.source}\n`;
  }

  if (dataGaps.length > 0) {
    md += `\n**Data Gaps:** ${dataGaps.join(", ")}\n`;
  }

  return md;
}

export function renderSectionMarkdown(section: string, content: string): string {
  return `## ${section}\n\n${content}\n\n`;
}