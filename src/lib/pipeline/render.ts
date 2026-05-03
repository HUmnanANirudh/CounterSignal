import type { Battlecard } from "@/types/battlecard";

interface RenderOptions {
  /** Show signal trace (demo mode only) */
  showSignalTrace?: boolean;
  /** Max length for single-line statements */
  maxLineLength?: number;
}

// Text sanitization - AE-ready language
function sanitize(text: string | undefined | null, maxLen = 200): string {
  if (!text) return "";

  let cleaned = text
    // Remove markdown artifacts
    .replace(/^##\s*/gm, "")
    .replace(/^#+\s*/gm, "")
    // Remove URLs as standalone content
    .replace(/https?:\/\/[^\s]+/g, "")
    // Remove incomplete sentences (ending mid-word or with dots)
    .replace(/\.\.\.$/g, "")
    .replace(/\s+\.\s+/g, ". ")
    // Fix broken sentence fragments (common LLM artifacts)
    .replace(/\b(has|have|had)\.\s+(for|with|when|then)\b/gi, ". ")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Truncate at sentence boundary to avoid fragments
  if (cleaned.length > maxLen) {
    const lastSentence = cleaned.slice(0, maxLen).lastIndexOf(".");
    if (lastSentence > maxLen * 0.6) {
      cleaned = cleaned.slice(0, lastSentence + 1);
    } else {
      cleaned = cleaned.slice(0, maxLen) + "...";
    }
  }

  // Final cleanup
  cleaned = cleaned
    .replace(/[""]/g, '"')
    .replace(/'/g, "'")
    .replace(/\|/g, "\\|");

  return cleaned;
}

// Clean citation reference
function cite(citationId: string | undefined): string {
  return citationId ? `[${citationId}]` : "";
}

// Ensure text is a complete sentence
function completeSentence(text: string): string {
  if (!text) return "";
  // Add trailing period if missing
  if (!/[.!?]$/.test(text.trim())) {
    return text.trim() + ".";
  }
  return text;
}

// Remove duplicate objections by intent
function deduplicateObjections(objections: Array<{ objection: string; counter: string; evidence: string[] }>): typeof objections {
  const seen = new Set<string>();
  return objections.filter(obj => {
    // Normalize intent (lowercase, remove quotes)
    const intent = obj.objection.toLowerCase().replace(/[""]/g, "").trim();
    if (seen.has(intent)) return false;
    seen.add(intent);
    return true;
  });
}

export function renderMarkdown(battlecard: Battlecard, options: RenderOptions = {}): string {
  const { competitor, AE_BATTLECARD, citations, confidence, dataGaps } = battlecard;
  const showSignalTrace = options.showSignalTrace ?? false;

  // Confidence cap based on signal count
  const signalCount = battlecard.signals?.length || 0;
  let effectiveConfidence = confidence.score;
  if (signalCount <= 2) {
    effectiveConfidence = Math.min(confidence.score, 0.8);
  }

  let md = `# ${competitor} Battlecard\n\n`;
  md += `**Type:** ${AE_BATTLECARD.competitor_type?.toUpperCase() || 'BFSI'} | **Confidence:** ${Math.round(effectiveConfidence * 100)}% | **Generated:** ${new Date(battlecard.generatedAt).toLocaleString()}\n\n`;
  md += `---\n\n`;

  // Company Overview (clean, AE-ready)
  if (AE_BATTLECARD.company_overview) {
    md += `## Company Overview\n\n`;
    md += `${sanitize(AE_BATTLECARD.company_overview)}\n\n`;
  }

  // Category Contrast (concise, comparative)
  if (AE_BATTLECARD.category_contrast) {
    md += `## Category Contrast\n\n`;
    md += `**${sanitize(AE_BATTLECARD.category_contrast, 150)}**\n\n`;
  }

  // Positioning
  if (battlecard.positioning) {
    md += `## Positioning\n\n`;
    if (battlecard.positioning.tagline) {
      md += `**Tagline:** ${sanitize(battlecard.positioning.tagline)}\n\n`;
    }
    if (battlecard.positioning.targetSegments?.length) {
      md += `**Target Segments:**\n`;
      for (const seg of battlecard.positioning.targetSegments.slice(0, 3)) {
        md += `- ${sanitize(seg, 80)}\n`;
      }
      md += "\n";
    }
    if (battlecard.positioning.differentiators?.length) {
      md += `**Key Differentiators:**\n`;
      for (const diff of battlecard.positioning.differentiators.slice(0, 3)) {
        md += `- ${sanitize(diff, 100)}\n`;
      }
      md += "\n";
    }
  }

  // Quick Dismisses - 1-line punch statements ONLY
  if (AE_BATTLECARD.quick_dismisses?.length) {
    md += `## Quick Dismisses\n\n`;
    for (const dismiss of AE_BATTLECARD.quick_dismisses.slice(0, 3)) {
      md += `- ${completeSentence(sanitize(dismiss, 120))}\n`;
    }
    md += "\n";
  }

  // Objection Handling - deduplicated, complete sentences
  if (AE_BATTLECARD.objection_handling?.length) {
    const deduped = deduplicateObjections(AE_BATTLECARD.objection_handling);
    md += `## Objection Handling\n\n`;
    for (const obj of deduped.slice(0, 3)) {
      md += `### "${sanitize(obj.objection, 60)}"\n\n`;
      md += `**Counter:** ${completeSentence(sanitize(obj.counter, 200))}\n\n`;
      if (obj.evidence?.length) {
        md += `**Evidence:** ${obj.evidence.map(e => cite(e)).join(", ")}\n\n`;
      }
    }
  }

  // Why We Win (outcome-focused, 1 line each)
  if (AE_BATTLECARD.why_we_win?.length) {
    md += `## Why We Win\n\n`;
    for (const win of AE_BATTLECARD.why_we_win.slice(0, 3)) {
      md += `- ${completeSentence(sanitize(win, 120))}\n`;
    }
    md += "\n";
  }

  // Why We Lose (honest, brief)
  if (AE_BATTLECARD.why_we_lose?.length) {
    md += `## Why We Lose\n\n`;
    for (const lose of AE_BATTLECARD.why_we_lose.slice(0, 3)) {
      md += `- ${completeSentence(sanitize(lose, 120))}\n`;
    }
    md += "\n";
  }

  // Pricing Positioning (AE context)
  if (AE_BATTLECARD.pricing_positioning) {
    md += `## Pricing\n\n`;
    md += `${completeSentence(sanitize(AE_BATTLECARD.pricing_positioning, 200))}\n\n`;
  }

  // Pricing Posture (structured)
  if (battlecard.pricing_posture) {
    md += `**Model:** ${sanitize(battlecard.pricing_posture.model)} | **Entry:** ${sanitize(battlecard.pricing_posture.entryPrice)} | **${battlecard.pricing_posture.opacity === 'clear' ? '🟢 Clear' : '🔴 Opaque'}**\n\n`;
  }

  // Landmines - clean questions (no raw artifacts)
  if (AE_BATTLECARD.landmines?.length) {
    md += `## Landmines (Questions to Expose Gaps)\n\n`;
    for (const landmine of AE_BATTLECARD.landmines.slice(0, 3)) {
      md += `- ${completeSentence(sanitize(landmine, 150))}\n`;
    }
    md += "\n";
  }

  // FUD Flip - AE-ready statements
  if (AE_BATTLECARD.FUD_responses?.length) {
    md += `## FUD Flip\n\n`;
    for (const fud of AE_BATTLECARD.FUD_responses.slice(0, 3)) {
      md += `- ${completeSentence(sanitize(fud, 150))}\n`;
    }
    md += "\n";
  }

  // Proof Points - verifiable facts
  if (AE_BATTLECARD.proof_points?.length) {
    md += `## Proof Points\n\n`;
    for (const proof of AE_BATTLECARD.proof_points.slice(0, 3)) {
      md += `- ${completeSentence(sanitize(proof, 150))}\n`;
    }
    md += "\n";
  }

  // Customer Truths (capped, clean)
  if (battlecard.customer_truths) {
    md += `## Customer Truths\n\n`;
    if (battlecard.customer_truths.positives?.length) {
      md += `**What customers love:**\n`;
      for (const pos of battlecard.customer_truths.positives.slice(0, 2)) {
        md += `- ${completeSentence(sanitize(pos, 120))}\n`;
      }
      md += "\n";
    }
    if (battlecard.customer_truths.negatives?.length) {
      md += `**What customers dislike:**\n`;
      for (const neg of battlecard.customer_truths.negatives.slice(0, 2)) {
        md += `- ${completeSentence(sanitize(neg, 120))}\n`;
      }
      md += "\n";
    }
    if (battlecard.customer_truths.keyComplaints?.length) {
      md += `**Key complaints:**\n`;
      for (const complaint of battlecard.customer_truths.keyComplaints.slice(0, 3)) {
        md += `- ${completeSentence(sanitize(complaint, 120))}\n`;
      }
      md += "\n";
    }
  }

  // Recent Moves (if any, limited)
  if (battlecard.recent_moves?.length) {
    md += `## Recent Moves\n\n`;
    for (const move of battlecard.recent_moves.slice(0, 3)) {
      md += `- **${sanitize(move.name)}** (${sanitize(move.date)})\n`;
    }
    md += "\n";
  }

  // Push Deal When (triggers)
  if (AE_BATTLECARD.compete_aggressively_when?.length) {
    md += `## Push Deal When...\n\n`;
    for (const trigger of AE_BATTLECARD.compete_aggressively_when.slice(0, 4)) {
      md += `- ${completeSentence(sanitize(trigger, 120))}\n`;
    }
    md += "\n";
  }

  // Signal Trace - ONLY in demo mode (hidden for AE/production)
  if (showSignalTrace && AE_BATTLECARD.signal_trace?.length) {
    md += `## Signal Trace\n\n`;
    md += `*Signal → Weapon traceability (demo only)*\n\n`;
    for (const trace of AE_BATTLECARD.signal_trace.slice(0, 5)) {
      md += `- **Signal:** "${sanitize(trace.signal, 80)}"\n`;
      md += `  → **Weapon:** ${sanitize(trace.weapon, 100)}\n`;
      if (trace.type) {
        md += `  *(Type: ${sanitize(trace.type)})*\n`;
      }
    }
    md += "\n";
  }

  // Sources (clean references)
  if (citations?.length) {
    md += `## Sources\n\n`;
    for (const citation of citations.slice(0, 8)) {
      md += `- **[${citation.id}]** ${sanitize(citation.title, 80)} — ${sanitize(citation.source)}\n`;
    }
    md += "\n";
  }

  // Data Gaps (if significant confidence loss)
  if (dataGaps?.length && effectiveConfidence < 0.7) {
    md += `## Data Quality Note\n\n`;
    md += `- Limited source diversity may affect confidence\n`;
  }

  return md;
}

export function renderSectionMarkdown(section: string, content: string): string {
  return `## ${section}\n\n${content}\n\n`;
}