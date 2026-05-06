import type { Battlecard } from "@/types/battlecard";

// HARD LIMIT: Total output lines - increased for full AE sections
const MAX_TOTAL_LINES = 1200;
const MAX_WORDS_PER_DISMISS = 12;

// Text sanitization - AE-ready language (strict)
function sanitize(text: string | undefined | null, maxLen = 250): string {
  if (!text) return "";

  let cleaned = text
    // Remove ALL markdown headings (## anywhere, not just start of line)
    .replace(/##+\s*[^\n]*/g, "")
    // Remove URLs completely
    .replace(/https?:\/\/[^\s]+/g, "")
    // Remove incomplete sentences
    .replace(/\.\.\.$/g, "")
    .replace(/\s+\.\s+/g, ". ")
    // Fix broken sentence fragments
    .replace(/\b(has|have|had)\.\s+(for|with|when|then)\b/gi, ". ")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Truncate at sentence boundary or safely
  if (cleaned.length > maxLen) {
    const lastSentence = cleaned.slice(0, maxLen).lastIndexOf(".");
    const lastParen = cleaned.slice(0, maxLen).lastIndexOf(")");
    if (lastSentence > maxLen * 0.6) {
      cleaned = cleaned.slice(0, lastSentence + 1);
    } else if (lastParen > maxLen * 0.8) {
      cleaned = cleaned.slice(0, lastParen + 1);
    } else {
      // Avoid cutting in the middle of a word
      const lastSpace = cleaned.slice(0, maxLen).lastIndexOf(" ");
      cleaned = cleaned.slice(0, lastSpace > 0 ? lastSpace : maxLen);
    }
  }

  // Final cleanup
  return cleaned
    .replace(/[""]/g, '"')
    .replace(/'/g, "'")
    .replace(/\|/g, "\\|");
}

// Ensure complete sentence
function complete(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (!/[.!?]$/.test(trimmed)) {
    return trimmed + ".";
  }
  return trimmed;
}

// Word count check for dismiss lines
function isValidDismiss(line: string): boolean {
  const words = line.trim().split(/\s+/).length;
  const hasCitation = /\[\w+\]/.test(line);
  const hasQuestion = /[?]$/.test(line.trim());
  return words <= MAX_WORDS_PER_DISMISS && !hasCitation && !hasQuestion;
}

// Truncate dismiss to max words
function truncateToDismiss(text: string): string {
  const words = text.split(/\s+/);
  if (words.length <= MAX_WORDS_PER_DISMISS) {
    return complete(text);
  }
  return complete(words.slice(0, MAX_WORDS_PER_DISMISS).join(" "));
}

// Deduplicate objections by semantic intent
function deduplicateObjections<T extends { objection: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const intent = item.objection.toLowerCase().replace(/[""']/g, "").trim();
    if (seen.has(intent)) return false;
    seen.add(intent);
    return true;
  });
}

export function renderMarkdown(battlecard: Battlecard): string {
  const { competitor, AE_BATTLECARD, citations, confidence } = battlecard;

  // Confidence cap based on signal count (≤4 signals → cap at 0.85)
  const signalCount = battlecard.signals?.length || 0;
  let effectiveConfidence = confidence.score;
  if (signalCount <= 4) {
    effectiveConfidence = Math.min(confidence.score, 0.85);
  }

  const lines: string[] = [];
  const add = (s: string) => lines.push(s ? s + "  " : "");
  const addSection = (title: string) => { 
    if (lines.length > 0) add(""); 
    add(`## ${title}`); 
  };
  const addBullet = (text: string, maxLen = 120) => add(`- ${complete(sanitize(text, maxLen))}`);

  // Header
  add(`# ${competitor} Battlecard`);
  add(`**${AE_BATTLECARD.competitor_type?.toUpperCase() || 'BFSI'}** | Confidence: ${Math.round(effectiveConfidence * 100)}% | ${new Date(battlecard.generatedAt).toLocaleString()}`);
  add(`---`);

  // Company Overview (1 line)
  if (AE_BATTLECARD.company_overview) {
    addSection("Company Overview");
    add(complete(sanitize(AE_BATTLECARD.company_overview, 150)));
  }

  // Category Contrast (1 line)
  if (AE_BATTLECARD.category_contrast) {
    addSection("Category Contrast");
    add(`**${sanitize(AE_BATTLECARD.category_contrast, 120)}**`);
  }

  // Positioning (compact)
  if (battlecard.positioning) {
    addSection("Positioning");
    if (battlecard.positioning.tagline) {
      add(`**Tagline:** ${sanitize(battlecard.positioning.tagline, 100)}`);
    }
    if (battlecard.positioning.targetSegments?.length) {
      add(`**Segments:** ${battlecard.positioning.targetSegments.slice(0, 2).map(s => sanitize(s, 40)).join(", ")}`);
    }
    if (battlecard.positioning.differentiators?.length) {
      for (const diff of battlecard.positioning.differentiators.slice(0, 2)) {
        addBullet(diff, 80);
      }
    }
  }

  // Quick Dismisses: max 2, ≤12 words, no citations, no questions
  if (AE_BATTLECARD.quick_dismisses?.length) {
    addSection("Quick Dismisses");
    const validDismisses = AE_BATTLECARD.quick_dismisses
      .filter(d => isValidDismiss(d))
      .slice(0, 2);
    for (const dismiss of validDismisses) {
      add(truncateToDismiss(dismiss));
    }
    // Fallback if no valid dismisses
    if (validDismisses.length === 0 && AE_BATTLECARD.quick_dismisses.length > 0) {
      add(truncateToDismiss(AE_BATTLECARD.quick_dismisses[0]));
    }
  }

  // Objection Handling: deduplicated, max 3
  if (AE_BATTLECARD.objection_handling?.length) {
    addSection("Objection Handling");
    const deduped = deduplicateObjections(AE_BATTLECARD.objection_handling).slice(0, 3);
    for (const obj of deduped) {
      add(`**"${sanitize(obj.objection, 50)}"**`);
      add(`Counter: ${complete(sanitize(obj.counter, 180))}`);
      if (obj.evidence?.length) {
        const evidenceLinks = obj.evidence.map(e => {
          const cit = battlecard.citations?.find(c => c.id === e);
          return cit && cit.url ? `[${e}](${cit.url})` : `[${e}]`;
        });
        add(`Evidence: ${evidenceLinks.join(", ")}`);
      }
      add(""); // blank line between objections
    }
  }

  // Why We Win (max 3)
  if (AE_BATTLECARD.why_we_win?.length) {
    addSection("Why We Win");
    for (const win of AE_BATTLECARD.why_we_win.slice(0, 3)) {
      addBullet(win, 100);
    }
  }

  // Why We Lose (max 2)
  if (AE_BATTLECARD.why_we_lose?.length) {
    addSection("Why We Lose");
    for (const lose of AE_BATTLECARD.why_we_lose.slice(0, 2)) {
      addBullet(lose, 100);
    }
  }

  // Pricing (clean, single line)
  if (battlecard.pricing_posture) {
    addSection("Pricing");
    const model = sanitize(battlecard.pricing_posture.model);
    const entry = sanitize(battlecard.pricing_posture.entryPrice);
    const opacity = battlecard.pricing_posture.opacity === 'clear' ? '🟢 Clear' : '🔴 Opaque';
    add(`Model: ${model} | Entry: ${entry} | ${opacity}`);
  }

  // Landmines (max 3, clean questions)
  if (AE_BATTLECARD.landmines?.length) {
    addSection("Landmines");
    for (const lm of AE_BATTLECARD.landmines.slice(0, 3)) {
      addBullet(lm, 120);
    }
  }

  // FUD Flip (max 2, clean statements)
  if (AE_BATTLECARD.FUD_responses?.length) {
    addSection("FUD Flip");
    for (const fud of AE_BATTLECARD.FUD_responses.slice(0, 2)) {
      addBullet(fud, 120);
    }
  }

  // Proof Points (max 2)
  if (AE_BATTLECARD.proof_points?.length) {
    addSection("Proof Points");
    for (const proof of AE_BATTLECARD.proof_points.slice(0, 2)) {
      addBullet(proof, 120);
    }
  }

  // Customer Truths (compact)
  addSection("Customer Truths");
  const truths = battlecard.customer_truths ?? { positives: [], negatives: [], keyComplaints: [] };
  
  if ((truths.keyComplaints ?? []).length > 0) {
    add(`**Key Issues:**`);
    for (const c of truths.keyComplaints!.slice(0, 2)) {
      addBullet(c, 100);
    }
  } else {
    add(`No strong public complaints detected.`);
  }

  if ((truths.positives ?? []).length > 0) {
    add(`**Strengths:**`);
    for (const p of truths.positives!.slice(0, 2)) {
      addBullet(p, 100);
    }
  }

  // Push Deal When (max 3)
  if (AE_BATTLECARD.compete_aggressively_when?.length) {
    addSection("Push Deal When");
    for (const trigger of AE_BATTLECARD.compete_aggressively_when.slice(0, 3)) {
      addBullet(trigger, 100);
    }
  }

  // Strategic Overlap
  if (AE_BATTLECARD.strategic_overlap?.length) {
    addSection("Strategic Overlap");
    for (const overlap of AE_BATTLECARD.strategic_overlap) {
      addBullet(overlap, 100);
    }
  }

  // Strategic Relationship
  if (AE_BATTLECARD.strategic_relationship) {
    addSection("Strategic Relationship");
    add(sanitize(AE_BATTLECARD.strategic_relationship, 200));
  }

  // Why This Appears in Deals
  if (AE_BATTLECARD.why_this_appears_in_deals?.length) {
    addSection("Why This Appears in Deals");
    for (const reason of AE_BATTLECARD.why_this_appears_in_deals.slice(0, 3)) {
      addBullet(reason, 100);
    }
  }

  // Do Not Compete When
  if (AE_BATTLECARD.do_not_compete_when?.length) {
    addSection("Do Not Compete When");
    for (const rule of AE_BATTLECARD.do_not_compete_when.slice(0, 2)) {
      addBullet(rule, 100);
    }
  }

  // VARS Framework (core differentiator — always show)
  if (battlecard.VARS_layer) {
    addSection("VARS");
    const v = battlecard.VARS_layer;
    if (v.validate) add(`**Validate:** ${sanitize(v.validate, 120)}`);
    if (v.acknowledge) add(`**Acknowledge:** ${sanitize(v.acknowledge, 120)}`);
    if (v.reframe) add(`**Reframe:** ${sanitize(v.reframe, 120)}`);
    if (v.specify) add(`**Specify:** ${sanitize(v.specify, 120)}`);
  }

  // Sources (limited)
  if (citations?.length) {
    addSection("Sources");
    for (const cit of citations.slice(0, 5)) {
      add(`[${cit.id}](${cit.url}) ${sanitize(cit.title, 60)} — ${sanitize(cit.source)}`);
    }
  }

  // Enforce line limit
  const output = lines.join("\n");
  const finalLines = output.split("\n").slice(0, MAX_TOTAL_LINES);
  return finalLines.join("\n");
}

export function renderSectionMarkdown(section: string, content: string): string {
  return `## ${section}\n\n${content}\n\n`;
}