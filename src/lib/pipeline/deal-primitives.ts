import type { Citation, ExtractedIntelligence, Signal, AE_BATTLECARD } from "@/types";
import type { PersonaObjection, MarketRelationshipModel, CapabilityOrigin } from "@/types/battlecard";
import { classifySignalType } from "./utils/signal-classify";
import { BFSI_TAXONOMY, type BFSICategory, type MarketRole } from "@/types/entity";
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
    }
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
    }
  }
};

const RELATIONSHIP_PRIMITIVES: Record<MarketRole, {
  why_we_win: string[];
  gtm_push: string[];
  fud_responses: string[];
  persona_focus: string;
}> = {
  direct_competitor: {
    why_we_win: [
      "Single-platform aggregation for multi-bank FD/RD onboarding.",
      "Designed around direct bank-partner orchestration models.",
      "Stability backed by the Zerodha (Rainmatter) ecosystem."
    ],
    gtm_push: [
      "Prospect is concerned about custody risk or concentration risk.",
      "Prospect wants to own the direct banking relationship via a standardized flow."
    ],
    fud_responses: [
      "Bundled models create technical lock-in and opaque audit trails.",
      "Generic API layers hide underlying banking complexity."
    ],
    persona_focus: "CTO / Compliance"
  },
  indirect_competitor: {
    why_we_win: [
      "Specialized infrastructure for banking products vs generic payment rails.",
      "Deep regulatory orchestration beyond simple transaction movement."
    ],
    gtm_push: [
      "Teams expanding from payments into yield/savings products.",
      "Fintechs hitting limits of checkout-centric infra."
    ],
    fud_responses: [
      "Payment success doesn't guarantee banking-product reliability.",
      "High switching costs in transaction-linked models."
    ],
    persona_focus: "Product / Founder"
  },
  partner: {
    why_we_win: [
      "Facilitate seamless asset distribution for supply-side partners.",
      "Standardized technical rails for regulated product issuance."
    ],
    gtm_push: [
      "Supply-side partners seeking modern digital distribution.",
      "NBFCs wanting to expose FD/RD products via APIs."
    ],
    fud_responses: [], // No forced FUD for partners
    persona_focus: "Founder / Compliance"
  },
  non_competitor: {
    why_we_win: [
      "Infrastructure that powers your distribution layer.",
      "Complementary tech stack for financial product discovery."
    ],
    gtm_push: [
      "Brokerages wanting to offer banking products to their users.",
      "Wealth platforms looking for secure, multi-institution FD rails."
    ],
    fud_responses: [], // No forced FUD
    persona_focus: "Founder / CTO"
  },
  ecosystem_player: {
    why_we_win: [
      "Interoperability with standard industry cores and ledgers.",
      "Unified compliance reporting across multiple regulated nodes."
    ],
    gtm_push: [
      "Teams needing a unified layer atop disparate core systems.",
      "Platforms consolidating compliance tech debt."
    ],
    fud_responses: [],
    persona_focus: "CTO"
  }
};

