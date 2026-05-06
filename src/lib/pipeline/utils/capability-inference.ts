import { BFSI_TAXONOMY, type BFSICategory, type InfraLayer, type CustodyModel } from "@/types/entity";
import type { Signal } from "@/types/battlecard";

export interface CapabilityResult {
  value: "native" | "partnered" | "partial" | "none";
  confidence: number;
}

const CAPABILITY_MAP: Record<string, {
  requiredInfra: InfraLayer[];
  requiredCustody?: CustodyModel[];
  categoryBoost: Record<BFSICategory, "native" | "partnered" | "partial">;
}> = {
  payment_routing: {
    requiredInfra: ["payment_orchestration"],
    categoryBoost: {
      payment_gateway: "native",
      payment_aggregator: "native",
      payment_orchestration: "native",
      merchant_of_record: "native",
      banking_api_infra: "partnered",
    } as any
  },
  deposit_lifecycle: {
    requiredInfra: ["core_banking_rails"],
    requiredCustody: ["none_direct_rail"],
    categoryBoost: {
      neobanking_infra: "native",
      embedded_finance_infra: "partial",
      banking_api_infra: "partnered",
    } as any
  },
  kyc_kyb: {
    requiredInfra: ["core_banking_rails", "payment_orchestration", "account_aggregation"],
    categoryBoost: {
      kyc_aml: "native",
      regtech: "native",
      neobanking_infra: "native",
      merchant_of_record: "native",
    } as any
  },
  banking_compliance: {
    requiredInfra: ["core_banking_rails"],
    categoryBoost: {
      neobanking_infra: "native",
      regtech: "partnered",
      merchant_of_record: "partial",
    } as any
  },
  tax_handling: {
    requiredInfra: ["payment_orchestration"],
    requiredCustody: ["mor_custody"],
    categoryBoost: {
      merchant_of_record: "native",
    } as any
  },
  reg_orchestration: {
    requiredInfra: ["core_banking_rails", "account_aggregation"],
    categoryBoost: {
      neobanking_infra: "native",
      banking_api_infra: "native",
      regtech: "partnered",
    } as any
  }
};

export function inferCapabilities(
  category: BFSICategory,
  signals: Signal[]
): Record<string, CapabilityResult> {
  const metadata = BFSI_TAXONOMY[category];
  const results: Record<string, CapabilityResult> = {};

  for (const [cap, rules] of Object.entries(CAPABILITY_MAP)) {
    let value: CapabilityResult["value"] = "none";
    let confidence = 0.3; // Base low confidence for inference

    // 1. Category-based boost (Strongest signal)
    if (rules.categoryBoost[category]) {
      value = rules.categoryBoost[category];
      confidence = 0.7; // Category-level inference is relatively strong
    }

    // 2. Metadata validation (Infra check)
    const hasRequiredInfra = rules.requiredInfra.includes(metadata.infraLayer);
    const hasRequiredCustody = !rules.requiredCustody || rules.requiredCustody.includes(metadata.custodyModel);

    if (hasRequiredInfra && hasRequiredCustody) {
      if (value === "none") {
        value = "partial";
        confidence = 0.5;
      } else {
        confidence += 0.1;
      }
    } else if (value === "native" && !hasRequiredInfra) {
      // DOWNGRADE if infra doesn't support native claim
      value = "partnered";
      confidence -= 0.2;
    }

    // 3. Signal-based adjustment
    const capSignals = signals.filter(s => 
      s.value.toLowerCase().includes(cap.replace("_", " ")) || 
      s.normalizedType?.includes(cap)
    );

    if (capSignals.length > 0) {
      confidence += Math.min(capSignals.length * 0.1, 0.2);
      if (value === "none") value = "partial";
    }

    results[cap] = {
      value,
      confidence: Math.min(confidence, 0.95)
    };
  }

  return results;
}
