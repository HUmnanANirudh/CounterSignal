import type { Citation, ExtractedIntelligence, Signal, AE_BATTLECARD } from "@/types";
import type { PersonaObjection } from "@/types/battlecard";
import { classifySignalType } from "./utils/signal-classify";
import { BFSI_TAXONOMY, type BFSICategory } from "@/types/entity";
import { inferCapabilities } from "./utils/capability-inference";

function isActualCustomerComplaint(signal: Signal): boolean {
  const complaintTypes = ["pricing_complaint", "support_issue", "integration_issue", "onboarding_delay", "quality_issue", "reliability"];
  return complaintTypes.includes(signal.normalizedType || "");
}

interface StrategicImplication {
  implication: string;
  personas: {
    CTO: { objection: string; counter: string; landmine: string };
    Founder: { objection: string; counter: string; landmine: string };
    Compliance: { objection: string; counter: string; landmine: string };
  };
  win_vector: string;
}

const STRATEGIC_MAP: Record<string, StrategicImplication> = {
  regulatory: {
    implication: "Inherited compliance risk from bundled license model",
    personas: {
      CTO: {
        objection: "How tightly coupled are your banking product flows to their proprietary platform?",
        counter: "Platform-based compliance often creates a 'black box' for audit trails. Blostem provides a single platform with standardized flows, ensuring direct technical logs across multiple banks.",
        landmine: "Who owns the audit trail when the regulator asks for direct merchant fund flow logs?"
      },
      Founder: {
        objection: "Do we need to sign individual MoUs with every bank to offer FDs?",
        counter: "Blostem collaborates with several banks and NBFCs, facilitating FD bookings through a single partner integration. You get multi-bank redundancy without the legal and technical overhead.",
        landmine: "What's the plan for when you need to launch a product that their bundled license doesn't support?"
      },
      Compliance: {
        objection: "Who owns liability during regulatory escalation?",
        counter: "In bundled models, liability isolation is often opaque. Blostem handles the orchestration while keeping the underlying banking states transparent and compliant.",
        landmine: "How do you verify fund segregation within their internal custody accounts?"
      }
    },
    win_vector: "Standardized compliance via direct bank-partner collaborations."
  },
  trust_risk: {
    implication: "Merchant-of-Record (MoR) custody risk",
    personas: {
      CTO: {
        objection: "How do you handle the maintenance overhead of multiple direct bank integrations?",
        counter: "Direct integrations mean you own the API maintenance for every bank. Blostem provides a single platform that standardizes these integrations across banking partners.",
        landmine: "If they freeze a sub-merchant's account for 'risk', how much of your volume gets stuck?"
      },
      Founder: {
        objection: "Are we building our savings product on a single platform or stitching bank APIs together?",
        counter: "Stitching APIs is slow and fragile. Blostem is a payment aggregator equivalent for banking products—standardizing the onboarding, booking, and servicing flow.",
        landmine: "What happens to your working capital if their internal fraud filters trigger a platform-wide freeze?"
      },
      Compliance: {
        objection: "Is your merchant relationship direct or mediated by a third-party MoR?",
        counter: "Mediated relationships create liability mismatch. Blostem provides the infrastructure that facilitates FD bookings through standardized, bank-direct flows.",
        landmine: "How do you handle KYC/AML reporting when the customer relationship is technically owned by the platform?"
      }
    },
    win_vector: "Zero-custody architecture ensuring direct fund ownership."
  }
};

function getStrategicPrimitive(signal: Signal, category: BFSICategory): StrategicImplication {
  const signalType = classifySignalType(signal.value, signal.normalizedType);
  const metadata = BFSI_TAXONOMY[category];
  
  // Default primitive based on business model & infra layer
  const defaultPrimitive: StrategicImplication = {
    implication: "Standardized banking orchestration",
    personas: {
      CTO: {
        objection: metadata.businessModel === "transaction_linked" 
          ? "How do you manage the maintenance overhead of multiple banking partner integrations?" 
          : "How reliable are their bank API connections and consent architecture?",
        counter: metadata.infraLayer === "payment_orchestration"
          ? "Bundled solutions create technical lock-in. Blostem provides a single platform that standardizes onboarding and booking flows across institutions."
          : "Generic API layers hide underlying banking complexity. Blostem standardizes the orchestration while keeping states transparent.",
        landmine: "How tightly coupled are your core banking flows to their proprietary platform?"
      },
      Founder: {
        objection: "Do we have to build custom integrations for every bank we want to add?",
        counter: "Blostem collaborates with several banks and NBFCs, facilitating FD bookings through its user-facing partners via a single integration.",
        landmine: metadata.businessModel === "api_saas" 
          ? "Will they still be focused on your specific API needs in 5 years?"
          : "What happens if their pricing changes after you're deeply integrated?"
      },
      Compliance: {
        objection: "Does the abstraction layer hide banking-product complexity or handle it?",
        counter: "Hiding complexity creates 'black boxes'. Blostem handles the orchestration while keeping the underlying banking states transparent and audit-ready.",
        landmine: "Can you produce raw banking logs for every transaction without platform mediation?"
      }
    },
    win_vector: "Single-platform access to multi-bank banking products."
  };

  return STRATEGIC_MAP[signalType] || defaultPrimitive;
}

