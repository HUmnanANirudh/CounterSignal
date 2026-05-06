import type { Battlecard } from "@/types/battlecard";

// HARD LIMIT: Total output lines - increased for full AE sections
const MAX_TOTAL_LINES = 1200;
const MAX_WORDS_PER_DISMISS = 12;

// Text sanitization - AE-ready language (strict)
function sanitize(text: string | undefined | null, maxLen = 300): string {
  if (!text) return "";

  let cleaned = text
    // Remove ALL markdown headings (## anywhere, not just start of line)
    .replace(/##+\s*[^\n]*/g, "")
    // Remove internal pipeline terminology with boundary checks to avoid partial matches
    .replace(/\brecommend validation\b/gi, "verify operational impact")
    .replace(/\brecommend direct research\b/gi, "further analysis advised")
    .replace(/\baccording to extracted data\b/gi, "")
    .replace(/\bbased on provided sources\b/gi, "")
    .replace(/\bnormalized signal\b/gi, "")
    .replace(/\bvalidated signal\b/gi, "")
    .replace(/\binternal pipeline\b/gi, "")
    .replace(/\bsignal trace\b/gi, "")
    .replace(/\(scored:[^)]+\)/gi, "")
    // Fix spacing and newlines
    .replace(/[\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Sentence-aware Truncation
  if (cleaned.length <= maxLen) return cleaned;
  
  const truncated = cleaned.slice(0, maxLen);
  const lastFullStop = truncated.lastIndexOf(".");
  if (lastFullStop > maxLen * 0.7) {
    return truncated.slice(0, lastFullStop + 1);
  }
  
  // Avoid cutting in the middle of a word
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim() + "...";
}

// Ensure complete sentence
function complete(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.endsWith(".") || trimmed.endsWith("?") || trimmed.endsWith("!")) return trimmed;
  return trimmed + ".";
}

// Semantic deduplication to prevent repetitive bullet points
export function deduplicatePhrases(phrases: string[]): string[] {
  const seen = new Set<string>();
  return phrases.filter(p => {
    if (!p) return false;
    const norm = p.toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 30); // Use first 30 chars as semantic key
    if (seen.has(norm)) return false;
    seen.add(norm);
    return p.length > 10;
  });
}

function isValidDismiss(text: string): boolean {
  if (!text) return false;
  // No questions in quick dismiss
  if (text.includes("?")) return false;
  // Limit words
  const words = text.split(/\s+/);
  return words.length <= MAX_WORDS_PER_DISMISS && words.length >= 3;
}

function truncateToDismiss(text: string): string {
  const words = text.split(/\s+/);
  if (words.length <= MAX_WORDS_PER_DISMISS) return text;
  return words.slice(0, MAX_WORDS_PER_DISMISS).join(" ") + ".";
}

