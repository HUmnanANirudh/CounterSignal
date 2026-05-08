import type { Citation, ExtractedIntelligence, Signal, AE_BATTLECARD } from "@/types";
import type { PersonaObjection, MarketRelationshipModel, CapabilityOrigin } from "@/types/battlecard";
import { classifySignalType } from "./utils/signal-classify";
import { BFSI_TAXONOMY, type BFSICategory, type MarketRole } from "@/types/entity";
import { inferCapabilities } from "./utils/capability-inference";
import { normalizeFundingAmount } from "./utils/format";

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

const STRATEGIC_MAP: Record<string, (competitor: string) => StrategicImplication> = {
  regulatory: (comp) => ({
    implication: `Inherited compliance risk from ${comp}'s bundled license model`,
    personas: {
      CTO: {
        objection: `How tightly coupled are your banking product flows to ${comp}'s proprietary platform?`,
        counter: `Managing technical coupling requires transparency. Blostem provides a single platform with standardized flows, ensuring direct technical logs across multiple banks, independent of proprietary platform states.`,
        landmine: `What is the process for accessing direct merchant fund flow logs for audit verification?`
      },
      Founder: {
        objection: `Do we need to sign individual MoUs with every bank to offer FDs, or can we just use ${comp}?`,
        counter: `Using only ${comp} creates a single point of failure. Blostem collaborates with several banks and NBFCs, facilitating FD bookings through a single integration while maintaining redundancy.`,
        landmine: `What's the plan for when you need to launch a product that ${comp}'s bundled license doesn't support?`
      },
      Compliance: {
        objection: `Who owns liability during regulatory escalation with ${comp}?`,
        counter: `In bundled models, liability isolation is often complex. Blostem emphasizes direct banking-state visibility and audit-trace preservation across issuer integrations.`,
        landmine: `How do you verify fund segregation within ${comp}'s internal custody accounts?`
      }
    }
  }),
  trust_risk: (comp) => ({
    implication: `${comp}'s Merchant-of-Record (MoR) custody risk`,
    personas: {
      CTO: {
        objection: `How do you handle the maintenance overhead vs ${comp}'s all-in-one stack?`,
        counter: `All-in-one stacks mean you own the technical debt of ${comp}'s roadmap. Blostem provides a single platform that standardizes integrations across banking partners, giving you multi-bank flexibility.`,
        landmine: `If ${comp} freezes a sub-merchant's account for 'risk', how much of your volume gets stuck in their pool?`
      },
      Founder: {
        objection: `Are we building our savings product on a single platform or stitching bank APIs together?`,
        counter: `Stitching APIs is slow. Blostem is the payment aggregator equivalent for banking products—standardizing the onboarding flow across banks so you don't have to rely on ${comp}'s ledger.`,
        landmine: `What happens to your working capital if ${comp}'s internal fraud filters trigger a platform-wide freeze?`
      },
      Compliance: {
        objection: `Is your merchant relationship direct or mediated by ${comp}?`,
        counter: `Mediated relationships create liability mismatch. Blostem provides the infrastructure that facilitates FD bookings through standardized, bank-direct flows, bypassing ${comp}'s mediation.`,
        landmine: `How do you handle KYC/AML reporting when the customer relationship is technically owned by ${comp}'s platform?`
      }
    }
  })
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
      "Unified reconciliation visibility across multiple issuer relationships.",
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

const DO_NOT_COMPETE_MAP: Record<MarketRole, string[]> = {
  direct_competitor: [
    "Prospect only needs checkout/payment acceptance.",
    "No roadmap for regulated savings/deposit products.",
    "Prioritizes global merchant billing over issuer orchestration."
  ],
  indirect_competitor: [
    "Prospect primarily focused on B2C merchant acquisition.",
    "No requirement for multi-bank redundancy.",
    "Only needs basic ledgering without regulatory orchestration."
  ],
  partner: [
    "Distributor already has deep, direct bank-infra ownership.",
    "Prospect does not want to expose inventory to external platforms."
  ],
  non_competitor: [
    "Entity is a pure consumer app with no intent to launch banking products."
  ],
  ecosystem_player: [
    "Bank already has a fully modern, API-first core banking system."
  ]
};

const ROLE_PRIMITIVES: Record<MarketRole, (competitor: string) => StrategicImplication> = {
  direct_competitor: (comp) => ({
    implication: `Infrastructure orchestration for ${comp}'s banking rails`,
    personas: {
      CTO: {
        objection: `How do you manage the maintenance overhead of multiple direct bank integrations?`,
        counter: `Blostem provides a single platform that standardizes orchestration while keeping technical logs transparent. You maintain control over orchestration, optimizing against the integration needs of various banking APIs.`,
        landmine: `What is the process for accessing raw audit logs when verifying fund flow visibility?`
      },
      Founder: {
        objection: `Are we building our savings product on a single platform or stitching APIs together?`,
        counter: `Blostem is designed for banking products. You get a standardized experience for FDs/RDs, with a stack optimized for regulated deposit orchestration workflows rather than global merchant billing flows.`,
        landmine: `How does the platform's pricing or bank-priority configuration impact long-term integration strategy?`
      },
      Compliance: {
        objection: `How does the abstraction layer handle banking-product complexity?`,
        counter: `Managing complexity requires transparency. Blostem emphasizes direct banking-state visibility and audit-trace preservation across issuer integrations.`,
        landmine: `What is the process for producing raw banking logs for every transaction?`
      }
    }
  }),
  indirect_competitor: (comp) => ({
    implication: `Specialized orchestration vs ${comp}'s generic money movement`,
    personas: {
      CTO: {
        objection: `Our current ${comp} infra works for deposits, why change?`,
        counter: `${comp}'s payment rails aren't optimized for the full FD/RD lifecycle. Blostem is built specifically for banking lifecycle orchestration (booking, lien, maturity), not just money movement.`,
        landmine: `How much manual reconciliation is your dev team doing for non-payment banking events in ${comp} right now?`
      },
      Founder: {
        objection: `Why use separate infra for savings when we already have ${comp}?`,
        counter: `${comp} focuses on transaction success, not deposit-compliance. Blostem ensures your savings product is regulatory-hardened and scales across multiple issuers seamlessly.`,
        landmine: `Are you prepared for the support overhead when customers ask for FD details that ${comp}'s ledger doesn't track?`
      },
      Compliance: {
        objection: `Is ${comp}'s ledger sufficient for deep banking audits?`,
        counter: `Banking products require specific regulatory audit trails. Blostem emphasizes direct banking-state visibility and audit-trace preservation across institutions.`,
        landmine: `What is the process for verifying fund segregation in payment-first models?`
      }
    }
  }),
  partner: (comp) => ({
    implication: `Supply-side partnership & digital distribution synergy with ${comp}`,
    personas: {
      CTO: {
        objection: `How do we expose our regulated assets to digital partners like ${comp} securely?`,
        counter: `Blostem provides the technical rails to distribute your assets (FDs/RDs) via modern APIs to high-intent distributors like ${comp}, Zerodha, and leading wealthtechs.`,
        landmine: `How much dev effort is wasted building one-off APIs for every new digital distributor?`
      },
      Founder: {
        objection: `Can we increase our deposit base without scaling our direct sales team?`,
        counter: `Blostem connects your regulated inventory to ${comp}'s massive digital network, automating the discovery and booking process at scale.`,
        landmine: `How many digital distribution opportunities are we losing because our tech stack isn't 'API-first' for partners?`
      },
      Compliance: {
        objection: `How do we maintain regulatory control when our assets are sold on ${comp}?`,
        counter: `Blostem's orchestration layer ensures your compliance rules are enforced at the point of booking, providing full transparency into every ${comp}-led transaction.`,
        landmine: `Who verifies that KYC/AML standards are met at every ${comp} distribution point?`
      }
    }
  }),
  non_competitor: (comp) => ({
    implication: `Ecosystem distribution and UX benchmarking vs ${comp}`,
    personas: {
      CTO: {
        objection: `How do we build a banking experience that matches ${comp}?`,
        counter: `Use Blostem's pre-built infra to launch institution-grade banking features without 're-inventing the wheel' for banking rails that ${comp} already uses.`,
        landmine: `How much dev time is being spent on backend banking plumbing vs front-end user experience?`
      },
      Founder: {
        objection: `Can we offer the same variety of savings products as ${comp}?`,
        counter: `Blostem gives you single-API access to multiple banks and NBFCs, allowing you to compete with ${comp} on product variety from day one.`,
        landmine: `What is the churn risk of not having a high-yield savings product in our app today?`
      },
      Compliance: {
        objection: `How do we ensure our platform meets the same safety standards as ${comp}?`,
        counter: `Blostem provides the same orchestration used by top-tier wealthtechs, ensuring your platform is compliant and regulatory-hardened at any scale, matching ${comp}'s benchmark.`,
        landmine: `Are we exposed to regulatory risk by using non-standardized methods for banking integrations?`
      }
    }
  }),
  ecosystem_player: (comp) => ({
    implication: `Technical interoperability & ledger consolidation with ${comp}`,
    personas: {
      CTO: {
        objection: `How does this layer integrate with ${comp}'s existing core banking systems?`,
        counter: `Blostem sits atop ${comp}'s legacy cores, providing a unified API layer for modern product distribution without requiring a core migration.`,
        landmine: `What happens to our digital agility if we remain tied to ${comp}'s rigid legacy roadmap?`
      },
      Founder: {
        objection: `Can we launch new banking products faster without waiting for ${comp}'s core updates?`,
        counter: `Blostem enables rapid product iteration by abstracting ${comp}'s legacy complexity into a modern orchestration layer.`,
        landmine: `How many months of revenue are we losing due to ${comp}'s integration delays?`
      },
      Compliance: {
        objection: `How do we consolidate compliance reporting across multiple ${comp} systems?`,
        counter: `Blostem provides a unified reporting layer, standardizing logs from different ${comp} cores into a single, audit-ready digital format.`,
        landmine: `How long does it take our team to generate a unified single-customer view across ${comp} today?`
      }
    }
  })
};

function getStrategicPrimitive(signal: Signal, category: BFSICategory, competitor: string): StrategicImplication {
  const signalType = classifySignalType(signal.value, signal.normalizedType);
  const metadata = BFSI_TAXONOMY[category];
  const role = metadata.role;
  
  const factory = STRATEGIC_MAP[signalType] || ROLE_PRIMITIVES[role];
  return factory(competitor);
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
  const gtmPrim = RELATIONSHIP_PRIMITIVES[marketRole];

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

  // Persona objections (Dynamic)
  const topSignals = signals.slice(0, 3);
  const persona_objections: PersonaObjection[] = [];
  const mainSignal = topSignals[0] || { value: "", citationIds: [], id: "fallback", type: "general" };
  const primitive = getStrategicPrimitive(mainSignal, compType, competitor);

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

  // Customer Sentiment (Synthesized from actual signals)
  const positives = signals
    .filter(s => s.normalizedType === "success_metric" || s.value.toLowerCase().includes("positive") || s.value.toLowerCase().includes("trusted"))
    .map(s => s.summary || s.value.slice(0, 80));
  
  const negatives = actualComplaints.map(s => s.summary || s.value.slice(0, 80));
  
  const customer_sentiment = {
    positives: positives.length > 0 ? positives.slice(0, 3) : [],
    negatives: negatives.length > 0 ? negatives.slice(0, 3) : []
  };

  // Strategic Risks (Refined phrasing)
  const strategic_risks = [
    `Dependency on bundled compliance and settlement infrastructure may reduce operational transparency.`,
    `Potential for support bottlenecks during deep ${metadata.label} escalations.`
  ];
  if (marketRole === "partner") {
    strategic_risks.push("Commercial misalignments on shared revenue or distribution models.");
  }

  // Executive Signal (Issue 1 - Refined for overlap vs competition)
  const executive_signal = (competitor.toLowerCase().includes("paytm") || competitor.toLowerCase().includes("phonepe"))
    ? `${competitor} overlaps with Blostem at the merchant distribution layer, but does not provide specialized infrastructure for regulated deposit orchestration.`
    : relationship.primary === "DIRECT_COMPETITOR" 
    ? `${competitor} actively competes on core fintech workflow, but lacks Blostem's specialized multi-bank orchestration for regulated banking products.`
    : relationship.primary === "INDIRECT_COMPETITOR"
    ? `${competitor} dominates transaction movement and consumer engagement, but relies on Blostem-like infra for deep banking-product orchestration.`
    : relationship.primary === "INTEGRATION_TARGET"
    ? `${competitor} provides complementary infrastructure; integration creates a unified data and compliance flow for banking products.`
    : `${competitor} expands Blostem's orchestration layer with critical institution-grade asset inventory and regulatory depth.`;

  // Pricing Framing (Issue 5 - Fallback for zero evidence)
  const hasNoPricingEvidence = intelligence.pricing_posture?.entryPrice?.includes("No verified public pricing") || !intelligence.pricing_posture?.tiers?.length;
  const isAiBilling = compType.includes("ai") || competitor.toLowerCase().includes("paygentic");
  
  let pricing_framing: string[] = [];
  if (hasNoPricingEvidence) {
    pricing_framing = ["No verified public pricing structure identified beyond standard transaction-linked monetization patterns."];
  } else if (isAiBilling) {
    pricing_framing = [
      "Consumption-based billing for autonomous agent workflows.",
      "Token-weighted or task-specific transaction fees.",
      "Subscription tiers for orchestration and agent-management tools."
    ];
  } else {
    pricing_framing = [
      "MDR-linked monetization structures common in transaction layers.",
      "Merchant transaction volume-based pricing tiers.",
      "Bundled platform fees for custody and compliance orchestration."
    ];
  }

  // Event Taxonomy Split (Issue 3)
  const moves = intelligence.recent_moves || [];
  const recent_launches = moves
    .filter(m => m.type === "PRODUCT_LAUNCH" || m.type === "MARKET_EXPANSION")
    .map(move => ({
      ...move,
      impact: move.impact || "medium",
      strategic_relevance: move.strategic_relevance || `Expands ${competitor}'s footprint in ${metadata.label}.`
    }));

  const strategic_events = moves
    .filter(m => m.type !== "PRODUCT_LAUNCH" && m.type !== "MARKET_EXPANSION")
    .map(move => {
      let name = move.name;
      if (move.type === "FUNDING" && name.toLowerCase().includes("raise")) {
        const parts = name.split(/(raises?|funding)/i);
        if (parts.length > 2) {
          const amount = parts[parts.length - 1].trim();
          const normalized = normalizeFundingAmount(amount);
          name = `${parts[0].trim()} raises ${normalized}`;
        }
      }
      return {
        ...move,
        name,
        impact: move.impact || "medium",
        strategic_relevance: move.strategic_relevance || `Significant ${move.type.replace('_', ' ')} affecting ${competitor}'s market posture.`
      };
    });

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
    strategic_events,
    executive_signal,
    pricing_framing,
    customer_sentiment,
    persona_objections,
    objection_handling: [],
    quick_dismisses,
    why_we_win: gtmPrim.why_we_win,
    why_we_lose,
    pricing_positioning: metadata.pricing,
    FUD_responses: gtmPrim.fud_responses,
    proof_points: [
      "Blostem integrates with Zerodha for FD booking on Coin — proven at scale.",
      "Standardized flows used by top-tier Indian wealthtechs and brokerages."
    ],
    compete_aggressively_when: gtmPrim.gtm_push,
    why_this_appears_in_deals: intelligence.decision_orientation?.why_this_appears_in_deals || [],
    do_not_compete_when: DO_NOT_COMPETE_MAP[marketRole] || [],
    signal_trace: signals.slice(0, 3).map(s => ({
      signal: s.value.slice(0, 80),
      weapon: "Strategic inference",
      type: classifySignalType(s.value, s.normalizedType)
    })),
  };
}