const ROLE_PRIMITIVES: Record<MarketRole, StrategicImplication> = {
  direct_competitor: {
    implication: "Direct infrastructure displacement",
    personas: {
      CTO: {
        objection: "How do you manage maintenance overhead of multiple banking partner integrations?",
        counter: "Bundled solutions create technical lock-in and hide banking complexity. Blostem provides a single platform that standardizes orchestration while keeping states transparent.",
        landmine: "How tightly coupled are your core banking flows to their proprietary platform?"
      },
      Founder: {
        objection: "Do we have to build custom integrations for every bank we want to add?",
        counter: "Blostem collaborates with several banks and NBFCs, facilitating FD bookings through a single integration.",
        landmine: "What happens if their pricing changes after you're deeply integrated?"
      },
      Compliance: {
        objection: "Does the abstraction layer hide banking-product complexity or handle it?",
        counter: "Hiding complexity creates 'black boxes'. Blostem handles orchestration while keeping the underlying states transparent and audit-ready.",
        landmine: "Can you produce raw banking logs for every transaction without platform mediation?"
      }
    }
  },
  indirect_competitor: {
    implication: "Specialized infrastructure vs generic rails",
    personas: {
      CTO: {
        objection: "Can your payment-centric infra handle specialized banking product lifecycles?",
        counter: "Payment rails aren't optimized for FD/RD booking and servicing. Blostem is built specifically for banking product orchestration.",
        landmine: "Who handles the reconciliation for non-payment banking events in your current stack?"
      },
      Founder: {
        objection: "Why use a separate infra for savings when we already have a payment gateway?",
        counter: "Gateways focus on transaction success, not deposit compliance. Blostem ensures your savings product is regulatory-hardened from day one.",
        landmine: "Are you prepared for the support overhead of manual FD reconciliation?"
      },
      Compliance: {
        objection: "Is your payment provider's ledger sufficient for banking audits?",
        counter: "Banking products require specific regulatory audit trails that generic gateways don't provide. Blostem standardizes these logs across institutions.",
        landmine: "How do you handle the risk of commingled funds in a payment-first custody model?"
      }
    }
  },
  partner: {
    implication: "Supply-side partnership & distribution synergy",
    personas: {
      CTO: {
        objection: "How do we expose our regulated assets to digital partners securely?",
        counter: "Blostem provides the technical rails to distribute your FD/RD products via modern APIs to a network of distributors like Zerodha.",
        landmine: "What is the timeline for building an in-house API layer for every external distributor?"
      },
      Founder: {
        objection: "Can we increase our deposit base without growing our direct sales team?",
        counter: "Blostem connects your assets to a high-intent distributor network, automating the discovery and booking process.",
        landmine: "How many digital distribution opportunities are we missing due to technical friction?"
      },
      Compliance: {
        objection: "How do we maintain regulatory control when our assets are sold on third-party apps?",
        counter: "Blostem's orchestration layer ensures your compliance rules are enforced at the point of booking, with full transparency into every transaction.",
        landmine: "Who verifies the KYC/AML standards of every affiliate distribution point?"
      }
    }
  },
  non_competitor: {
    implication: "Ecosystem distribution and UX benchmarking",
    personas: {
      CTO: {
        objection: "How do we build a user experience as seamless as the top retail platforms?",
        counter: "Use Blostem's infra to launch the same high-quality banking features without building the backend from scratch.",
        landmine: "How much dev time is being spent on 're-inventing the wheel' for banking rails?"
      },
      Founder: {
        objection: "Can we offer the same variety of savings products as the big aggregators?",
        counter: "Blostem gives you single-API access to multiple banks, allowing you to compete with large platforms on product variety.",
        landmine: "What is the opportunity cost of not having a savings product in our app?"
      },
      Compliance: {
        objection: "How do we ensure our small platform meets the same safety standards as market leaders?",
        counter: "Blostem provides the same institution-grade orchestration used by top-tier brokerages, ensuring your platform is compliant at scale.",
        landmine: "Are we exposed to regulatory risk by using non-standardized banking integration methods?"
      }
    }
  },
  ecosystem_player: {
    implication: "Technical interoperability & ledger consolidation",
    personas: {
      CTO: {
        objection: "How does this layer integrate with our existing core banking systems?",
        counter: "Blostem sits atop disparate cores, providing a unified API for modern product distribution without core migration.",
        landmine: "What happens to our digital agility if we're tied to a single legacy core's roadmap?"
      },
      Founder: {
        objection: "Can we launch new products faster without waiting for core system updates?",
        counter: "Blostem enables rapid product iteration by abstracting the legacy complexity into a modern orchestration layer.",
        landmine: "How many months are our product launches being delayed by core banking dependencies?"
      },
      Compliance: {
        objection: "How do we consolidate compliance reporting across multiple legacy systems?",
        counter: "Blostem provides a unified reporting layer, standardizing logs from different cores into an audit-ready format.",
        landmine: "How long does it take to pull a single-customer view across all our internal systems?"
      }
    }
  }
};

function getStrategicPrimitive(signal: Signal, category: BFSICategory): StrategicImplication {
  const signalType = classifySignalType(signal.value, signal.normalizedType);
  const metadata = BFSI_TAXONOMY[category];
  const role = metadata.role;
  
  return STRATEGIC_MAP[signalType] || ROLE_PRIMITIVES[role];
}

