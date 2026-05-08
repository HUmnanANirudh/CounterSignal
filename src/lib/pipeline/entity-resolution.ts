import type { BFSICategory } from "@/types/entity";
import type { ResolvedEntity, EntityResolutionResult } from "@/types/pipeline";
import { getMarketRole } from "@/types/entity";
export { getEntityCategoryHint } from "./utils/domain";

export type { ResolvedEntity, EntityResolutionResult };


// Noise words to remove
const NOISE_WORDS = ["inc", "ltd", "llc", "pvt", "private", "fintech", "app", "payments", "payment", "india", "indian", "fintech", "tech", "solutions", "services", "group"];

// Alias resolution - map common nicknames to canonical names
const ALIAS_MAP: Record<string, string> = {
  "lic": "Life Insurance Corporation of India",
  "lic of india": "Life Insurance Corporation of India",
  "life insurance corporation": "Life Insurance Corporation of India",
  "paytm": "Paytm",
  "razorpay": "Razorpay",
  "cashfree": "Cashfree",
  "dodo": "Dodo Payments",
  "dodo payments": "Dodo Payments",
  "setu": "Setu",
  "zeta": "Zeta",
  "m2p": "M2P",
  "groww": "Groww",
  "zerodha": "Zerodha",
  "upstox": "Upstox",
  "bajaj": "Bajaj Finserv",
  "shriram": "Shriram",
  "mobikwik": "MobiKwik",
  "phonepe": "PhonePe",
  "gpay": "Google Pay",
  "stripe": "Stripe",
  "paddle": "Paddle",
  "paygentic": "Paygentic",
  "juicy": "Juicy",
  "creem": "Creem",
};

// Normalize query - lowercase, remove noise
export function normalizeQuery(query: string): { normalized: string; aliases: string[]; canonicalName?: string } {
  let cleaned = query.toLowerCase().trim();

  // Check aliases first
  const aliasKey = cleaned.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const canonicalFromAlias = ALIAS_MAP[aliasKey];

  for (const noise of NOISE_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${noise}\\b`, "gi"), "");
  }
  cleaned = cleaned.replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();

  const aliases = [
    cleaned.replace(/\s+/g, ""), // concatenated
    ...cleaned.split(/\s+/).filter(w => w.length > 2), // individual words
  ];

  return { normalized: cleaned, aliases, canonicalName: canonicalFromAlias };
}

// Compute entity confidence as scoring model
export function computeEntityConfidence(query: string): number {
  const { normalized, aliases } = normalizeQuery(query);

  // Scoring model: recognize BFSI authority terms
  const hasAuthorityTerm = /\b(bank|corporation|national|payment|settlement|reserve|insurance|ltd|limited|holdings)\b/i.test(query);
  
  if (normalized.length <= 5) {
    return 0.9; 
  } else if (normalized.length <= 15 || hasAuthorityTerm) {
    return 0.8; 
  } else {
    return 0.6;
  }
}

// PRIMARY resolution function - scoring model, no database
export function resolveEntity(query: string): EntityResolutionResult {
  const { normalized, aliases, canonicalName } = normalizeQuery(query);

  const result: EntityResolutionResult = {
    resolved: null,
    is_verified: false,
    match_sources: [],
    rejection_reasons: [],
    entityConfidence: computeEntityConfidence(query),
  };

  // If query is meaningful (not just noise), return resolved entity
  if (normalized.length >= 3) {
    // Use canonical name from alias map if available, otherwise use original query
    const displayName = canonicalName || query.trim();

    const resolved: ResolvedEntity = {
      canonicalName: displayName,
      aliases,
      domain: null,
      categoryHint: "payment_gateway", // Default - will be classified later
      confidence: result.entityConfidence,
      classification: { primaryRole: "direct_competitor", category: "payment_gateway" },
    };

    // Check for common patterns to hint category
    // Use category signals from BFSI taxonomy instead of hardcoded company names
    const combined = query.toLowerCase();
    if (/\b(insurtech|insurance\s*tech|insurance\s*aggregator|insurance\s*platform|life\s*insurance|general\s*insurance|health\s*insurance)\b/i.test(combined)) {
      resolved.categoryHint = "insurtech";
      resolved.classification = { primaryRole: "non_competitor", category: "insurtech" };
    } else if (/\b(broker|wealth\s*platform|robo\s*advisor|trading\s*platform|demat|securities)\b/i.test(combined)) {
      resolved.categoryHint = "broker";
      resolved.classification = { primaryRole: "non_competitor", category: "broker" };
    } else if (/\b(nbfc|non\s*banking|loan\s*provider|lending\s*platform|credit\s*platform)\b/i.test(combined)) {
      resolved.categoryHint = "nbfc";
      resolved.classification = { primaryRole: "partner", category: "nbfc" };
    } else if (/\b(wallet|digital\s*wallet|mobile\s*wallet|prepaid\s*wallet)\b/i.test(combined)) {
      resolved.categoryHint = "wallet";
      resolved.classification = { primaryRole: "indirect_competitor", category: "wallet" };
    } else if (/\b(banking\s*api|api\s*banking|bank\s*integration|account\s*aggregator|AA\b)\b/i.test(combined)) {
      resolved.categoryHint = "banking_api_infra";
      resolved.classification = { primaryRole: "direct_competitor", category: "banking_api_infra" };
    } else if (/\b(merchant\s*of\s*record|merchant\s*of\s*record|payment\s*facilitator|mor)\b/i.test(combined)) {
      resolved.categoryHint = "merchant_of_record";
      resolved.classification = { primaryRole: "direct_competitor", category: "merchant_of_record" };
    } else if (/\b(neobank|neobanking|neo\s*bank|full\s*stack\s*bank)\b/i.test(combined)) {
      resolved.categoryHint = "neobanking_infra";
      resolved.classification = { primaryRole: "indirect_competitor", category: "neobanking_infra" };
    }

    result.resolved = resolved;
    result.match_sources.push(`scored:${normalized}`);
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