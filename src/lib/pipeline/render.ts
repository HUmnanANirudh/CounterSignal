import type { Battlecard } from "@/types/battlecard";

export function renderMarkdown(battlecard: Battlecard): string {
  const { competitor, AE_BATTLECARD, citations, confidence, dataGaps } = battlecard;

  const escape = (str: string | undefined | null): string => {
    if (!str) return "";
    return str.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/"/g, "'").slice(0, 300);
  };

  let md = `# ${competitor} Battlecard\n\n`;
  md += `**Type:** ${AE_BATTLECARD.competitor_type?.toUpperCase() || 'BFSI'} | **Confidence:** ${Math.round(confidence.score * 100)}% | **Generated:** ${new Date(battlecard.generatedAt).toLocaleString()}\n\n`;
  md += `---\n\n`;

  // Company Overview
  if (AE_BATTLECARD.company_overview) {
    md += `## Company Overview\n\n`;
    md += `${escape(AE_BATTLECARD.company_overview)}\n\n`;
  }

  // Competitor Summary
  if (battlecard.competitor_summary) {
    md += `## Competitor Summary\n\n`;
    md += `${escape(battlecard.competitor_summary)}\n\n`;
  }

  // Positioning
  if (battlecard.positioning) {
    md += `## Positioning\n\n`;
    if (battlecard.positioning.tagline) {
      md += `**Tagline:** ${escape(battlecard.positioning.tagline)}\n\n`;
    }
    if (battlecard.positioning.targetSegments?.length) {
      md += `**Target Segments:**\n`;
      for (const seg of battlecard.positioning.targetSegments) {
        md += `- ${escape(seg)}\n`;
      }
      md += "\n";
    }
    if (battlecard.positioning.differentiators?.length) {
      md += `**Key Differentiators:**\n`;
      for (const diff of battlecard.positioning.differentiators) {
        md += `- ${escape(diff)}\n`;
      }
      md += "\n";
    }
  }

  // Quick Dismisses
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
      md += `### "${escape(obj.objection)}"\n\n`;
      md += `**Counter:** ${escape(obj.counter)}\n\n`;
      if (obj.evidence?.length) {
        md += `**Evidence:** ${obj.evidence.map(e => `[${e}]`).join(", ")}\n\n`;
      }
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

  // Pricing Positioning (AE)
  if (AE_BATTLECARD.pricing_positioning) {
    md += `## Pricing Positioning\n\n`;
    md += `${escape(AE_BATTLECARD.pricing_positioning)}\n\n`;
  }

  // Pricing Posture (detailed)
  if (battlecard.pricing_posture) {
    md += `## Pricing Posture\n\n`;
    if (battlecard.pricing_posture.model) {
      md += `**Model:** ${escape(battlecard.pricing_posture.model)}\n\n`;
    }
    if (battlecard.pricing_posture.entryPrice) {
      md += `**Entry Price:** ${escape(battlecard.pricing_posture.entryPrice)}\n\n`;
    }
    if (battlecard.pricing_posture.opacity) {
      md += `**Pricing Opacity:** ${battlecard.pricing_posture.opacity === 'clear' ? '🟢 Clear' : '🔴 Opaque'}\n\n`;
    }
    if (battlecard.pricing_posture.tiers?.length) {
      md += `| Tier | Price | Features |\n`;
      md += `|------|-------|----------|\n`;
      for (const tier of battlecard.pricing_posture.tiers) {
        const features = tier.features?.map(f => escape(f)).join("; ") || "";
        md += `| ${escape(tier.name)} | ${escape(tier.price)} | ${features} |\n`;
      }
      md += "\n";
    }
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

  // Customer Truths
  if (battlecard.customer_truths) {
    md += `## Customer Truths\n\n`;
    if (battlecard.customer_truths.positives?.length) {
      md += `**What customers love:**\n`;
      for (const pos of battlecard.customer_truths.positives) {
        md += `- ${escape(pos)}\n`;
      }
      md += "\n";
    }
    if (battlecard.customer_truths.negatives?.length) {
      md += `**What customers dislike:**\n`;
      for (const neg of battlecard.customer_truths.negatives) {
        md += `- ${escape(neg)}\n`;
      }
      md += "\n";
    }
    if (battlecard.customer_truths.keyComplaints?.length) {
      md += `**Key complaints:**\n`;
      for (const complaint of battlecard.customer_truths.keyComplaints) {
        md += `- ${escape(complaint)}\n`;
      }
      md += "\n";
    }
  }

  // Recent Moves
  if (battlecard.recent_moves?.length) {
    md += `## Recent Moves\n\n`;
    md += `| Move | Date | Impact |\n`;
    md += `|------|------|--------|\n`;
    for (const move of battlecard.recent_moves) {
      const impactBadge = move.impact === "high" ? "High" : move.impact === "medium" ? "🟡 Medium" : "🟢 Low";
      md += `| ${escape(move.name)} | ${escape(move.date)} | ${impactBadge} |\n`;
    }
    md += "\n";
  }

  // Compete Aggressively When
  if (AE_BATTLECARD.compete_aggressively_when?.length) {
    md += `## Push Deal When...\n\n`;
    for (const trigger of AE_BATTLECARD.compete_aggressively_when) {
      md += `- ${escape(trigger)}\n`;
    }
    md += "\n";
  }

  // Signal Trace
  if (AE_BATTLECARD.signal_trace?.length) {
    md += `## Signal Trace\n\n`;
    md += `*Signal → Weapon traceability (show your reasoning)*\n\n`;
    for (const trace of AE_BATTLECARD.signal_trace) {
      md += `- **Signal:** "${escape(trace.signal)}"\n`;
      md += `  → **Weapon:** ${escape(trace.weapon)}\n`;
      if (trace.type) {
        md += `  *(Type: ${escape(trace.type)})*\n`;
      }
    }
    md += "\n";
  }

  // Sources
  if (citations?.length) {
    md += `## Sources\n\n`;
    for (const citation of citations) {
      md += `- **[${citation.id}]** ${escape(citation.title)} — ${escape(citation.source)}\n`;
      md += `  ${citation.url}\n`;
    }
    md += "\n";
  }

  // Data Gaps
  if (dataGaps?.length) {
    md += `## Data Gaps\n\n`;
    for (const gap of dataGaps) {
      md += `- ${escape(gap)}\n`;
    }
    md += "\n";
  }

  return md;
}

export function renderSectionMarkdown(section: string, content: string): string {
  return `## ${section}\n\n${content}\n\n`;
}