import type { BFSICategory } from "@/types/entity";
import type { ResolvedEntity, EntityResolutionResult } from "@/types/pipeline";
import { getMarketRole } from "@/types/entity";
export { getEntityCategoryHint } from "./utils/domain";

export type { ResolvedEntity, EntityResolutionResult };


// Noise words to remove
const NOISE_WORDS = ["inc", "ltd", "llc", "pvt", "private", "fintech", "app", "payments", "payment", "india", "indian", "fintech", "tech", "solutions", "services", "group"];

// Normalize query - lowercase, remove noise
export function normalizeQuery(query: string): { normalized: string; aliases: string[] } {
  let cleaned = query.toLowerCase().trim();

  for (const noise of NOISE_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${noise}\\b`, "gi"), "");
  }
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

  const aliases = [
    cleaned.replace(/\s+/g, ""), // concatenated
    ...cleaned.split(/\s+/).filter(w => w.length > 2), // individual words
  ];

  return { normalized: cleaned, aliases: [...new Set(aliases)] };
}

// Compute entity confidence as scoring model
export function computeEntityConfidence(query: string): number {
  const { normalized, aliases } = normalizeQuery(query);

  // Simple scoring: shorter queries = higher confidence for exact match
  // Longer queries = more ambiguous
  if (normalized.length <= 5) {
    return 0.9; // Short name, high confidence if matched
  } else if (normalized.length <= 10) {
    return 0.7; // Medium name
  } else {
    return 0.5; // Long name, more uncertain
  }
}

// PRIMARY resolution function - scoring model, no database
export function resolveEntity(query: string): EntityResolutionResult {
  const { normalized, aliases } = normalizeQuery(query);

  const result: EntityResolutionResult = {
    resolved: null,
    is_verified: false,
    match_sources: [],
    rejection_reasons: [],
    entityConfidence: computeEntityConfidence(query),
  };

  // If query is meaningful (not just noise), return resolved entity
  if (normalized.length >= 3) {
    result.resolved = {
      canonicalName: query.trim(),
      aliases,
      domain: null,
      categoryHint: "payment_gateway", // Default - will be classified later
      confidence: result.entityConfidence,
      classification: { primaryRole: "competitor", category: "payment_gateway" },
    };
    result.match_sources.push(`scored:${normalized}`);

    // Check for common patterns to hint category
    if (/\b(groww|zerodha|upstox|broker|trading|stock)\b/i.test(query)) {
      result.resolved.categoryHint = "broker";
      result.resolved.classification = { primaryRole: "non_competitor", category: "broker" };
    } else if (/\b(shriram|bajaj|nbfc|loan|lending)\b/i.test(query)) {
      result.resolved.categoryHint = "nbfc";
      result.resolved.classification = { primaryRole: "supply_side", category: "nbfc" };
    } else if (/\b(paytm|wallet|mobikwik)\b/i.test(query)) {
      result.resolved.categoryHint = "wallet";
      result.resolved.classification = { primaryRole: "competitor", category: "wallet" };
    } else if (/\b(setu|decentro|yap|open\.?tech|banking.?api)\b/i.test(query)) {
      result.resolved.categoryHint = "banking_api_infra";
      result.resolved.classification = { primaryRole: "competitor", category: "banking_api_infra" };
    } else if (/\b(dodo|paddle|merchant.?of.?record|mor)\b/i.test(query)) {
      result.resolved.categoryHint = "merchant_of_record";
      result.resolved.classification = { primaryRole: "competitor", category: "merchant_of_record" };
    }

    return result;
  }

  // Too short/ambiguous
  result.rejection_reasons.push("query_too_short_or_ambiguous");
  return result;
}

// Verify entity binding (guard against cross-contamination)
export function verifyEntityBinding(query: string, resolved: ResolvedEntity): boolean {
  const { normalized: queryNorm } = normalizeQuery(query);
  const resolvedNorm = resolved.canonicalName.toLowerCase().replace(/[^a-z0-9]/g, "");

  return queryNorm === resolvedNorm ||
    queryNorm.includes(resolvedNorm) ||
    resolvedNorm.includes(queryNorm);
}

// Soft filter - scoring model instead of hard drops
export function scoreContentMatch(
  content: string,
  entity: ResolvedEntity,
  query: string
): { score: number; accepted: boolean; reason: string } {
  const { normalized: queryNorm } = normalizeQuery(query);
  const contentLower = content.toLowerCase();

  let score = 0.5; // Base score

  // Exact match
  if (contentLower.includes(queryNorm)) {
    score += 1;
  }

  // Entity name match
  const entityNameNorm = entity.canonicalName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (entityNameNorm && entityNameNorm !== queryNorm && contentLower.includes(entityNameNorm)) {
    score += 0.5;
  }

  // Alias match
  for (const alias of entity.aliases) {
    if (contentLower.includes(alias.toLowerCase())) {
      score += 0.3;
      break;
    }
  }

  // Hard rule: Never go below 5 documents total
  // This is enforced at search level

  return {
    score,
    accepted: score >= 0.3,
    reason: score >= 0.8 ? "strong_match" : score >= 0.5 ? "good_match" : score >= 0.3 ? "weak_match" : "poor_match",
  };
}

// Extract business model hints - scoring model for classification
export function extractBusinessModelHints(content: string): {
  paymentLayer: number;
  bankingInfra: number;
  lending: number;
  wealth: number;
  insurance: number;
  distribution: number;
} {
  const lower = content.toLowerCase();

  return {
    paymentLayer: (
      (/\b(payment\s*gateway|checkout|upi|mdr|transaction|payment\s*processor)\b/i.test(lower) ? 2 : 0) +
      (/\b(wallet|digital\s*wallet|mobile\s*wallet)\b/i.test(lower) ? 1.5 : 0) +
      (/\b(merchant\s*of\s*record|global\s*tax|international\s*payment)\b/i.test(lower) ? 2 : 0) +
      (/\b(phonepe|google\s*pay|tez)\b/i.test(lower) ? 1 : 0) +
      (/\b(payment\s*orchestration|juspay)\b/i.test(lower) ? 1.5 : 0)
    ),
    bankingInfra: (
      (/\b(api\s*banking|banking\s*api|bank\s*integration)\b/i.test(lower) ? 2 : 0) +
      (/\b(account\s*aggregator|AA\b|upi\s*stack)\b/i.test(lower) ? 2 : 0) +
      (/\b(embedded\s*finance|neo\s*banking\s*infra)\b/i.test(lower) ? 1.5 : 0) +
      (/\b(setu|decentro|yap|open\.?tech)\b/i.test(lower) ? 2 : 0)
    ),
    lending: (
      (/\b(nbfc|non\s*banking\s*finance|loan\s*provider)\b/i.test(lower) ? 2 : 0) +
      (/\b(personal\s*loan|business\s*loan|lending)\b/i.test(lower) ? 1.5 : 0) +
      (/\b(bnpl|buy\s*now\s*pay\s*later)\b/i.test(lower) ? 1 : 0) +
      (/\b(shriram|bajaj\s*finance)\b/i.test(lower) ? 2 : 0) +
      (/\b(fd\s*interest|fixed\s*deposit|rd\s*interest)\b/i.test(lower) ? 1.5 : 0)
    ),
    wealth: (
      (/\b(stockbroker|trading\s*platform|brokerage|zerodha|upstox)\b/i.test(lower) ? 2 : 0) +
      (/\b(groww|wealth\s*platform|mutual\s*fund)\b/i.test(lower) ? 1.5 : 0) +
      (/\b(demat|investing|robo\s*advisor)\b/i.test(lower) ? 1 : 0)
    ),
    insurance: (
      (/\b(insurtech|insurance\s*aggregator|policy\s*bazaar)\b/i.test(lower) ? 2 : 0) +
      (/\b(acko|digit|insurance)\b/i.test(lower) ? 1 : 0)
    ),
    distribution: (
      (/\b(marketplace|loan\s*marketplace|comparison)\b/i.test(lower) ? 1.5 : 0) +
      (/\b(paisabazaar|bankbazaar)\b/i.test(lower) ? 2 : 0) +
      (/\b(embedded\s*distribution|B2B\s*SaaS)\b/i.test(lower) ? 1 : 0)
    ),
  };
}

// Classify using deterministic scoring model
export function classifyFromHints(hints: ReturnType<typeof extractBusinessModelHints>): {
  category: BFSICategory;
  confidence: number;
  reasoning: string;
} {
  const scores: Array<{ category: BFSICategory; score: number; label: string }> = [
    { category: "payment_gateway", score: hints.paymentLayer, label: "Payment Gateway" },
    { category: "banking_api_infra", score: hints.bankingInfra, label: "Banking API Infra" },
    { category: "nbfc", score: hints.lending, label: "NBFC/Lending" },
    { category: "broker", score: hints.wealth, label: "Broker/Wealth" },
    { category: "marketplace", score: hints.distribution, label: "Marketplace" },
    { category: "insurtech", score: hints.insurance, label: "Insurance" },
  ];

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];

  // Rule: Never return unknown if any signal exists
  if (top.score < 0.5) {
    return {
      category: "payment_gateway",
      confidence: 0.3,
      reasoning: `No strong signals (top: ${top.label} at ${top.score.toFixed(1)}). Defaulting to payment_gateway.`,
    };
  }

  return {
    category: top.category,
    confidence: Math.min(1, top.score / 4),
    reasoning: `${top.label} detected (score: ${top.score.toFixed(1)})`,
  };
}

// Check overlap with Blostem
export function overlapsWithBlostem(text: string): boolean {
  const keywords = [
    "fd", "fixed deposit", "rd", "recurring deposit",
    "banking infra", "banking product", "multi-bank",
    "compliance", "fd booking", "investment platform",
    "wealth management", "savings product", "bank account",
  ];
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

// Extract problem statement
export function extractProblemStatement(content: string): string {
  const patterns = [
    /(?:we|company|platform)\s+(?:help|solve|address|provide|offer)\s+([^.]+)/i,
    /enables?\s+([^.]+?)(?:\.|,|$)/i,
    /provides?\s+([^.]+?)(?:\.|,|$)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1].length > 20) {
      return match[1].trim();
    }
  }
  return "";
}