import type { Battlecard, PersonaObjection } from "@/types/battlecard";
import { deduplicatePhrases } from "./utils/format";
import { STACK_POSITION_LABELS } from "@/types/entity";

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

// Professional labels for event types (not machine-generated looking)
const EVENT_TYPE_LABELS: Record<string, string> = {
  LICENSE_ACTION: "License Action",
  REGULATORY_ENFORCEMENT: "Regulatory Enforcement",
  STRATEGIC_RESTRUCTURE: "Strategic Restructure",
  FUNDING: "Funding",
  PRODUCT_LAUNCH: "Product Launch",
  MARKET_EXPANSION: "Market Expansion",
  financial_result: "Financial Results",
  operational_incident: "Operational Incident",
  leadership_change: "Leadership Change",
  compliance_event: "Compliance Event",
  unknown: "Strategic Event",
};

function getEventLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export function renderMarkdown(battlecard: Battlecard): string {
  const { competitor, AE_BATTLECARD, citations, relationshipMode, stackPosition } = battlecard;
  const lines: string[] = [];
  let relMode = relationshipMode || "DIRECT_COMPETITOR";
  if (relMode === "NON_COMPETITOR_ECOSYSTEM") relMode = "INTEGRATION_TARGET";

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
  add(`*Generated: ${new Date(battlecard.generatedAt).toLocaleString()}*`);
  add(`---`);

  // 1. Executive Signal (Takeaway)
  if (AE_BATTLECARD.executive_signal) {
    addSection("Executive Signal");
    add(`> ${AE_BATTLECARD.executive_signal}`);
  }

  // 2. Snapshot (Universal)
  const snapshotTitle = relMode === "SUPPLY_SIDE_PARTNER" ? "Institution Snapshot" : "Company Snapshot";
  addSection(snapshotTitle);
  if (stackPosition && STACK_POSITION_LABELS[stackPosition]) {
    add(`**Strategic Position**: ${STACK_POSITION_LABELS[stackPosition]}`);
    add("");
  }
  const overview = sanitize(AE_BATTLECARD.company_overview, 400);
  if (overview) {
    add(complete(overview));
  } else {
    add(`${competitor} is a primary player in the ${relMode.replace('_', ' ').toLowerCase()} landscape.`);
  }

  // 3. Customer Sentiment (Universal)
  addSection(relMode === "SUPPLY_SIDE_PARTNER" ? "Customer / Market Sentiment" : "Customer Sentiment");
  if (battlecard.sentiment_analysis && battlecard.sentiment_analysis.totalSignals > 0) {
    const sa = battlecard.sentiment_analysis;
    add(`Confidence: ${sa.confidence}`);
    add(`Validated Review Signals: ${sa.totalSignals}`);
    const sourceSummary = sa.evidenceSources.map(e => `${e.domain.split('.')[0].charAt(0).toUpperCase() + e.domain.split('.')[0].slice(1)}(${e.count})`).join(", ");
    add(`Review Sources: ${sourceSummary}`);
    add("");
    const positiveClusters = sa.clusters.filter(c => c.polarity === "positive");
    const negativeClusters = sa.clusters.filter(c => c.polarity === "negative");
    
    if (positiveClusters.length > 0) {
      add(`### Positive Themes`);
      for (const cluster of positiveClusters.slice(0, 4)) addBullet(cluster.summary, 200);
      add("");
    }
    if (negativeClusters.length > 0) {
      add(`### Negative Themes`);
      for (const cluster of negativeClusters.slice(0, 5)) addBullet(cluster.summary, 200);
    }
  } else {
    const legacySentiment = AE_BATTLECARD.customer_sentiment;
    if (legacySentiment && (legacySentiment.positives.length > 0 || legacySentiment.negatives.length > 0)) {
      if (legacySentiment.positives.length > 0) {
        add(`**Positive Patterns:**`);
        for (const p of legacySentiment.positives) addBullet(p);
        add("");
      }
      if (legacySentiment.negatives.length > 0) {
        add(`**Negative Patterns:**`);
        for (const n of legacySentiment.negatives) addBullet(n);
      }
    } else {
      add("*No reliable sentiment consensus identified from current market data.*");
    }
  }

  // 4. Recent Product / Platform Launches (Universal)
  addSection("Recent Product / Platform Launches");
  const validLaunches = (AE_BATTLECARD.recent_launches ?? []).filter(l => l?.name && l?.name !== "undefined");
  if (validLaunches.length > 0) {
    for (const move of validLaunches) {
      add(`### ${move.name}`);
      add(`Date: ${move.date}`);
      if (move.strategic_relevance) add(`**Strategic Relevance:** ${move.strategic_relevance}`);
      add("");
    }
  } else {
    add("No major launch signals confidently identified.");
  }

  // 5. Mode-Specific Strategic Sections
  if (relMode === "DIRECT_COMPETITOR" || relMode === "INDIRECT_COMPETITOR") {
    // Competitor Specifics
    if (AE_BATTLECARD.quick_dismisses?.length) {
      addSection("Quick Dismisses");
      const validDismisses = deduplicatePhrases(AE_BATTLECARD.quick_dismisses).slice(0, 3);
      for (const dismiss of validDismisses) addBullet(dismiss, 100);
    }
    addSection("Market Relationship");
    add(AE_BATTLECARD.strategic_relationship || `**Displace**: ${competitor} actively overlaps with Blostem's core workflow.`);
    
    addSection("Pricing Posture");
    let pricingConf = "LOW";
    if (battlecard.pricing_evidence?.length) {
      const highConfCount = battlecard.pricing_evidence.filter(e => e.confidence === "HIGH").length;
      pricingConf = highConfCount >= battlecard.pricing_evidence.length * 0.5 ? "HIGH" : highConfCount > 0 ? "MEDIUM" : "LOW";
    }
    add(`Confidence: ${pricingConf}`);
    const pricingSynthesis = (battlecard.pricing_posture as any).synthesis || [];
    if (pricingSynthesis.length > 0) for (const bullet of pricingSynthesis) addBullet(bullet);
    else if (AE_BATTLECARD.pricing_framing?.length) for (const item of AE_BATTLECARD.pricing_framing) addBullet(item);
    else add("Limited verified public pricing information available.");

    addSection("Objection Handling");
    if (AE_BATTLECARD.persona_objections?.length) {
      for (const obj of AE_BATTLECARD.persona_objections) {
        add(`### Target: ${obj.persona}`);
        add(`**"${sanitize(obj.objection, 100)}"**`);
        add(`Counter: ${complete(sanitize(obj.counter, 400))}`);
        add("");
      }
    }
    addSection("GTM Guidance");
    add(`**Why We Win:**`);
    for (const win of deduplicatePhrases(AE_BATTLECARD.why_we_win).slice(0, 3)) addBullet(win);
    add("");
    add(`**Why We Lose:**`);
    for (const lose of deduplicatePhrases(AE_BATTLECARD.why_we_lose).slice(0, 2)) addBullet(lose);

  } else if (relMode === "INTEGRATION_TARGET" || relMode === "SUPPLY_SIDE_PARTNER") {
    // Partner Specifics
    addSection("Integration Value Proposition");
    add(AE_BATTLECARD.strategic_relationship || "Direct technical integration target for unified banking rails.");
    
    if (relMode === "SUPPLY_SIDE_PARTNER") {
      addSection("Regulatory Standing");
      add(`Regulated entity with direct license ownership and compliance accountability.`);
    }

    addSection("Strategic Partnership Guidance");
    add(`**Why Integrate:**`);
    for (const win of deduplicatePhrases(AE_BATTLECARD.why_we_win).slice(0, 3)) addBullet(win);
    add("");
    add(`**Strategic Risks:**`);
    for (const lose of deduplicatePhrases(AE_BATTLECARD.why_we_lose).slice(0, 2)) addBullet(lose);
  }

  // 6. Capability Matrix (Gated by existence)
  if (AE_BATTLECARD.strategic_overlap && Object.keys(AE_BATTLECARD.strategic_overlap).length > 0) {
    addSection(relMode.includes("COMPETITOR") ? "Capability Overlap Matrix" : "Capability Complementarity");
    const matrix = AE_BATTLECARD.strategic_overlap;
    const formatValue = (cap: string) => {
      const res = matrix[cap];
      if (!res || !res.exists) return '🔴 NONE';
      const icons: Record<string, string> = { native: '🟢', partnered: '🟡', orchestrated: '🔵', indirect: '⚪', absent: '🔴' };
      return `${icons[res.ownership] || '❓'} ${res.ownership.toUpperCase()}`;
    };
    add(`| Capability | Blostem | ${competitor} |`);
    add(`| :--- | :--- | :--- |`);
    add(`| Payment Routing | 🔴 NONE | ${formatValue('payment_routing')} |`);
    add(`| Deposit Lifecycle | 🟢 NATIVE | ${formatValue('deposit_lifecycle')} |`);
    add(`| KYC / KYB | 🟢 NATIVE | ${formatValue('kyc_kyb')} |`);
    add(`| Banking Product Compliance | 🟢 NATIVE | ${formatValue('banking_compliance')} |`);
    add(`| Deposit Compliance | 🟢 NATIVE | ${formatValue('deposit_compliance')} |`);
    add(`| Tax Compliance | 🔴 NONE | ${formatValue('tax_compliance')} |`);
    add(`| Regulatory Orchestration | 🟢 NATIVE | ${formatValue('reg_orchestration')} |`);
    add("");
    add(`**Legend:** 🟢 NATIVE | 🟡 PARTNERED | 🔵 ORCHESTRATED | ⚪ INDIRECT | 🔴 NONE`);
  }

  // 7. Sources & Evidence (Universal)
  if (citations?.length) {
    addSection("Sources & Evidence");
    for (const cit of citations.slice(0, 6)) {
      add(`[${cit.id}](${cit.url}) ${sanitize(cit.title, 80)} (${cit.source})`);
    }
  }
  return lines.join("\n");
}