export function deriveDealPrimitives(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  citations: Citation[],
  competitor: string,
  inferredCategory: string
): AE_BATTLECARD {
  const compType = inferredCategory as BFSICategory;
  const metadata = BFSI_TAXONOMY[compType] || { 
    label: "Unknown Entity", 
    definition: "unclassified", 
    role: "non_competitor", 
    businessModel: "retail_monetization", 
    custodyModel: "not_applicable", 
    infraLayer: "unknown" 
  };

  // Build persona-specific objections
  const topSignals = signals.slice(0, 3);
  const persona_objections: PersonaObjection[] = [];
  
  if (topSignals.length > 0) {
    const mainSignal = topSignals[0];
    const primitive = getStrategicPrimitive(mainSignal, compType);
    
    persona_objections.push({ persona: "CTO", ...primitive.personas.CTO });
    persona_objections.push({ persona: "Founder", ...primitive.personas.Founder });
    persona_objections.push({ persona: "Compliance", ...primitive.personas.Compliance });
  } else {
    // Fallback persona objections using metadata
    const primitive = getStrategicPrimitive({ value: "", citationIds: [], id: "fallback", type: "general" }, compType);
    persona_objections.push({ persona: "CTO", ...primitive.personas.CTO });
    persona_objections.push({ persona: "Founder", ...primitive.personas.Founder });
    persona_objections.push({ persona: "Compliance", ...primitive.personas.Compliance });
  }

  // Capability Inference (Truth-Calibrated Overlap)
  const inferredCapabilities = inferCapabilities(compType, signals);
  const strategic_overlap: AE_BATTLECARD["strategic_overlap"] = {};
  for (const [cap, res] of Object.entries(inferredCapabilities)) {
    strategic_overlap[cap] = {
      value: res.value,
      confidence: res.confidence,
      evidence: signals.find(s => s.value.toLowerCase().includes(cap.replace("_", " ")))?.value
    };
  }

  // Why We Lose (GTM Realism) - Metadata Dependent
  let why_we_lose = [
    `${competitor} has strong market familiarity and existing workflow depth in the ${metadata.label} segment.`
  ];

  if (metadata.businessModel === "transaction_linked") {
    why_we_lose.push(`Strong payment success rates and merchant familiarity create high switching costs.`);
  } else if (metadata.businessModel === "api_saas") {
    why_we_lose.push(`Deeply integrated API-first ecosystem with strong developer trust among technical teams.`);
  } else if (metadata.role === "non_competitor") {
    why_we_lose.push(`Prospects may confuse retail distribution strength with underlying infrastructure capability.`);
  }

  // FUD Responses
  const fudResponses = [
    `Blostem is optimized for banking-product infrastructure, not ${metadata.businessModel === "transaction_linked" ? "maximizing payment GMV" : "generic API aggregation"}.`,
    `Blostem's incentives are aligned with infrastructure reliability and bank-direct relationship ownership.`
  ];

  // Quick Dismisses
  const actualComplaints = signals.filter(s => isActualCustomerComplaint(s));
  const quick_dismisses: string[] = [];
  for (const signal of actualComplaints.slice(0, 2)) {
    const signalType = classifySignalType(signal.value, signal.normalizedType);
    switch (signalType) {
      case "pricing_complaint": quick_dismisses.push(`${competitor}'s pricing complexity creates hidden costs at scale.`); break;
      case "support_issue": quick_dismisses.push(`${competitor}'s support response times cause delays when problems escalate.`); break;
      case "integration_issue": quick_dismisses.push(`${competitor}'s integration overhead adds maintenance complexity.`); break;
      case "onboarding_delay": quick_dismisses.push(`${competitor}'s onboarding timelines delay product launches.`); break;
      case "reliability": quick_dismisses.push(`${competitor}'s reliability issues create operational risk.`); break;
    }
  }
  if (quick_dismisses.length === 0) {
    quick_dismisses.push(`Is ${competitor} providing standardized banking orchestration or just a mediated payment layer?`);
    quick_dismisses.push(`How do you verify raw banking logs and fund flows through their platform?`);
  }

  const pricing_positioning = metadata.businessModel === "transaction_linked"
    ? `Pricing is often volume-linked (MDR) for payments, but Blostem offers transparent infra-layer pricing for banking products.`
    : `Pricing typically follows an API SaaS model, which can become unpredictable as call volumes scale.`;

  return {
    company_overview: intelligence.positioning?.tagline || `${competitor} — ${metadata.label}.`,
    competitor_type: compType,
    category_contrast: `${competitor} = ${metadata.definition}; Blostem = payment aggregator equivalent for banking products (standardized FD/RD orchestration)`,
    strategic_overlap,
    persona_objections,
    objection_handling: [],
    quick_dismisses,
    why_we_win: [
      "Single-platform aggregation for multi-bank FD/RD onboarding.",
      "Direct collaboration with regulated banks and NBFCs.",
      "Stability backed by the Zerodha (Rainmatter) ecosystem."
    ],
    why_we_lose,
    pricing_positioning,
    landmines: [],
    FUD_responses: fudResponses,
    proof_points: [
      "Blostem integrates with Zerodha for FD booking on Coin — proven at scale.",
      "Standardized flows used by top-tier Indian wealthtechs and brokerages."
    ],
    compete_aggressively_when: [
      "Prospect is concerned about custody risk or concentration risk.",
      "Prospect wants to own the direct banking relationship via a standardized flow.",
      metadata.businessModel === "transaction_linked" ? "Teams requiring deep technical visibility into banking logs." : "High volume platforms hitting complexity limits on direct bank ties."
    ],
    why_this_appears_in_deals: intelligence.decision_orientation?.why_this_appears_in_deals || [],
    do_not_compete_when: intelligence.decision_orientation?.do_not_compete_when || [],
    signal_trace: signals.slice(0, 3).map(s => ({
      signal: s.value.slice(0, 80),
      weapon: "Strategic inference",
      type: classifySignalType(s.value, s.normalizedType)
    })),
  };
}