function deduplicateObjections(objections: any[]): any[] {
  const seen = new Set<string>();
  return objections.filter(o => {
    const norm = o.objection.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

export function renderMarkdown(battlecard: Battlecard): string {
  const { competitor, AE_BATTLECARD, citations, confidence } = battlecard;
  
  // Dynamic confidence threshold for section suppression
  const signalCount = battlecard.citations?.length || 0;
  let effectiveConfidence = confidence.score;
  
  // Penalty for low data volume
  if (signalCount <= 4) {
    effectiveConfidence = Math.min(confidence.score, 0.85);
  }

  const lines: string[] = [];
  const add = (s: string) => lines.push(s ? s + "  " : "");
  const addSection = (title: string) => { 
    if (lines.length > 0) add(""); 
    add(`## ${title}`); 
  };
  const addBullet = (text: string, maxLen = 150) => add(`- ${complete(sanitize(text, maxLen))}`);

  // Header
  add(`# ${competitor} Battlecard`);
  add(`**${AE_BATTLECARD.competitor_type?.toUpperCase() || 'BFSI'}** | Confidence: ${Math.round(effectiveConfidence * 100)}% | ${new Date(battlecard.generatedAt).toLocaleString()}`);
  add(`---`);

  // Company Overview
  if (AE_BATTLECARD.company_overview) {
    addSection("Company Overview");
    add(complete(sanitize(AE_BATTLECARD.company_overview, 300)));
  }

  // Category Contrast
  if (AE_BATTLECARD.category_contrast) {
    addSection("Category Contrast");
    add(`**${sanitize(AE_BATTLECARD.category_contrast, 200)}**`);
  }

  // Positioning (compact)
  if (battlecard.positioning) {
    addSection("Positioning");
    if (battlecard.positioning.tagline) {
      add(`**Tagline:** ${sanitize(battlecard.positioning.tagline, 150)}`);
    }
    if (battlecard.positioning.targetSegments?.length) {
      add(`**Segments:** ${battlecard.positioning.targetSegments.slice(0, 3).map(s => sanitize(s, 60)).join(", ")}`);
    }
    if (battlecard.positioning.differentiators?.length) {
      for (const diff of deduplicatePhrases(battlecard.positioning.differentiators).slice(0, 3)) {
        addBullet(diff, 120);
      }
    }
  }

  // Quick Dismisses
  if (AE_BATTLECARD.quick_dismisses?.length) {
    addSection("Quick Dismisses");
    const validDismisses = AE_BATTLECARD.quick_dismisses
      .filter(d => isValidDismiss(d))
      .slice(0, 2);
    for (const dismiss of validDismisses) {
      add(truncateToDismiss(dismiss));
    }
    if (validDismisses.length === 0 && AE_BATTLECARD.quick_dismisses.length > 0) {
      add(truncateToDismiss(AE_BATTLECARD.quick_dismisses[0]));
    }
  }

  // Objection Handling
  if (AE_BATTLECARD.objection_handling?.length) {
    addSection("Objection Handling");
    const deduped = deduplicateObjections(AE_BATTLECARD.objection_handling).slice(0, 3);
    for (const obj of deduped) {
      add(`**"${sanitize(obj.objection, 80)}"**`);
      add(`Counter: ${complete(sanitize(obj.counter, 300))}`);
      if (obj.evidence?.length) {
        const evidenceLinks = obj.evidence.map((e: string) => {
          const cit = battlecard.citations?.find(c => c.id === e);
          return cit && cit.url ? `[${e}](${cit.url})` : `[${e}]`;
        });
        add(`Evidence: ${evidenceLinks.join(", ")}`);
      }
      add(""); 
    }
  }

  // Why We Win
  if (AE_BATTLECARD.why_we_win?.length) {
    addSection("Why We Win");
    for (const win of deduplicatePhrases(AE_BATTLECARD.why_we_win).slice(0, 3)) {
      addBullet(win, 150);
    }
  }

  // Why We Lose
  if (AE_BATTLECARD.why_we_lose?.length) {
    addSection("Why We Lose");
    for (const lose of deduplicatePhrases(AE_BATTLECARD.why_we_lose).slice(0, 2)) {
      addBullet(lose, 150);
    }
  }

  // Pricing
  if (battlecard.pricing_posture && battlecard.pricing_posture.opacity === 'clear') {
    addSection("Pricing");
    const model = sanitize(battlecard.pricing_posture.model);
    const entry = sanitize(battlecard.pricing_posture.entryPrice);
    add(`Model: ${model} | Entry: ${entry} |  Clear`);
  }

  // Landmines
  if (AE_BATTLECARD.landmines?.length) {
    addSection("Landmines");
    for (const lm of deduplicatePhrases(AE_BATTLECARD.landmines).slice(0, 3)) {
      addBullet(lm, 150);
    }
  }

  // FUD Flip
  if (AE_BATTLECARD.FUD_responses?.length) {
    addSection("FUD Flip");
    for (const fud of deduplicatePhrases(AE_BATTLECARD.FUD_responses).slice(0, 2)) {
      addBullet(fud, 250);
    }
  }

  // Proof Points
  if (AE_BATTLECARD.proof_points?.length) {
    addSection("Proof Points");
    for (const proof of deduplicatePhrases(AE_BATTLECARD.proof_points).slice(0, 2)) {
      addBullet(proof, 150);
    }
  }

  // Customer Truths
  addSection("Customer Truths");
  const truths = battlecard.customer_truths ?? { positives: [], negatives: [], keyComplaints: [] };
  
  if ((truths.keyComplaints ?? []).length > 0) {
    add(`**Key Issues:**`);
    for (const c of deduplicatePhrases(truths.keyComplaints!).slice(0, 3)) {
      addBullet(c, 150);
    }
  } else {
    add(`No strong public complaints detected.`);
  }

  if ((truths.positives ?? []).length > 0) {
    add(`**Strengths:**`);
    for (const p of deduplicatePhrases(truths.positives!).slice(0, 3)) {
      addBullet(p, 150);
    }
  }

  // Strategic Overlap Matrix
  if (AE_BATTLECARD.strategic_overlap && Object.keys(AE_BATTLECARD.strategic_overlap).length > 0) {
    addSection("Strategic Overlap Matrix");
    const matrix = AE_BATTLECARD.strategic_overlap;
    const formatValue = (v: string) => {
      switch (v) {
        case 'native': return '🟢 Native';
        case 'partnered': return '🟡 Partnered';
        case 'partial': return '🟠 Partial';
        case 'none': return '🔴 None';
        default: return '🔴 None';
      }
    };
    
    add(`| Capability | Blostem | ${battlecard.competitor} |`);
    add(`| :--- | :--- | :--- |`);
    add(`| Payments | 🔴 None | ${formatValue(matrix.payments || 'none')} |`);
    add(`| BFSI Infra | 🟢 Native | ${formatValue(matrix.bfsi_infra || 'none')} |`);
    add(`| Custody | 🔴 None | ${formatValue(matrix.custody || 'none')} |`);
    add(`| Compliance | 🟢 Native | ${formatValue(matrix.compliance_layer || 'none')} |`);
    add(`| Lending | 🟡 Partnered | ${formatValue(matrix.lending_stack || 'none')} |`);
    add("");
    add(`**Legend:** 🟢 Native | 🟡 Partnered | 🟠 Partial | 🔴 None`);
    add("");
  }

  // Decision Orientation
  addSection("Decision Orientation");
  if ((AE_BATTLECARD.compete_aggressively_when ?? []).length > 0) {
    add(`**Push aggressively when:**`);
    for (const item of deduplicatePhrases(AE_BATTLECARD.compete_aggressively_when!).slice(0, 4)) {
      addBullet(item, 150);
    }
  }
  
  if ((AE_BATTLECARD.do_not_compete_when ?? []).length > 0) {
    add(`**Avoid competing when:**`);
    for (const item of deduplicatePhrases(AE_BATTLECARD.do_not_compete_when!).slice(0, 3)) {
      addBullet(item, 150);
    }
  }

  if ((AE_BATTLECARD.why_this_appears_in_deals ?? []).length > 0) {
    add(`**Why this appears in deals:**`);
    for (const item of deduplicatePhrases(AE_BATTLECARD.why_this_appears_in_deals!).slice(0, 3)) {
      addBullet(item, 150);
    }
  }

  // Strategic Relationship
  if (AE_BATTLECARD.strategic_relationship) {
    addSection("Strategic Relationship");
    add(sanitize(AE_BATTLECARD.strategic_relationship, 300));
  }

  // VARS Framework
  if (battlecard.VARS_layer) {
    addSection("VARS");
    const v = battlecard.VARS_layer;
    if (v.validate) add(`**Validate:** ${sanitize(v.validate, 200)}`);
    if (v.acknowledge) add(`**Acknowledge:** ${sanitize(v.acknowledge, 200)}`);
    if (v.reframe) add(`**Reframe:** ${sanitize(v.reframe, 200)}`);
    if (v.specify) add(`**Specify:** ${sanitize(v.specify, 200)}`);
  }

  // Sources
  if (citations?.length) {
    addSection("Sources");
    for (const cit of citations.slice(0, 5)) {
      add(`[${cit.id}](${cit.url}) ${sanitize(cit.title, 80)} — ${sanitize(cit.source)}`);
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