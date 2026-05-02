import type { Battlecard } from "@/types/battlecard";

export function renderMarkdown(battlecard: Battlecard): string {
  const { competitor, VARS_layer, objection_handling, citations, confidence, dataGaps, positioning } = battlecard;

  const escapeForHtml = (str: string) => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  let md = `# ${competitor} — Battlecard\n\n`;
  md += `**Generated:** ${new Date(battlecard.generatedAt).toLocaleString()} | **Confidence:** ${Math.round(confidence.score * 100)}%\n\n`;
  if (battlecard.competitor_summary) {
    md += `> ${escapeForHtml(battlecard.competitor_summary)}\n\n`;
  }

  md += `## Positioning\n`;
  md += `**Tagline:** ${escapeForHtml(positioning.tagline || "N/A")}\n`;
  md += `**Target Segments:** ${positioning.targetSegments?.length ? positioning.targetSegments.map(s => escapeForHtml(s)).join(", ") : "N/A"}\n`;
  md += `**Key Differentiators:** ${positioning.differentiators?.length ? positioning.differentiators.map(d => `- ${escapeForHtml(d)}`).join("\n") : "N/A"}\n\n`;

  md += `## Pricing Posture\n`;
  md += `**Model:** ${escapeForHtml(battlecard.pricing_posture.model || "N/A")}\n`;
  md += `**Entry Price:** ${escapeForHtml(battlecard.pricing_posture.entryPrice || "N/A")}\n`;
  md += `**Transparency:** ${battlecard.pricing_posture.opacity === "clear" ? "✓ Transparent" : "⚠ Opaque (pricing not publicly available)"}\n\n`;

  if (battlecard.recent_moves?.length > 0) {
    md += `## Recent Moves\n`;
    for (const move of battlecard.recent_moves) {
      md += `- **${escapeForHtml(move.name)}** (${escapeForHtml(move.date)}) — ${move.impact} impact\n`;
    }
    md += "\n";
  }

  const ct = battlecard.customer_truths;
  md += `## Customer Truths\n`;
  md += `**What they like:** ${ct?.positives?.length ? ct.positives.map(p => escapeForHtml(p)).join("; ") : "Limited data"}\n`;
  md += `**What they dislike:** ${ct?.negatives?.length ? ct.negatives.map(n => escapeForHtml(n)).join("; ") : "Limited data"}\n`;
  md += `**Key complaints:** ${ct?.keyComplaints?.length ? ct.keyComplaints.map(c => escapeForHtml(c)).join("; ") : "Limited data"}\n\n`;

  md += `## VARS Layer\n\n`;
  md += `<table><thead><tr><th>Stage</th><th>Statement</th></tr></thead><tbody>`;
  md += `<tr><td><strong>Validate</strong></td><td>${escapeForHtml(VARS_layer.validate || "")}</td></tr>`;
  md += `<tr><td><strong>Acknowledge</strong></td><td>${escapeForHtml(VARS_layer.acknowledge || "")}</td></tr>`;
  md += `<tr><td><strong>Reframe</strong></td><td>${escapeForHtml(VARS_layer.reframe || "")}</td></tr>`;
  md += `<tr><td><strong>Specify</strong></td><td>${escapeForHtml(VARS_layer.specify || "")}</td></tr>`;
  md += `</tbody></table>\n\n`;

  if (objection_handling?.length > 0) {
    md += `## Objection Handling\n\n`;
    for (const obj of objection_handling) {
      md += `**Objection:** "${escapeForHtml(obj.objection)}"\n`;
      md += `**Counter:** ${escapeForHtml(obj.counter)}\n`;
      md += `**Evidence:** ${escapeForHtml(obj.evidence)}\n\n`;
    }
  }

  md += `## Sources\n\n`;
  for (const citation of citations) {
    md += `- [${citation.id}] ${escapeForHtml(citation.title)} — ${escapeForHtml(citation.source)}\n`;
  }

  if (dataGaps?.length > 0) {
    md += `\n**Data Gaps:** ${dataGaps.map(d => escapeForHtml(d)).join(", ")}\n`;
  }

  return md;
}

export function renderSectionMarkdown(section: string, content: string): string {
  return `## ${section}\n\n${content}\n\n`;
}