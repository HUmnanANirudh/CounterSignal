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
  const relMode = AE_BATTLECARD.relationship_mode || "displace";
  const entityRole = AE_BATTLECARD.entity_role || "competitor";
  const relLabel = relMode.charAt(0).toUpperCase() + relMode.slice(1).replace("_", " ");
  const roleLabel = entityRole.charAt(0).toUpperCase() + entityRole.slice(1).replace("_", " ");
  
  add(`**Entity Certainty: ${Math.round(entityScore * 100)}%** | **Capability Accuracy: ${Math.round(capabilityScore * 100)}%** | **Strategic Depth: ${Math.round(strategicScore * 100)}%**`);
  add(`*Role: ${roleLabel}* | *Market Relationship: ${relLabel}* | *Overall Reliability: ${Math.round(overallScore * 100)}%*`);
  add(`*Generated: ${new Date(battlecard.generatedAt).toLocaleString()}*`);
  add(`---`);

  // Company Overview
  if (AE_BATTLECARD.company_overview) {
    addSection(relMode === "supply" ? "Entity Analysis" : "Company Overview");
    add(complete(sanitize(AE_BATTLECARD.company_overview, 400)));
  }

  // Strategic Relationship & Coexistence
  if (AE_BATTLECARD.strategic_relationship) {
    addSection("Ecosystem Alignment");
    add(complete(sanitize(AE_BATTLECARD.strategic_relationship, 400)));
  }

  // Persona-Targeted Playbook (Now shown for all relevant modes)
  if (AE_BATTLECARD.persona_objections?.length) {
    const playbookTitle = relMode === "displace" ? "Persona-Targeted Playbook" : 
                         relMode === "supply" ? "Partnership Stakeholder Playbook" :
                         "Stakeholder Alignment Playbook";
    
    addSection(playbookTitle);
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

  // RELATIONSHIP-AWARE RENDERING
  if (relMode === "displace") {
    if (AE_BATTLECARD.FUD_responses?.length) {
      addSection("FUD & Competitive Reframe");
      for (const fud of deduplicatePhrases(AE_BATTLECARD.FUD_responses).slice(0, 3)) {
        addBullet(fud, 300);
      }
    }

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

  } else if (relMode === "integrate" || relMode === "coexist") {
    addSection("Infrastructure Overlap & Coexistence");
    add(`**Migration Strategy:**`);
    addBullet(`Phased integration via standardized banking orchestration rails.`);
    addBullet(`Parallel run capability to ensure zero downtime for existing flows.`);

    addSection("Strategic Win/Loss Vectors");
    add(`**Why We Win (Platform Value):**`);
    for (const win of deduplicatePhrases(AE_BATTLECARD.why_we_win).slice(0, 3)) {
      addBullet(win, 200);
    }

  } else if (relMode === "supply") {
    addSection("Partnership & Dependency Analysis");
    add(`**Integration Opportunity:**`);
    addBullet(`Facilitate standardized FD/RD bookings through ${competitor}'s regulated rails.`);
    addBullet(`Direct-bank orchestration allows for transparent fund flow logs.`);
    
    add(`**Dependency Risk:**`);
    addBullet(`Reliance on ${competitor}'s specific product availability and pricing.`);
    addBullet(`Technical uptime of ${competitor}'s backend systems.`);

    addSection("Strategic Win/Loss Vectors");
    add(`**Why We Win (Mutual Growth):**`);
    for (const win of deduplicatePhrases(AE_BATTLECARD.why_we_win).slice(0, 3)) {
      addBullet(win, 200);
    }

  } else if (relMode === "distribute_through") {
    addSection("Channel Leverage & Ecosystem Fit");
    add(`**Channel Synergy:**`);
    addBullet(`Blostem powers the backend for ${competitor}'s distribution network.`);
    addBullet(`Scalable onboarding for ${competitor}'s end-users via unified APIs.`);
  }

  // Capability Overlap Matrix
  if (AE_BATTLECARD.strategic_overlap && Object.keys(AE_BATTLECARD.strategic_overlap).length > 0) {
    addSection("Capability Overlap Matrix");
    const matrix = AE_BATTLECARD.strategic_overlap;
    const formatValue = (cap: string) => {
      const res = matrix[cap];
      if (!res || !res.exists) return '🔴 Absent';
      
      const icons: Record<string, string> = {
        native: '🟢',
        partnered: '🟡',
        orchestrated: '🔵',
        indirect: '⚪',
        absent: '🔴',
        unknown: '❓'
      };
      
      const icon = icons[res.ownership] || '❓';
      const label = res.ownership.charAt(0).toUpperCase() + res.ownership.slice(1);
      return `${icon} ${label}`;
    };

    add(`| Capability | Blostem | ${battlecard.competitor} |`);
    add(`| :--- | :--- | :--- |`);
    add(`| Payment Routing | 🔴 Absent | ${formatValue('payment_routing')} |`);
    add(`| Deposit Lifecycle | 🟢 Native | ${formatValue('deposit_lifecycle')} |`);
    add(`| KYC / KYB | 🟢 Native | ${formatValue('kyc_kyb')} |`);
    add(`| Payment Compliance | 🟢 Native | ${formatValue('payment_compliance')} |`);
    add(`| Deposit Compliance | 🟢 Native | ${formatValue('deposit_compliance')} |`);
    add(`| Tax Compliance | 🔴 Absent | ${formatValue('tax_compliance')} |`);
    add(`| Regulatory Orchestration | 🟢 Native | ${formatValue('reg_orchestration')} |`);
    add("");
    add(`**Legend:** 🟢 Native | 🟡 Partnered | 🔵 Orchestrated | ⚪ Indirect | 🔴 Absent`);
    add("");
  }

  // GTM Guidance
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