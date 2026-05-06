import type { Battlecard, PersonaObjection } from "@/types/battlecard";

// HARD LIMIT: Total output lines - increased for full AE sections
const MAX_TOTAL_LINES = 1500;
const MAX_WORDS_PER_DISMISS = 15;

// Text sanitization - AE-ready language (strict)
function sanitize(text: string | undefined | null, maxLen = 300): string {
  if (!text) return "";

  let cleaned = text
    .replace(/##+\s*[^\n]*/g, "")
    .replace(/\brecommend validation\b/gi, "verify operational impact")
    .replace(/\brecommend direct research\b/gi, "further analysis advised")
    .replace(/\(scored:[^)]+\)/gi, "")
    .replace(/[\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLen) return cleaned;
  
  const truncated = cleaned.slice(0, maxLen);
  const lastFullStop = truncated.lastIndexOf(".");
  if (lastFullStop > maxLen * 0.7) {
    return truncated.slice(0, lastFullStop + 1);
  }
  
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim() + "...";
}

function complete(text: string): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.endsWith(".") || trimmed.endsWith("?") || trimmed.endsWith("!")) return trimmed;
  return trimmed + ".";
}

export function deduplicatePhrases(phrases: string[]): string[] {
  const seen = new Set<string>();
  return phrases.filter(p => {
    if (!p) return false;
    const norm = p.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
    if (seen.has(norm)) return false;
    seen.add(norm);
    return p.length > 10;
  });
}

function isValidDismiss(text: string): boolean {
  if (!text) return false;
  const words = text.split(/\s+/);
  return words.length <= MAX_WORDS_PER_DISMISS && words.length >= 3;
}

function truncateToDismiss(text: string): string {
  const words = text.split(/\s+/);
  if (words.length <= MAX_WORDS_PER_DISMISS) return text;
  return words.slice(0, MAX_WORDS_PER_DISMISS).join(" ") + ".";
}

