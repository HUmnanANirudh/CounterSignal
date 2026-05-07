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
      "Unified multi-issuer orchestration for regulated savings/deposits.",
      "Direct banking state visibility vs mediated platform custody.",
      "Zero-latency reconciliation for high-volume banking events.",
      "Backing from Rainmatter (Zerodha) ensuring ecosystem-wide stability."
    ],
    gtm_push: [
      "Prospect requires multi-bank redundancy for deposit products.",
      "Compliance team rejects 'black box' fund flows in MoR models.",
      "Technical need for standardized rails across NBFCs and Banks."
    ],
    fud_responses: [
      "Proprietary API mediation creates technical debt and lock-in.",
      "Mediated custody models hide underlying regulatory risks.",
      "Generic ledgers fail during deep banking-product audits."
    ],
    persona_focus: "CTO / Compliance"
  },
  indirect_competitor: {
    why_we_win: [
      "Specialized banking-product lifecycle infra vs generic payment rails.",
      "Issuer-direct orchestration for regulated savings and yield.",
      "Deeper regulatory hardening for deposit-compliant workflows."
    ],
    gtm_push: [
      "Platforms moving from 'money movement' to 'money storage'.",
      "Teams hitting the limits of simple PG/PA-led savings features.",
      "Need for multi-issuer FD/RD inventory discovery."
    ],
    fud_responses: [
      "Payment success rates don't translate to banking-product reliability.",
      "Payment-first infra lacks the depth for complex issuer reconciliation.",
      "Generic transaction logs miss critical banking-lifecycle states."
    ],
    persona_focus: "Product / Founder"
  },
  partner: {
    why_we_win: [
      "Automated digital distribution for regulated asset issuers.",
      "Technical rails that eliminate per-partner API development.",
      "Pre-integrated distribution network (Zerodha, Wealthtechs)."
    ],
    gtm_push: [
      "Institutions seeking rapid digital CASA or FD growth.",
      "NBFCs wanting to expose regulated inventory via modern APIs.",
      "Regulatory teams needing standardized distributor reporting."
    ],
    fud_responses: [],
    persona_focus: "Founder / Compliance"
  },
  non_competitor: {
    why_we_win: [
      "Infra that enables banking features without build-out cost.",
      "Seamless integration of regulated products into existing UX.",
      "Multi-institution redundancy without multi-bank technical debt."
    ],
    gtm_push: [
      "Brokerages wanting to launch banking products in < 4 weeks.",
      "Wealth platforms seeking secure, automated deposit rails.",
      "Apps targeting 'full-stack' financial relationship with users."
    ],
    fud_responses: [],
    persona_focus: "Founder / CTO"
  },
  ecosystem_player: {
    why_we_win: [
      "Modern orchestration layer atop disparate legacy core systems.",
      "Unified digital agility without core banking migration.",
      "Standardized data flow across multiple regulated nodes."
    ],
    gtm_push: [
      "Teams consolidating technical debt from legacy core systems.",
      "Institutions seeking agile digital product launches.",
      "Compliance teams needing a unified view across core ledgers."
    ],
    fud_responses: [],
    persona_focus: "CTO"
  }
};

