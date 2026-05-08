import type { Citation, ExtractedIntelligence, Signal, AE_BATTLECARD } from "@/types";
import type { PersonaObjection, MarketRelationshipModel, CapabilityOrigin } from "@/types/battlecard";
import { classifySignalType } from "./utils/signal-classify";
import { BFSI_TAXONOMY, type BFSICategory, type MarketRole } from "@/types/entity";
import { inferCapabilities } from "./utils/capability-inference";
import { normalizeFundingAmount, deduplicatePhrases } from "./utils/format";

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

const DO_NOT_COMPETE_MAP: Record<MarketRole, (competitor: string, category: string) => string[]> = {
  direct_competitor: (comp) => [
    `Prospect only needs checkout/payment acceptance (not orchestration).`,
    `No roadmap for regulated savings/deposit products in their core workflow.`,
    `Prioritizes global merchant billing over ${comp}'s local banking depth.`
  ],
  indirect_competitor: (comp, cat) => [
    `Prospect primarily focused on B2C merchant acquisition via ${comp}.`,
    `No requirement for multi-bank redundancy provided by Blostem.`,
    `Only needs basic ${cat} ledgering without regulatory orchestration.`
  ],
  partner: (comp, cat) => [
    `Prospect already has deep, direct bank-infra ownership with ${comp}.`,
    `Entity does not want to expose their ${cat} inventory to external platforms.`,
    `Commercial model requires exclusive issuer-direct relationship without middleware.`
  ],
  non_competitor: (comp, cat) => [
    `Entity is a pure consumer app with no intent to launch ${cat} features.`,
    `Technical stack is fully locked into ${comp}'s proprietary end-to-end flow.`
  ],
  ecosystem_player: (comp, cat) => [
    `Institution already has a fully modern, API-first ${cat} system.`,
    `Requirement is for professional services/custom build rather than SaaS infra.`
  ]
};

