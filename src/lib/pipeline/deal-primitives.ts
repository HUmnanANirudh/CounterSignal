import type { Citation, ExtractedIntelligence, Signal, AE_BATTLECARD } from "@/types";
import { classifySignalType } from "./utils/signal-classify";
import { CATEGORY_DEFINITIONS, type BFSICategory } from "@/types/entity";

function isActualCustomerComplaint(signal: Signal): boolean {
  const complaintTypes = ["pricing_complaint", "support_issue", "integration_issue", "onboarding_delay", "quality_issue", "reliability"];
  return complaintTypes.includes(signal.normalizedType || "");
}
function deriveObjectionFromSignal(signal: Signal): string {
  const signalType = signal.type && signal.type !== "general" ? signal.type : classifySignalType(signal.value, signal.normalizedType);
  switch (signalType) {
    case "regulatory": return "How does their regulatory history impact your compliance burden?";
    case "trust_risk": return "How do they isolate merchant liability in embedded flows?";
    case "financial_health": return "Are they stable enough for a multi-year infrastructure dependency?";
    case "pricing_complaint": return "How do your margins scale as their transaction MDR compounds?";
    case "reliability": return "How does their abstraction layer handle settlement failover?";
    case "support_issue": return "How do you escalate critical banking issues without direct bank access?";
    case "integration_issue": return "How complex is managing their fragmented point-to-point integrations?";
    case "onboarding_delay": return "What is the real activation timeline for regulated products?";
    default: return "How does their product architecture align with your infrastructure ownership?";
  }
}

function deriveCounterFromSignal(signal: Signal, competitor: string): string {
  const signalType = signal.type && signal.type !== "general" ? signal.type : classifySignalType(signal.value, signal.normalizedType);
  const summary = signal.summary || signal.value.slice(0, 60);

  switch (signalType) {
    case "regulatory": return `${competitor}'s regulatory incidents create inherited compliance risk that could block your product launches`;
    case "financial_health": return `Aggressive cash-burn or financial volatility signals potential platform instability; recommend verifying infrastructure isolation`;
    case "trust_risk": return `${competitor}'s fraud/trust signals indicate gaps in liability isolation—Blostem keeps you closer to the banking rail`;
    case "reliability": return `${competitor}'s abstraction adds points of failure; Blostem provides direct, multi-bank failover for deposits`;
    case "pricing_complaint": return `${competitor}'s MDR-based pricing means your margins erode as you scale; Blostem offers transparent infra-only pricing`;
    case "support_issue": return `${competitor} support treats you as a merchant; Blostem provides direct BFSI infra-level technical support`;
    case "integration_issue": return `${competitor} requires managing multiple brittle point-to-point flows; Blostem unifies these into a single API`;
    case "onboarding_delay": return `${competitor}'s activation timelines add significant GTM risk for regulated banking products`;
    default: {
      if (summary.toLowerCase().includes("valuation") || summary.toLowerCase().includes("funding") || summary.toLowerCase().includes("million") || summary.toLowerCase().includes("billion")) {
        return `Rapid capital expansion can lead to product sprawl and increased operational complexity for your engineering team.`;
      }
      if (summary.toLowerCase().includes("acquisition") || summary.toLowerCase().includes("merger")) {
        return `Platform consolidation often results in support migration delays and legacy API deprecation risks.`;
      }
      return `${summary}`;
    }
  }
}

function deriveLandmineFromSignal(signal: Signal): string | null {
  const signalType = signal.type && signal.type !== "general" ? signal.type : classifySignalType(signal.value, signal.normalizedType);
  switch (signalType) {
    case "regulatory": return "Who owns the liability if an embedded financial product triggers an RBI investigation?";
    case "trust_risk": return "Who owns the merchant relationship when disputes occur under the MoR structure?";
    case "financial_health": return "Can you migrate off their infrastructure without reworking your billing and tax flows?";
    case "pricing_complaint": return "What happens to your effective margins when their MDR scales with your volume?";
    case "reliability": return "What SLA-backed recourse do you have during settlement disruptions?";
    case "support_issue": return "How do you escalate compliance and tax issues without direct platform access?";
    case "integration_issue": return "Does their abstraction layer prevent you from owning the direct banking pipes?";
    case "onboarding_delay": return "How long does it take to activate a merchant due to their bundled underwriting?";
    default: return "How do you manage infrastructure lock-in when using a bundled compliance layer?";
  }
}