export function renderMarkdown(battlecard: Battlecard): string {
  const { competitor, AE_BATTLECARD, citations, confidence } = battlecard;
  const lines: string[] = [];
  const add = (s: string) => {
    // Tables should not have trailing spaces as they can break some GFM parsers
    if (s.trim().startsWith("|")) {
      lines.push(s);
    } else {
      lines.push(s ? s + "  " : "");
    }
  };
  const addSection = (title: string) => { 
    if (lines.length > 0) add(""); 
    add(`## ${title}`); 
  };
  const addBullet = (text: string, maxLen = 150) => add(`- ${complete(sanitize(text, maxLen))}`);

  // Header
  add(`# ${competitor} Battlecard`);
  const { entityScore, capabilityScore, strategicScore, overallScore } = confidence;
  add(`**Entity Certainty: ${Math.round(entityScore * 100)}%** | **Capability Accuracy: ${Math.round(capabilityScore * 100)}%** | **Strategic Depth: ${Math.round(strategicScore * 100)}%**`);
  add(`*Overall Reliability: ${Math.round(overallScore * 100)}%*`);
  add(`*Generated: ${new Date(battlecard.generatedAt).toLocaleString()}*`);
  add(`---`);

  // Company Overview
  if (AE_BATTLECARD.company_overview) {
    addSection("Company Overview");
    add(complete(sanitize(AE_BATTLECARD.company_overview, 400)));
  }

  // Category Contrast
  if (AE_BATTLECARD.category_contrast) {
    addSection("Category Contrast");
    add(`**${sanitize(AE_BATTLECARD.category_contrast, 250)}**`);
  }

  // Persona-Specific Objections (THE CORE UPGRADE)
  if (AE_BATTLECARD.persona_objections?.length) {
    addSection("Persona-Targeted Playbook");
    const personas: Array<PersonaObjection["persona"]> = ["CTO", "Founder", "Compliance"];
    
    for (const persona of personas) {
      const obj = AE_BATTLECARD.persona_objections.find(p => p.persona === persona);
      if (!obj) continue;
      
      add(`### Target: ${persona}`);
      add(`**"${sanitize(obj.objection, 100)}"**`);
      add(`Counter: ${complete(sanitize(obj.counter, 400))}`);
      add(`Landmine: ${complete(sanitize(obj.landmine, 150))}`);
      add("");
    }
  }

  // Why We Win / Why We Lose (Truth Calibration)
  addSection("Strategic Win/Loss Vectors");
  add(`**Why We Win:**`);
  for (const win of deduplicatePhrases(AE_BATTLECARD.why_we_win).slice(0, 3)) {
    addBullet(win, 200);
  }
  add("");
  add(`**Why We Lose (Deal Realism):**`);
  for (const lose of deduplicatePhrases(AE_BATTLECARD.why_we_lose).slice(0, 2)) {
    addBullet(lose, 250);
  }

  // Pricing
  if (AE_BATTLECARD.pricing_positioning) {
    addSection("Pricing & Monetization");
    add(complete(sanitize(AE_BATTLECARD.pricing_positioning, 300)));
  }

  // FUD Responses (Cynical/Realist Tone)
  if (AE_BATTLECARD.FUD_responses?.length) {
    addSection("FUD & Competitive Reframe");
    for (const fud of deduplicatePhrases(AE_BATTLECARD.FUD_responses).slice(0, 3)) {
      addBullet(fud, 300);
    }
  }

  // Strategic Overlap Matrix
  if (AE_BATTLECARD.strategic_overlap && Object.keys(AE_BATTLECARD.strategic_overlap).length > 0) {
    addSection("Capability Overlap Matrix");
    const matrix = AE_BATTLECARD.strategic_overlap;
    const formatValue = (cap: string) => {
      const res = matrix[cap];
      if (!res || res.value === 'none') return '🔴 None';
      
      const icon = res.value === 'native' ? '🟢' : (res.value === 'partnered' ? '🟡' : '🟠');
      const label = res.value.charAt(0).toUpperCase() + res.value.slice(1);
      return `${icon} ${label}`;
    };
    
    add(`| Capability | Blostem | ${battlecard.competitor} |`);
    add(`| :--- | :--- | :--- |`);
    add(`| Payment Routing | 🔴 None | ${formatValue('payment_routing')} |`);
    add(`| Deposit Lifecycle | 🟢 Native | ${formatValue('deposit_lifecycle')} |`);
    add(`| KYC / KYB | 🟢 Native | ${formatValue('kyc_kyb')} |`);
    add(`| Banking Compliance | 🟢 Native | ${formatValue('banking_compliance')} |`);
    add(`| Tax Handling | 🔴 None | ${formatValue('tax_handling')} |`);
    add(`| Regulatory Orchestration | 🟢 Native | ${formatValue('reg_orchestration')} |`);
    add("");
    add(`**Legend:** 🟢 Native | 🟡 Partnered | 🟠 Partial | 🔴 None`);
    add("");
  }

  // Decision Orientation
  addSection("GTM Guidance");
  if ((AE_BATTLECARD.compete_aggressively_when ?? []).length > 0) {
    add(`**Aggressive Push:**`);
    for (const item of deduplicatePhrases(AE_BATTLECARD.compete_aggressively_when!).slice(0, 3)) {
      addBullet(item, 150);
    }
  }
  if ((AE_BATTLECARD.why_this_appears_in_deals ?? []).length > 0) {
    add(`**Deal Pattern:**`);
    for (const item of deduplicatePhrases(AE_BATTLECARD.why_this_appears_in_deals!).slice(0, 2)) {
      addBullet(item, 150);
    }
  }

  // Sources
  if (citations?.length) {
    addSection("Sources & Evidence");
    for (const cit of citations.slice(0, 6)) {
      add(`[${cit.id}](${cit.url}) ${sanitize(cit.title, 80)} (${cit.source})`);
    }
  }

  return lines.join("\n");
}