const ROLE_PRIMITIVES: Record<MarketRole, (competitor: string) => StrategicImplication> = {
  direct_competitor: (comp) => ({
    implication: `Direct technical stack overlap with ${comp} on banking orchestration`,
    personas: {
      CTO: {
        objection: `Why shift from ${comp}'s integrated stack to Blostem?`,
        counter: `${comp} provides a payment-centric stack, but lacks specialized multi-bank orchestration for regulated banking products. Blostem gives you single-platform standardization with direct banking-log visibility.`,
        landmine: `How do you manage the maintenance overhead of multiple direct bank integrations within ${comp}'s mediated flow?`
      },
      Founder: {
        objection: `Is it better to stick with ${comp} for all our financial products?`,
        counter: `All-in-one stacks like ${comp} create vendor lock-in and roadmap dependency. Blostem is the aggregator equivalent for banking products, giving you the flexibility to swap banks without re-building your core product logic.`,
        landmine: `What happens to our unit economics if ${comp} increases their platform-wide fee structure next year?`
      },
      Compliance: {
        objection: `How does Blostem handle banking-product complexity compared to ${comp}?`,
        counter: `${comp} abstracts banking details away, which can hinder audit transparency. Blostem emphasizes direct banking-state visibility and audit-trace preservation, which is critical for regulated FDs and RDs.`,
        landmine: `What is the process for producing raw, bank-direct logs for every transaction in ${comp}'s platform today?`
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
    primary: "UNKNOWN",
    secondary: [],
    overlap_score: 0.5
  };

  if (marketRole === "direct_competitor") {
    relationship.primary = "DIRECT_COMPETITOR";
    relationship.secondary = ["INDIRECT_COMPETITOR"];
  } else if (marketRole === "indirect_competitor") {
    relationship.primary = "INDIRECT_COMPETITOR";
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

  // Why We Win (Dynamic)
  const why_we_win = intelligence.narratives?.why_we_win || gtmPrim.why_we_win;

  // Why We Lose
  // Why We Lose (Synthesized from role, label, and extracted narratives)
  let why_we_lose = intelligence.narratives?.why_we_lose || [];
  if (why_we_lose.length === 0) {
    const roleBasedWhyLose = {
      direct_competitor: [`Established legacy depth in ${metadata.label} and potential lock-in with existing enterprise banking relationships.`],
      indirect_competitor: [`Horizontal market familiarity and broader consumer-facing ecosystem presence beyond infrastructure.`],
      partner: [`Dependency on ${competitor}'s specific asset-issuance capacity or potential commercial misalignment.`],
      non_competitor: [`Market perception as a specialized ${metadata.label} platform may lead to perceived lower operational risk in early-stage deals.`],
      ecosystem_player: [`Technical dependencies on ${competitor}'s proprietary rails or regulatory reporting systems.`]
    };
    why_we_lose = roleBasedWhyLose[marketRole] || [`Strong market incumbency and specialized workflow depth in the ${metadata.label} segment.`];
  }

  // Quick Dismisses
  const actualComplaints = signals.filter(s => isActualCustomerComplaint(s));
  let quick_dismisses: string[] = [];
  for (const signal of actualComplaints.slice(0, 2)) {
    const signalType = classifySignalType(signal.value, signal.normalizedType);
    switch (signalType) {
      case "pricing_complaint": quick_dismisses.push(`${competitor}'s pricing complexity creates hidden costs at scale.`); break;
      case "support_issue": quick_dismisses.push(`${competitor}'s support response times cause delays.`); break;
      case "reliability": quick_dismisses.push(`${competitor}'s reliability issues create operational risk.`); break;
    }
  }
  if (quick_dismisses.length === 0) {
    const dismissFallbacks = {
      direct_competitor: [`Does ${competitor} provide standardized multi-bank orchestration or just a mediated API layer for a single issuer?`],
      indirect_competitor: [`Is the goal to move funds through ${competitor} or to orchestrate the actual banking product lifecycle with Blostem?`],
      partner: [`How does ${competitor}'s current issuance capacity align with our need for multi-institution redundancy?`],
      non_competitor: [`Is ${competitor} the primary distribution interface, or are you looking for the underlying infrastructure rails to power it?`],
      ecosystem_player: [`Does integrating with ${competitor} solve the core regulatory orchestration overhead of managing banking products?`]
    };
    quick_dismisses = dismissFallbacks[marketRole] || [`Confirm if ${competitor} provides native infrastructure or just a mediated software layer.`];
  }

  // Customer Sentiment (Merge LLM synthesis with raw signals)
  const extractedPositives = intelligence.customer_truths?.positives || [];
  const extractedNegatives = intelligence.customer_truths?.negatives || [];

  const rawPositives = signals
    .filter(s => s.normalizedType === "success_metric" || s.value.toLowerCase().includes("positive"))
    .map(s => s.summary || s.value.slice(0, 80));
  
  const rawNegatives = actualComplaints.map(s => s.summary || s.value.slice(0, 80));
  
  const customer_sentiment = {
    positives: deduplicatePhrases([...extractedPositives, ...rawPositives]).slice(0, 3),
    negatives: deduplicatePhrases([...extractedNegatives, ...rawNegatives]).slice(0, 4)
  };

  // Strategic Risks (Refined phrasing)
  let strategic_risks = intelligence.narratives?.strategic_risks || [];
  if (strategic_risks.length === 0) {
    const riskFallbacks = {
      direct_competitor: [
        `Operational lock-in within ${competitor}'s proprietary workflow limits multi-institution redundancy.`,
        `Potential for margin compression if transaction costs are bundled with licensing.`
      ],
      partner: [
        `Operational dependency on ${competitor}'s specific issuer capacity.`,
        `Commercial misalignment on long-term yield-sharing or distribution exclusivity.`
      ],
      ecosystem_player: [
        `Technical coupling to ${competitor}'s proprietary rails may increase migration complexity.`,
        `Limited visibility into the underlying state of regulated banking assets.`
      ],
      indirect_competitor: [
        `Horizontal expansion by ${competitor} into infrastructure may create overlapping feature debt.`,
        `Potential for ecosystem fragmentation as ${competitor} bundles non-core financial products.`
      ],
      non_competitor: [
        `Operational silos between ${competitor}'s distribution layer and Blostem's orchestration layer.`,
        `Strategic misalignment if ${competitor} shifts towards proprietary infrastructure rails.`
      ]
    };
    strategic_risks = riskFallbacks[marketRole] || [
      `Reliance on specialized ${metadata.label} workflows may create single-partner failure risk.`,
      `Potential for support bottlenecks during deep regulatory escalations.`
    ];
  }
  
  const executive_signal = intelligence.narratives?.executive_signal || (
    marketRole === "direct_competitor" 
    ? `${competitor} actively competes on core fintech workflow, but lacks Blostem's specialized multi-bank orchestration for regulated banking products.`
    : marketRole === "partner"
    ? `${competitor} provides critical ${metadata.label} capacity; Blostem acts as the technology bridge to digital distribution.`
    : marketRole === "ecosystem_player"
    ? `${competitor} provides essential specialized rails that complement Blostem's cross-institution orchestration.`
    : `${competitor} operates as a specialized ${metadata.label} entity, offering potential integration synergies with Blostem's infrastructure.`
  );

  // Pricing Framing (Issue 5 - Fallback for zero evidence)
  const hasNoPricingEvidence = intelligence.pricing_posture?.entryPrice?.includes("No verified public pricing") || !intelligence.pricing_posture?.tiers?.length;
  const isAiBilling = compType.includes("ai") || competitor.toLowerCase().includes("paygentic");
  
  let pricing_framing: string[] = [];
  if (hasNoPricingEvidence) {
    const modelLabels: Record<string, string> = {
      transaction_linked: "Transaction-linked MDR and volume-based settlement fees.",
      api_saas: "API usage-based tiers (per-call) with standard platform subscription layers.",
      license_as_service: "Bundled license-as-a-service fees combined with transaction markup.",
      retail_monetization: "Merchant-facing subscription models with per-user or per-trade commissions.",
      interbank_fee: "Interchange-linked revenue models and interbank settlement fees."
    };
    pricing_framing = [modelLabels[metadata.businessModel] || "Standardized transaction-linked monetization patterns."];
  } else if (isAiBilling) {
    pricing_framing = [
      "Consumption-based billing for autonomous agent workflows.",
      "Token-weighted or task-specific transaction fees.",
      "Subscription tiers for orchestration and agent-management tools."
    ];
  } else {
    pricing_framing = [
      metadata.pricing || "Volume-linked transaction fee structures.",
      "Merchant-specific pricing tiers based on operational complexity.",
      "Bundled platform fees for integrated custody and compliance rails."
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
    company_overview: intelligence.positioning?.tagline 
      ? `${intelligence.positioning.tagline} ${intelligence.positioning.targetSegments?.length ? `The platform serves ${intelligence.positioning.targetSegments.join(', ')} with a focus on ${intelligence.positioning.differentiators?.slice(0, 2).join(' and ') || 'operational efficiency'}.` : ''}` 
      : `${competitor} is a key infrastructure provider in the ${metadata.label} segment, focused on ${metadata.definition.toLowerCase()}.`,
    competitor_type: compType,
    entity_role: metadata.entityRole,
    category_contrast: `${competitor} = ${metadata.definition}; Blostem = payment aggregator equivalent for banking products (standardized FD/RD orchestration)`,
    relationship_mode: relationship.primary,
    relationship,
    strategic_overlap,
    strategic_relationship: marketRole === "direct_competitor" 
      ? `**Displace**: ${competitor} actively overlaps with Blostem's core workflow as a ${metadata.label}. Focus on our specialized banking orchestration vs their generic ${metadata.definition.toLowerCase()} stack.`
      : marketRole === "indirect_competitor"
      ? `**Strategic Overlap**: ${competitor} dominates ${metadata.label} volume, but relies on Blostem-like infrastructure for deeper banking-product orchestration and regulatory auditability.`
      : marketRole === "partner"
      ? `**Primary Partner**: ${competitor} is a key asset issuer in the ${metadata.label} space; integration directly expands Blostem's yield inventory for wealthtech distributors.`
      : `**Integration Target**: ${competitor} serves as a high-intent distribution channel for Blostem's embedded banking products within the ${metadata.label} ecosystem.`,
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
    do_not_compete_when: DO_NOT_COMPETE_MAP[marketRole] ? DO_NOT_COMPETE_MAP[marketRole](competitor, metadata.label) : [],
    signal_trace: signals.slice(0, 3).map(s => ({
      signal: s.value.slice(0, 80),
      weapon: "Strategic inference",
      type: classifySignalType(s.value, s.normalizedType)
    })),
  };
}