function deriveWinFromSignal(signal: Signal, competitor: string): string | null {
  const signalType = signal.type && signal.type !== "general" ? signal.type : classifySignalType(signal.value, signal.normalizedType);
  
  switch (signalType) {
    case "pricing_complaint": return `${competitor} bundles pricing across payments and services. Blostem offers pure-play infra pricing so your margins stay predictable at scale.`;
    case "support_issue": return `${competitor} support is merchant-facing. Blostem provides direct developer-level access for BFSI infrastructure reliability.`;
    case "integration_issue": return `${competitor} forces you into their specific product abstraction. Blostem gives you a unified API for multi-bank ownership.`;
    case "onboarding_delay": return `${competitor}'s rigid underwriting creates activation bottlenecks. Blostem standardizes BFSI onboarding to speed up GTM.`;
    case "reliability": return `${competitor} adds middleware complexity. Blostem provides direct, SLA-backed banking product rails.`;
    case "regulatory": return `${competitor} increases inherited risk via bundled compliance. Blostem sits on native, compliant banking rails.`;
    case "trust_risk": return `${competitor} uses a merchant custody model, limiting your control. Blostem avoids custody abstraction so you retain ownership.`;
    default: return null;
  }
}

export function deriveDealPrimitives(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  citations: Citation[],
  competitor: string,
  inferredCategory: string
): AE_BATTLECARD {
  console.log(`[DealPrimitives] Processing ${signals.length} signals for ${competitor}`);

  const compType = inferredCategory;
  console.log(`[DealPrimitives] Using pipeline category: ${compType}`);

  if (signals.length === 0) {
    console.log(`[DealPrimitives] No signals — deriving from extracted intelligence`);
    const tagline = intelligence.positioning?.tagline || "";
    const company_overview = tagline
      ? tagline.split(".").slice(0, 2).join(".").trim()
      : `${competitor} — limited public data available.`;
    const positives = intelligence.customer_truths?.positives || [];
    const differentiators = intelligence.positioning?.differentiators || [];

    // Build minimal landmines from category
    const merchantOfRecordLandmines = [
      "How do you handle tax compliance across multiple states?",
      "What happens to your MoR obligations if you switch providers?",
      "How do you manage chargeback liability today?",
    ];

    // Build category-specific FUD responses
    const merchantOfRecordFud = [
      "MoR providers hold merchant funds — how do you verify segregation?",
      "Blostem provides infra-layer abstraction without MoR custody risk.",
    ];

    const contrastDesc = CATEGORY_DEFINITIONS[compType as BFSICategory] || "BFSI technology layer";
    return {
      company_overview,
      competitor_type: compType,
      category_contrast: `${competitor} = ${contrastDesc}; Blostem = banking-product infrastructure layer`,
      quick_dismisses: [],
      objection_handling: [
        {
          objection: "We prefer MoR providers for tax/compliance",
          counter: `MoR simplifies tax collection but creates custody risk. Blostem's infra layer handles compliance without taking custody.`,
          evidence: [],
        },
        {
          objection: "How do you compare on pricing transparency?",
          counter: `Blostem offers transparent infra-layer pricing vs. MoR margins that compound with volume.`,
          evidence: [],
        },
      ],
      why_we_win: differentiators.length > 0
        ? [`${competitor}: ${differentiators[0]}`, "Blostem: native BFSI infra without custody risk"]
        : ["Blostem: unified FD/RD infra layer without MoR custody complexity"],
      why_we_lose: positives.length > 0
        ? [`${competitor} strength: ${positives[0]}`]
        : [],
      pricing_positioning: `No public pricing found for ${competitor}.`,
      landmines: merchantOfRecordLandmines,
      FUD_responses: merchantOfRecordFud,
      proof_points: [
        `Blostem integrates with Zerodha for FD booking on Coin — proven at Indian fintech scale`,
      ],
      compete_aggressively_when: [
        "Prospect is concerned about MoR custody or tax compliance complexity",
        "Prospect wants BFSI infra without switching providers",
      ],
      signal_trace: [],
    };
  }

  const signal_trace = signals.slice(0, 5).map(signal => ({
    signal: signal.value.slice(0, 80),
    weapon: `Objection derived from signal`,
    type: classifySignalType(signal.value, signal.normalizedType),
  }));

  const citationsMap = new Map<string, string>(citations.map(c => [c.id, c.url]));

  const objection_handling: AE_BATTLECARD["objection_handling"] = [];
  const seenObjections = new Set<string>();

  const actualComplaints = signals.filter(s => isActualCustomerComplaint(s));
  if (actualComplaints.length > 0) {
    const firstComplaint = actualComplaints[0];
    const objection = `We already use ${competitor}`;
    objection_handling.push({
      objection,
      counter: deriveCounterFromSignal(firstComplaint, competitor),
      evidence: firstComplaint.citationIds.slice(0, 2),
    });
    seenObjections.add(objection.toLowerCase());
  }

  for (const signal of signals) {
    if (objection_handling.length >= 3) break;
    const objectionText = deriveObjectionFromSignal(signal);
    const normalizedObjection = objectionText.toLowerCase();
    if (seenObjections.has(normalizedObjection)) continue;
    seenObjections.add(normalizedObjection);
    const counter = deriveCounterFromSignal(signal, competitor);
    if (counter.includes("recommend direct research") && !signal.citationIds.length) continue;
    objection_handling.push({ objection: objectionText, counter, evidence: signal.citationIds.slice(0, 2) });
  }

  console.log(`[DealPrimitives] Generated ${objection_handling.length} objections from signals`);

  const quick_dismisses: string[] = [];
  for (const signal of actualComplaints.slice(0, 2)) {
    const signalType = classifySignalType(signal.value, signal.normalizedType);
    switch (signalType) {
      case "pricing_complaint": quick_dismisses.push(`${competitor}'s pricing issues create hidden costs at scale.`); break;
      case "support_issue": quick_dismisses.push(`${competitor}'s support issues cause delays when problems escalate.`); break;
      case "integration_issue": quick_dismisses.push(`${competitor}'s integration complexity adds maintenance overhead.`); break;
      case "onboarding_delay": quick_dismisses.push(`${competitor}'s onboarding timelines delay BFSI product launches.`); break;
      case "reliability": quick_dismisses.push(`${competitor}'s reliability issues create operational risk.`); break;
    }
  }

  const why_we_win: string[] = [];
  const seenWinReasons = new Set<string>();
  for (const signal of actualComplaints) {
    const winReason = deriveWinFromSignal(signal, competitor);
    if (winReason && !seenWinReasons.has(winReason)) {
      seenWinReasons.add(winReason);
      why_we_win.push(winReason);
    }
  }

  const why_we_lose: string[] = [];
  const positives = intelligence.customer_truths?.positives || [];
  const differentiators = intelligence.positioning?.differentiators || [];
  if (positives.length > 0) {
    why_we_lose.push(`${competitor} strength: ${positives[0]}`);
  } else if (differentiators.length > 0) {
    why_we_lose.push(`${competitor} differentiator: ${differentiators[0]}`);
  }

  let pricing_positioning = "";
  const extractedModel = intelligence.pricing_posture?.model || "";
  const extractedEntry = intelligence.pricing_posture?.entryPrice || "";
  if (extractedModel && extractedModel !== "unknown" && !extractedModel.includes("opaque")) {
    pricing_positioning = `${competitor} uses ${extractedModel}`;
    if (extractedEntry && extractedEntry !== "opaque") {
      pricing_positioning += ` (entry: ${extractedEntry})`;
    }
    pricing_positioning += " — Blostem offers transparent infra-layer pricing.";
  } else {
    pricing_positioning = `Pricing is not publicly disclosed (typical for infrastructure / MoR providers).`;
  }

  const landmines: string[] = [];
  const seenLandmines = new Set<string>();
  for (const signal of signals) {
    const landmine = deriveLandmineFromSignal(signal);
    if (landmine && !seenLandmines.has(landmine)) {
      seenLandmines.add(landmine);
      landmines.push(landmine);
    }
  }

  const fudResponses: string[] = [];
  const hasTrustRisk = signals.some(s => classifySignalType(s.value, s.normalizedType) === "trust_risk");
  if (hasTrustRisk) {
    fudResponses.push(`Blostem separates you from fraud liability — wallet-layer incidents expose partners to liability that infra-layer solutions avoid.`);
  }
  if (hasTrustRisk || signals.length > 0) {
    fudResponses.push(`Blostem is built by BFSI infrastructure veterans — Rainmatter backing provides capital + market credibility through Zerodha's ecosystem.`);
  }

  const proof_points: string[] = [];
  if (positives.length > 0) {
    proof_points.push(`${competitor}: ${positives[0]}`);
  }
  proof_points.push(`Blostem integrates with Zerodha for FD booking on Coin — proven at Indian fintech scale`);

  const tagline = intelligence.positioning?.tagline || "";
  const company_overview = tagline
    ? tagline.split(".").slice(0, 2).join(".").trim()
    : `${competitor} — direct research recommended for accurate positioning.`;

  const contrastDesc = CATEGORY_DEFINITIONS[compType as BFSICategory] || "BFSI technology layer";
  const category_contrast = `${competitor} = ${contrastDesc}; Blostem = banking-product infrastructure layer`;

  const compete_aggressively_when: string[] = [];
  const signalTypes = signals.map(s => classifySignalType(s.value, s.normalizedType));
  if (signalTypes.includes("pricing_complaint")) compete_aggressively_when.push("Prospect complains about pricing opacity or hidden MDR costs");
  if (signalTypes.includes("support_issue")) compete_aggressively_when.push("Prospect has experienced support delays or unresponsiveness");
  if (signalTypes.includes("integration_issue")) compete_aggressively_when.push("Prospect is struggling with multi-bank integration complexity");
  if (signalTypes.includes("reliability") || signalTypes.includes("trust_risk")) compete_aggressively_when.push("Prospect is concerned about payment reliability or fraud risk");

  console.log(`[DealPrimitives] Generated: ${objection_handling.length} objections, ${landmines.length} landmines`);

  return {
    company_overview,
    competitor_type: compType,
    category_contrast,
    strategic_overlap: intelligence.strategic_overlap || {},
    quick_dismisses: quick_dismisses.slice(0, 2),
    objection_handling: objection_handling.slice(0, 3),
    why_we_win: why_we_win.slice(0, 3),
    why_we_lose: why_we_lose.slice(0, 2),
    pricing_positioning,
    landmines: landmines.slice(0, 3),
    FUD_responses: fudResponses.slice(0, 2),
    proof_points: proof_points.slice(0, 2),
    compete_aggressively_when: [
      ...(intelligence.decision_orientation?.compete_aggressively_when || []),
      ...compete_aggressively_when
    ].slice(0, 3),
    do_not_compete_when: intelligence.decision_orientation?.do_not_compete_when || [],
    why_this_appears_in_deals: intelligence.decision_orientation?.why_this_appears_in_deals || [],
    signal_trace: signal_trace.slice(0, 3),
  };
}