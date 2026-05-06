import type { Citation, ExtractedIntelligence, Signal, AE_BATTLECARD } from "@/types";
import type { PersonaObjection } from "@/types/battlecard";
import { classifySignalType } from "./utils/signal-classify";
import { CATEGORY_DEFINITIONS, type BFSICategory } from "@/types/entity";

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
        objection: "How tightly coupled are your banking flows to their proprietary platform?",
        counter: "Razorpay is a regulated entity, but using a bundled license means you inherit their regulatory surface. Blostem lets you sit directly on your bank's license, isolating you from third-party platform risk.",
        landmine: "Who owns the audit trail when the regulator asks for direct merchant fund flow logs?"
      },
      Founder: {
        objection: "What happens to your business if their RBI license gets flagged?",
        counter: "Relying on a single aggregator for all banking products is a concentration risk. Blostem provides infrastructure that works across banks, so your business doesn't stop if one platform has an issue.",
        landmine: "What's the plan for when you need to launch a product that their bundled license doesn't support?"
      },
      Compliance: {
        objection: "Who owns liability during regulatory escalation?",
        counter: "In a bundled MoR model, liability isolation is often opaque. Blostem provides direct BFSI infra-level technical and compliance logs so you retain ownership of the audit trail.",
        landmine: "How do you verify fund segregation within their internal custody accounts?"
      }
    },
    win_vector: "Isolated regulatory risk via direct banking rails."
  },
  trust_risk: {
    implication: "Merchant-of-Record (MoR) custody risk",
    personas: {
      CTO: {
        objection: "How do you verify fund segregation in their pool accounts?",
        counter: "MoR providers pool merchant funds, creating internal custody risk. Blostem's zero-custody architecture ensures funds flow directly between the bank and your merchants.",
        landmine: "If they freeze a sub-merchant's account for 'risk', how much of your volume gets stuck?"
      },
      Founder: {
        objection: "How much of your revenue is sitting in their custody accounts at any given time?",
        counter: "Razorpay's convenience comes from them holding your funds. Blostem avoids the custody layer entirely—you keep your banking relationship and your cash flow.",
        landmine: "What happens to your working capital if their internal fraud filters trigger a platform-wide freeze?"
      },
      Compliance: {
        objection: "Is your merchant relationship direct or mediated by a third-party MoR?",
        counter: "Mediated relationships create liability mismatch during disputes. Blostem keeps you closer to the banking rail, ensuring clear ownership of the merchant relationship.",
        landmine: "How do you handle KYC/AML reporting when the customer relationship is technically owned by the platform?"
      }
    },
    win_vector: "Zero-custody architecture ensures merchant fund safety."
  },
  financial_health: {
    implication: "Infrastructure instability from burn-rate or valuation drops",
    personas: {
      CTO: {
        objection: "What's the long-term support roadmap for this specific product line?",
        counter: "Aggressive cash-burn or funding-chase can lead to product sprawl. Blostem's backing from Rainmatter (Zerodha) ensures a focus on core infrastructure stability over multi-year cycles.",
        landmine: "What's the migration plan if they pivot their focus away from your segment?"
      },
      Founder: {
        objection: "What happens if their pricing changes after you're deeply integrated?",
        counter: "Burn-focused platforms often hike prices or cut support to satisfy valuation targets. Blostem is an infrastructure-first player with a sustainable, transparent business model.",
        landmine: "Will they be around—and focused on your success—in 5 years?"
      },
      Compliance: {
        objection: "How stable is the underlying entity for a multi-year infrastructure dependency?",
        counter: "Platform volatility creates operational risk. Blostem's ecosystem alignment with Zerodha provides the capital and market credibility required for BFSI stability.",
        landmine: "Do they have the balance sheet to cover significant liability gaps if their pool account is compromised?"
      }
    },
    win_vector: "Stability backed by the Zerodha (Rainmatter) ecosystem."
  }
};