export function deriveDealPrimitives(
  intelligence: ExtractedIntelligence,
  signals: Signal[],
  citations: Citation[],
  competitor: string,
  inferredCategory: string
): AE_BATTLECARD {
  const compType = inferredCategory as BFSICategory;
  const metadata = BFSI_TAXONOMY[compType] || BFSI_TAXONOMY.banking_api_infra;

  const marketRole = metadata.role;
  const prim = RELATIONSHIP_PRIMITIVES[marketRole];

  // Relationship model derivation
  const relationship: MarketRelationshipModel = {
    primary: "displace",
    secondary: [],
    overlap_score: 0.5
  };

  if (marketRole === "direct_competitor") {
    relationship.primary = "displace";
    relationship.secondary = ["coexist"];
  } else if (marketRole === "partner") {
    relationship.primary = "supply";
  } else if (marketRole === "non_competitor") {
    relationship.primary = "coexist";
    relationship.secondary = ["distribute_through"];
  } else if (marketRole === "ecosystem_player") {
    relationship.primary = "integrate";
  }

  // Persona objections
  const topSignals = signals.slice(0, 3);
  const persona_objections: PersonaObjection[] = [];
  const mainSignal = topSignals[0] || { value: "", citationIds: [], id: "fallback", type: "general" };
  const primitive = getStrategicPrimitive(mainSignal, compType);

  persona_objections.push({ persona: "CTO", ...primitive.personas.CTO });
  persona_objections.push({ persona: "Founder", ...primitive.personas.Founder });
  persona_objections.push({ persona: "Compliance", ...primitive.personas.Compliance });

  // Capability Inference
  const inferredCapabilities = inferCapabilities(compType, signals);
  const strategic_overlap: AE_BATTLECARD["strategic_overlap"] = {};
  for (const [cap, res] of Object.entries(inferredCapabilities)) {
    strategic_overlap[cap] = {
      exists: res.value !== "absent",
      ownership: res.value as CapabilityOrigin,
      evidence: signals.find(s => s.value.toLowerCase().includes(cap.replace("_", " ")))?.value || "Inferred from category",
      confidence: res.confidence
    };
  }

  // Why We Lose
  let why_we_lose = [
    `${competitor} has strong market familiarity and existing workflow depth in the ${metadata.label} segment.`
  ];
  if (marketRole === "partner" || marketRole === "ecosystem_player") {
    why_we_lose = [`Technical dependencies or commercial misalignments on shared revenue models.`];
  }

  // Quick Dismisses
  const actualComplaints = signals.filter(s => isActualCustomerComplaint(s));
  const quick_dismisses: string[] = [];
  for (const signal of actualComplaints.slice(0, 2)) {
    const signalType = classifySignalType(signal.value, signal.normalizedType);
    switch (signalType) {
      case "pricing_complaint": quick_dismisses.push(`${competitor}'s pricing complexity creates hidden costs at scale.`); break;
      case "support_issue": quick_dismisses.push(`${competitor}'s support response times cause delays.`); break;
      case "reliability": quick_dismisses.push(`${competitor}'s reliability issues create operational risk.`); break;
    }
  }
  if (quick_dismisses.length === 0) {
    if (marketRole === "direct_competitor" || marketRole === "indirect_competitor") {
      quick_dismisses.push(`Is ${competitor} providing standardized banking orchestration or just a mediated payment layer?`);
    } else {
      quick_dismisses.push(`How does ${competitor}'s current stack integrate with multi-institution FD/RD flows?`);
    }
  }

  return {
    company_overview: intelligence.positioning?.tagline || `${competitor} — ${metadata.label}.`,
    competitor_type: compType,
    entity_role: metadata.entityRole,
    category_contrast: `${competitor} = ${metadata.definition}; Blostem = payment aggregator equivalent for banking products (standardized FD/RD orchestration)`,
    relationship_mode: relationship.primary,
    relationship,
    strategic_overlap,
    persona_objections,
    objection_handling: [],
    quick_dismisses,
    why_we_win: prim.why_we_win,
    why_we_lose,
    pricing_positioning: metadata.pricing,
    FUD_responses: prim.fud_responses,
    proof_points: [
      "Blostem integrates with Zerodha for FD booking on Coin — proven at scale.",
      "Standardized flows used by top-tier Indian wealthtechs and brokerages."
    ],
    compete_aggressively_when: prim.gtm_push,
    why_this_appears_in_deals: intelligence.decision_orientation?.why_this_appears_in_deals || [],
    do_not_compete_when: intelligence.decision_orientation?.do_not_compete_when || [],
    signal_trace: signals.slice(0, 3).map(s => ({
      signal: s.value.slice(0, 80),
      weapon: "Strategic inference",
      type: classifySignalType(s.value, s.normalizedType)
    })),
  };
}