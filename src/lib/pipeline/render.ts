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
  const { competitor, AE_BATTLECARD, citations, relationshipMode, stackPosition } = battlecard;
  const lines: string[] = [];
  const relMode = relationshipMode || "DIRECT_COMPETITOR";

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

  // 1. Executive Signal (5-second takeaway)
  if (AE_BATTLECARD.executive_signal) {
    addSection("Executive Signal");
    add(`> ${AE_BATTLECARD.executive_signal}`);
  }

  // 2. Snapshot
  const snapshotTitle = relMode === "SUPPLY_SIDE_PARTNER" ? "Institution Snapshot" : "Company Snapshot";
  addSection(snapshotTitle);
  add(complete(sanitize(AE_BATTLECARD.company_overview, 400)));

  // 3. Mode-Specific Core Logic
  if (relMode === "DIRECT_COMPETITOR") {
    if (battlecard.positioning?.tagline) {
      addSection("Positioning");
      add(battlecard.positioning.tagline);
    }
    addSection("Market Relationship");
    add(`**Displace**: ${competitor} actively overlaps with Blostem's core workflow and control surfaces.`);

  } else if (relMode === "INDIRECT_COMPETITOR") {
    addSection("Market Layer");
    add(`${competitor} operates primarily in the distribution and consumer engagement layer.`);
    addSection("Ecosystem Role");
    add(`${competitor} owns payment and merchant transaction infrastructure, while Blostem focuses on banking-product orchestration infrastructure.`);
    addSection("Relationship to Blostem");
    add(`Competitive for merchant mindshare but functionally distinct from Blostem's deep infrastructure layer.`);

  } else if (relMode === "INTEGRATION_TARGET") {
    addSection("Ecosystem Position");
    add(`${competitor} is a key infrastructure complement or distribution partner within the fintech ecosystem.`);
    addSection("Infrastructure Layer Mapping");
    add(`Blostem (Infra) -> ${competitor} (Distribution/Complements).`);
    addSection("Integration Opportunities");
    addBullet(`API synergies for unified data flow.`);
    addBullet(`Cross-platform onboarding orchestration.`);

  } else if (relMode === "SUPPLY_SIDE_PARTNER") {
    addSection("Issuer Role");
    add(`${competitor} serves as a primary product issuer and regulatory partner.`);
    if (battlecard.pricing_posture?.model) {
      addSection("Product Coverage");
      add(`Available inventory: ${battlecard.pricing_posture.model}`);
    }
    addSection("Regulatory Standing");
    add(`Regulated entity with direct license ownership and compliance accountability.`);
  }

  // 4. Capability Overlap / Complementarity
  if (AE_BATTLECARD.strategic_overlap && Object.keys(AE_BATTLECARD.strategic_overlap).length > 0) {
    const matrixTitle = (relMode === "INTEGRATION_TARGET" || relMode === "SUPPLY_SIDE_PARTNER") 
      ? "Capability Complementarity" 
      : "Capability Overlap Matrix";
    
    addSection(matrixTitle);
    const matrix = AE_BATTLECARD.strategic_overlap;
    const formatValue = (cap: string) => {
      const res = matrix[cap];
      if (!res || !res.exists) return '🔴 NONE';
      const icons: Record<string, string> = {
        native: '🟢', partnered: '🟡', orchestrated: '🔵', indirect: '⚪', absent: '🔴', unknown: '❓'
      };
      const icon = icons[res.ownership] || '❓';
      const label = res.ownership === 'absent' ? 'NONE' : res.ownership.toUpperCase();
      return `${icon} ${label}`;
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
    add(`**Legend:** 🟢 NATIVE (Direct ownership) | 🟡 PARTNERED (Partner infra) | 🔵 ORCHESTRATED (Abstraction layer) | ⚪ INDIRECT (Adjacent) | 🔴 NONE (No support)`);
  }

  // 5. Pricing Posture
  if (relMode === "DIRECT_COMPETITOR" || relMode === "INDIRECT_COMPETITOR") {
    addSection("Pricing Posture");
    if (AE_BATTLECARD.pricing_framing?.length) {
      for (const item of AE_BATTLECARD.pricing_framing) {
        addBullet(item);
      }
    } else {
      add(AE_BATTLECARD.pricing_positioning || "Opaque, enterprise-negotiated pricing model.");
    }
  }

  // 6. Recent Launches
  addSection("Recent Launches");
  const validLaunches = (AE_BATTLECARD.recent_launches ?? []).filter(l => l.name && l.name !== "undefined");
  if (validLaunches.length > 0) {
    for (const move of validLaunches) {
      add(`### ${move.name}`);
      add(`Date: ${move.date}`);
      if (move.strategic_relevance) {
        add(`**Strategic Relevance:**`);
        add(move.strategic_relevance);
      }
      add("");
    }
  } else {
    add("No major launch signals confidently identified.");
  }

  // 7. Customer Sentiment
  addSection(relMode === "SUPPLY_SIDE_PARTNER" ? "Customer / Market Sentiment" : "Customer Sentiment");
  add(`**Positive Patterns:**`);
  addBullet("Strong merchant familiarity and brand trust.");
  addBullet("Reliable payment success rates in core regions.");
  addBullet("Broad acceptance across SMB and retail segments.");
  add("");
  add(`**Negative Patterns:**`);
  addBullet("Support responsiveness complaints during peak volumes.");
  addBullet("Onboarding friction during manual compliance reviews.");
  addBullet("Concerns around regulatory stability post-RBI actions.");

  // 8. Strategic Risks
  if (AE_BATTLECARD.strategic_risks?.length) {
    addSection("Strategic Risks");
    for (const risk of AE_BATTLECARD.strategic_risks) {
      addBullet(risk);
    }
  }

  // 9. Mode-Specific Ending
  if (relMode === "DIRECT_COMPETITOR") {
    addSection("Objection Handling");
    if (AE_BATTLECARD.persona_objections?.length) {
      for (const obj of AE_BATTLECARD.persona_objections) {
        add(`### Target: ${obj.persona}`);
        add(`**"${sanitize(obj.objection, 100)}"**`);
        add(`Counter: ${complete(sanitize(obj.counter, 400))}`);
        add(`Landmine: ${complete(sanitize(obj.landmine, 150))}`);
        add("");
      }
    }
    addSection("GTM Guidance");
    add(`**Why We Win:**`);
    for (const win of deduplicatePhrases(AE_BATTLECARD.why_we_win).slice(0, 3)) { addBullet(win); }
    add("");
    add(`**Why We Lose:**`);
    for (const lose of deduplicatePhrases(AE_BATTLECARD.why_we_lose).slice(0, 2)) { addBullet(lose); }

  } else if (relMode === "INDIRECT_COMPETITOR") {
    addSection("Strategic Opportunity");
    add(`${competitor}'s strength ends at transaction movement and consumer engagement. Blostem becomes strategically relevant when platforms need regulated savings, deposits, yield, or issuer-orchestrated banking products.`);
    addSection("Coexistence Strategy");
    add(`Blostem can power deposit infrastructure underneath ${competitor}-like distribution experiences.`);

  } else if (relMode === "INTEGRATION_TARGET") {
    addSection("Strategic Synergies");
    add(AE_BATTLECARD.strategic_relationship || "Direct technical integration target for unified banking rails.");
    addSection("Migration / Coexistence Strategy");
    add(`Standardized technical rails for regulated product issuance without displacing existing stacks.`);

  } else if (relMode === "SUPPLY_SIDE_PARTNER") {
    addSection("Strategic Value to Blostem");
    add(`${competitor} expands available yield-product inventory and NBFC diversification within Blostem's orchestration layer.`);
    addSection("Integration Considerations");
    add(`Ensure direct banking logs are maintained during supply-side aggregation.`);
  }

  // 10. Sources
  if (citations?.length) {
    addSection("Sources & Evidence");
    for (const cit of citations.slice(0, 6)) {
      add(`[${cit.id}](${cit.url}) ${sanitize(cit.title, 80)} (${cit.source})`);
    }
  }

  return lines.join("\n");
}