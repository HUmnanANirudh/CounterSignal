import { BFSI_TAXONOMY, type BFSICategory, type InfraLayer, type CustodyModel } from "@/types/entity";
import type { Signal, CapabilityOrigin } from "@/types/battlecard";

export interface CapabilityResult {
  value: CapabilityOrigin;
  confidence: number;
}

const CAPABILITY_MAP: Record<string, {
  requiredInfra: InfraLayer[];
  requiredCustody?: CustodyModel[];
  categoryBoost: Record<BFSICategory, CapabilityOrigin>;
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
      embedded_finance_infra: "orchestrated",
      banking_api_infra: "partnered",
      nbfc: "indirect",
      lending_platform: "indirect",
      wealth_platform: "orchestrated",
      payment_gateway: "orchestrated", // RazorpayX type
      broker: "partnered", // Zerodha/Groww FD integration
    } as any
  },
  kyc_kyb: {
    requiredInfra: ["core_banking_rails", "payment_orchestration", "account_aggregation"],
    categoryBoost: {
      kyc_aml: "native",
      regtech: "native",
      neobanking_infra: "native",
      merchant_of_record: "native",
      nbfc: "native",
      lending_platform: "native",
      broker: "native",
      payment_gateway: "native",
    } as any
  },
  banking_compliance: {
    requiredInfra: ["core_banking_rails"], // Changed from payment_orchestration
    categoryBoost: {
      neobanking_infra: "native",
      banking_api_infra: "native",
      payment_gateway: "partnered",
      payment_aggregator: "partnered",
      wallet: "indirect",
      upi_app: "indirect",
      broker: "partnered",
    } as any
  },
  deposit_compliance: {
    requiredInfra: ["core_banking_rails"],
    categoryBoost: {
      neobanking_infra: "native",
      embedded_finance_infra: "partnered",
      nbfc: "native",
      payment_gateway: "orchestrated",
      broker: "partnered",
    } as any
  },
  tax_compliance: {
    requiredInfra: ["payment_orchestration"],
    requiredCustody: ["mor_custody"],
    categoryBoost: {
      merchant_of_record: "native",
      broker: "native",
      wealth_platform: "native",
    } as any
  },
  reg_orchestration: {
    requiredInfra: ["core_banking_rails", "account_aggregation"],
    categoryBoost: {
      neobanking_infra: "native",
      banking_api_infra: "native",
      regtech: "partnered",
      embedded_finance_infra: "native",
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
    let value: CapabilityOrigin = "absent";
    let confidence = 0.3; 

    // 1. Category-based boost
    if (rules.categoryBoost[category]) {
      value = rules.categoryBoost[category];
      confidence = 0.7;
    }

    // 2. Metadata validation
    const hasRequiredInfra = rules.requiredInfra.includes(metadata.infraLayer);
    const hasRequiredCustody = !rules.requiredCustody || rules.requiredCustody.includes(metadata.custodyModel);

    if (hasRequiredInfra && hasRequiredCustody) {
      if (value === "absent" || value === "unknown") {
        value = "indirect";
        confidence = 0.5;
      } else {
        confidence += 0.1;
      }
    } else if (value === "native" && !hasRequiredInfra) {
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
      if (value === "absent") value = "indirect";
    }

    results[cap] = {
      value,
      confidence: Math.min(confidence, 0.95)
    };
  }

  return results;
}