function getStrategicPrimitive(signal: Signal): StrategicImplication {
  const signalType = classifySignalType(signal.value, signal.normalizedType);
  return STRATEGIC_MAP[signalType] || {
    implication: "General infrastructure abstraction",
    personas: {
      CTO: {
        objection: "What happens if you need to switch providers later?",
        counter: "Bundled solutions hide the cost of long-term lock-in. Blostem provides the underlying rails so you maintain ownership of your banking relationships.",
        landmine: "How tightly coupled are your core banking flows to their proprietary platform?"
      },
      Founder: {
        objection: "Are you building on a platform or on the banking rails?",
        counter: "Building on a platform is fast, but building on rails is permanent. Blostem gives you the rails so you can scale without re-platforming later.",
        landmine: "What is the cost of re-integrating every bank-product if you outgrow their abstraction?"
      },
      Compliance: {
        objection: "Does the abstraction layer hide banking-product complexity or handle it?",
        counter: "Hiding complexity creates 'black boxes' for compliance teams. Blostem handles the orchestration while keeping the underlying banking states transparent.",
        landmine: "Can you produce raw banking logs for every transaction without platform mediation?"
      }
    },
    win_vector: "Relationship ownership and infrastructure independence."
  };
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
  const contrastDesc = CATEGORY_DEFINITIONS[compType as BFSICategory] || "BFSI technology layer";

  // Build persona-specific objections
  const topSignals = signals.slice(0, 3);
  const persona_objections: PersonaObjection[] = [];
  
  if (topSignals.length > 0) {
    const mainSignal = topSignals[0];
    const primitive = getStrategicPrimitive(mainSignal);
    
    persona_objections.push({ persona: "CTO", ...primitive.personas.CTO });
    persona_objections.push({ persona: "Founder", ...primitive.personas.Founder });
    persona_objections.push({ persona: "Compliance", ...primitive.personas.Compliance });
  } else {
    // Fallback persona objections
    persona_objections.push({ 
      persona: "CTO", 
      objection: "What happens if you need to switch providers later?", 
      counter: "Bundled convenience hides the cost of lock-in. Blostem provides the rails so you maintain ownership.",
      landmine: "How tightly coupled are your core banking flows to their proprietary platform?"
    });
    persona_objections.push({ 
      persona: "Founder", 
      objection: "What happens if pricing changes after you're deeply integrated?", 
      counter: "Scale-focused platforms often hike prices once you are locked in. Blostem offers sustainable infra-only pricing.",
      landmine: "Will they still be focused on your specific segment in 5 years?"
    });
    persona_objections.push({ 
      persona: "Compliance", 
      objection: "Who owns liability during regulatory escalation?", 
      counter: "In bundled models, liability isolation is opaque. Blostem provides direct BFSI infra-level technical logs.",
      landmine: "How do you verify fund segregation within their internal custody accounts?"
    });
  }

  // Why We Lose (GTM Realism)
  const why_we_lose = [
    `${competitor} already owns the payment workflow for many Indian startups, making expansion into adjacent financial tooling operationally convenient.`,
    `Strong merchant familiarity and higher payment success rates in existing checkout flows create high switching costs.`
  ];

  // FUD Responses (Cynical/Realist Tone)
  const fudResponses = [
    `Blostem is optimized for banking-product infrastructure, not maximizing payment GMV across merchants.`,
    `Blostem's incentives are aligned with infrastructure reliability rather than expanding merchant monetization layers.`
  ];

  // Quick Dismisses (derived from actual complaints)
  const actualComplaints = signals.filter(s => isActualCustomerComplaint(s));
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
  if (quick_dismisses.length === 0) {
    quick_dismisses.push(`Is ${competitor} building BFSI infrastructure or just providing a bundled service layer?`);
    quick_dismisses.push(`Does ${competitor} own the banking relationship, or are they a mediated proxy?`);
  }

  const signal_trace = signals.slice(0, 3).map(signal => ({
    signal: signal.value.slice(0, 80),
    weapon: `Strategic primitive derivation`,
    type: classifySignalType(signal.value, signal.normalizedType),
  }));

  return {
    company_overview: intelligence.positioning?.tagline || `${competitor} — BFSI solution provider.`,
    competitor_type: compType,
    category_contrast: `${competitor} = ${contrastDesc}; Blostem = banking-product infrastructure layer`,
    strategic_overlap: intelligence.strategic_overlap || {},
    persona_objections,
    objection_handling: [], // Deprecated
    quick_dismisses,
    why_we_win: [
      "Zero-custody architecture ensures merchant fund safety.",
      "Native multi-bank orchestration vs third-party gateway abstraction.",
      "Stability backed by the Zerodha (Rainmatter) ecosystem."
    ],
    why_we_lose,
    pricing_positioning: `Pricing is often volume-linked (MDR) for ${competitor}, creating margin erosion at scale.`,
    landmines: [], // Deprecated
    FUD_responses: fudResponses,
    proof_points: [
      "Blostem integrates with Zerodha for FD booking on Coin — proven at scale.",
      "Direct banking rails support for top-tier Indian financial institutions."
    ],
    compete_aggressively_when: [
      "Prospect is concerned about custody risk or concentration risk.",
      "Prospect wants to own the direct banking relationship rather than a mediated one.",
      "High volume merchants hitting margin limits on MDR pricing."
    ],
    why_this_appears_in_deals: intelligence.decision_orientation?.why_this_appears_in_deals || [],
    do_not_compete_when: intelligence.decision_orientation?.do_not_compete_when || [],
    signal_trace,
  };
}