const ROLE_PRIMITIVES: Record<MarketRole, StrategicImplication> = {
  direct_competitor: {
    implication: "Direct infrastructure displacement for banking rails",
    personas: {
      CTO: {
        objection: "How do you manage the maintenance overhead of multiple direct bank integrations?",
        counter: "Blostem provides a single platform that standardizes orchestration while keeping technical logs transparent. You own the orchestration, not the maintenance of a dozen fragile bank APIs.",
        landmine: "Who owns the raw audit logs when a regulator asks for fund flow visibility—you or your provider?"
      },
      Founder: {
        objection: "Are we building our savings product on a single platform or stitching APIs together?",
        counter: "Blostem is the 'payment aggregator' for banking products. You get the same standardized experience for FDs/RDs that you expect from a PG, but with banking-grade compliance.",
        landmine: "What happens to our user experience if your provider changes their pricing or bank-priority after we're integrated?"
      },
      Compliance: {
        objection: "Does the abstraction layer hide banking-product complexity or handle it?",
        counter: "Hiding complexity is a risk. Blostem handles the orchestration while keeping the underlying regulatory states fully transparent and audit-ready.",
        landmine: "Can you produce raw banking logs for every transaction without your provider mediating the data?"
      }
    }
  },
  indirect_competitor: {
    implication: "Specialized orchestration vs generic money movement",
    personas: {
      CTO: {
        objection: "Our current payment-centric infra works for deposits, why change?",
        counter: "Payment rails aren't optimized for the full FD/RD lifecycle (booking, lien, premature-break, maturity). Blostem is built for banking lifecycle orchestration, not just money movement.",
        landmine: "How much manual reconciliation is your dev team doing for non-payment banking events right now?"
      },
      Founder: {
        objection: "Why use separate infra for savings when we already have a payment gateway?",
        counter: "Gateways focus on transaction success, not deposit-compliance. Blostem ensures your savings product is regulatory-hardened and scales across multiple issuers seamlessly.",
        landmine: "Are you prepared for the support overhead when customers ask for FD breakage details that your PG ledger doesn't track?"
      },
      Compliance: {
        objection: "Is our payment provider's ledger sufficient for deep banking audits?",
        counter: "Banking products require specific regulatory audit trails that generic gateways are not designed to provide. Blostem standardizes these logs across multiple institutions.",
        landmine: "How do you mitigate the risk of commingled funds in a payment-first custody model?"
      }
    }
  },
  partner: {
    implication: "Supply-side partnership & digital distribution synergy",
    personas: {
      CTO: {
        objection: "How do we expose our regulated assets to digital partners securely?",
        counter: "Blostem provides the technical rails to distribute your assets (FDs/RDs) via modern APIs to high-intent distributors like Zerodha and leading wealthtechs.",
        landmine: "How much dev effort is wasted building one-off APIs for every new digital distributor?"
      },
      Founder: {
        objection: "Can we increase our deposit base without scaling our direct sales team?",
        counter: "Blostem connects your regulated inventory to a massive digital network, automating the discovery and booking process at scale.",
        landmine: "How many digital distribution opportunities are we losing because our tech stack isn't 'API-first' for partners?"
      },
      Compliance: {
        objection: "How do we maintain regulatory control when our assets are sold on third-party apps?",
        counter: "Blostem's orchestration layer ensures your compliance rules are enforced at the point of booking, providing full transparency into every partner-led transaction.",
        landmine: "Who verifies that KYC/AML standards are met at every affiliate distribution point?"
      }
    }
  },
  non_competitor: {
    implication: "Ecosystem distribution and UX benchmarking",
    personas: {
      CTO: {
        objection: "How do we build a banking experience that matches the top retail platforms?",
        counter: "Use Blostem's pre-built infra to launch institution-grade banking features without 're-inventing the wheel' for banking rails.",
        landmine: "How much dev time is being spent on backend banking plumbing vs front-end user experience?"
      },
      Founder: {
        objection: "Can we offer the same variety of savings products as the market leaders?",
        counter: "Blostem gives you single-API access to multiple banks and NBFCs, allowing you to compete with large aggregators on product diversity from day one.",
        landmine: "What is the churn risk of not having a high-yield savings product in our app today?"
      },
      Compliance: {
        objection: "How do we ensure our platform meets the same safety standards as the big players?",
        counter: "Blostem provides the same orchestration used by top-tier wealthtechs, ensuring your platform is compliant and regulatory-hardened at any scale.",
        landmine: "Are we exposed to regulatory risk by using non-standardized methods for banking integrations?"
      }
    }
  },
  ecosystem_player: {
    implication: "Technical interoperability & ledger consolidation",
    personas: {
      CTO: {
        objection: "How does this layer integrate with our existing core banking systems (CBS)?",
        counter: "Blostem sits atop your legacy cores, providing a unified API layer for modern product distribution without requiring a core migration.",
        landmine: "What happens to our digital agility if we remain tied to our legacy core's rigid roadmap?"
      },
      Founder: {
        objection: "Can we launch new banking products faster without waiting for CBS updates?",
        counter: "Blostem enables rapid digital product iteration by abstracting core legacy complexity into a modern orchestration layer.",
        landmine: "How many months of revenue are we losing due to core banking integration delays?"
      },
      Compliance: {
        objection: "How do we consolidate compliance reporting across multiple legacy core systems?",
        counter: "Blostem provides a unified reporting layer, standardizing logs from different cores into a single, audit-ready digital format.",
        landmine: "How long does it take our team to generate a unified single-customer view today?"
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
    primary: "DIRECT_COMPETITOR",
    secondary: [],
    overlap_score: 0.5
  };

  if (marketRole === "direct_competitor") {
    relationship.primary = "DIRECT_COMPETITOR";
    relationship.secondary = ["INDIRECT_COMPETITOR"];
  } else if (marketRole === "partner") {
    relationship.primary = "SUPPLY_SIDE_PARTNER";
  } else if (marketRole === "non_competitor") {
    relationship.primary = "INTEGRATION_TARGET";
    relationship.secondary = ["INDIRECT_COMPETITOR"];
  } else if (marketRole === "ecosystem_player") {
    relationship.primary = "INTEGRATION_TARGET";
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
  }  // Strategic Risks
  const strategic_risks = [
    "Technical lock-in via proprietary API mediation layer.",
    "Compliance dependency on third-party license bundling.",
    "Potential for support bottlenecks during multi-bank escalations.",
    "Pricing expansion risk as transaction volumes scale.",
    "Operational opacity in underlying fund flow visibility."
  ];  // Executive Signal
  const executive_signal = relationship.primary === "DIRECT_COMPETITOR" 
    ? `${competitor} actively competes on core fintech workflow, but lacks Blostem's specialized multi-bank orchestration for regulated banking products.`
    : relationship.primary === "INDIRECT_COMPETITOR"
    ? `${competitor} dominates transaction movement and consumer engagement, but relies on Blostem-like infra for deep banking-product orchestration.`
    : relationship.primary === "INTEGRATION_TARGET"
    ? `${competitor} provides complementary infrastructure; integration creates a unified data and compliance flow for banking products.`
    : `${competitor} expands Blostem's orchestration layer with critical institution-grade asset inventory and regulatory depth.`;

  // Pricing Framing
  const pricing_framing = [
    "MDR-linked monetization structures.",
    "Merchant transaction volume-based pricing tiers.",
    "Ecosystem cross-sell and retention incentives.",
    "Potential for opacity in bundled license fees."
  ];  // Recent Launches (Filtered & Validated)
  const recent_launches = (intelligence.recent_moves || [])
    .filter(move => move && move.name && move.name !== "undefined" && move.name !== "Unknown")
    .map(move => ({
      name: move.name,
      date: move.date || new Date().toISOString().split('T')[0],
      impact: "medium" as const,
      strategic_relevance: `Expands ${competitor}'s footprint in ${metadata.label} by ${move.name.toLowerCase().includes('aggregator') ? 'optimizing settlement flows' : 'deepening distribution reach'} within the BFSI ecosystem.`
    }));

  return {
    company_overview: intelligence.positioning?.tagline || `${competitor} — ${metadata.label}.`,
    competitor_type: compType,
    entity_role: metadata.entityRole,
    category_contrast: `${competitor} = ${metadata.definition}; Blostem = payment aggregator equivalent for banking products (standardized FD/RD orchestration)`,
    relationship_mode: relationship.primary,
    relationship,
    strategic_overlap,
    strategic_relationship: intelligence.strategic_overlap ? "Direct technical integration target for unified banking rails." : undefined,
    strategic_risks,
    recent_launches,
    executive_signal,
    pricing_framing,
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