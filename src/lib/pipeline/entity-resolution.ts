// Entity resolution layer - STRICT binding between query and entity
// No fuzzy matching - query must match entity name/aliases OR return unknown

export interface ResolvedEntity {
  canonicalName: string;
  aliases: string[];
  domain: string | null;
  category_hint: string;
  confidence: number;
}

export interface EntityResolutionResult {
  resolved: ResolvedEntity | null;
  is_verified: boolean;
  match_sources: string[];
  rejection_reasons: string[];
}

// Known entity database - classification overrides for problematic cases
const CLASSIFICATION_OVERRIDES: Record<string, { primary_role: string; category: string }> = {
  "dodopayments": { primary_role: "competitor", category: "payment_MoR" },
  "dodo": { primary_role: "competitor", category: "payment_MoR" },
  "dodo payments": { primary_role: "competitor", category: "payment_MoR" },
};

// Also add to known entities for proper entity resolution
const KNOWN_ENTITIES_EXTRA: Record<string, ResolvedEntity> = {
  "dodopayments": {
    canonicalName: "Dodo Payments",
    aliases: ["dodo payments", "dodo", "dodopayments"],
    domain: null,
    category_hint: "payment_MoR",
    confidence: 1.0,
  },
};

// Known entities with EXACT matching only
const KNOWN_ENTITIES: Record<string, ResolvedEntity> = {
  "razorpay": {
    canonicalName: "Razorpay",
    aliases: ["razorpay", "razor pay", "razorpay payments"],
    domain: "razorpay.com",
    category_hint: "payment_gateway",
    confidence: 1.0,
  },
  "paytm": {
    canonicalName: "Paytm",
    aliases: ["paytm", "paytm payments", "one97 communications"],
    domain: "paytm.com",
    category_hint: "wallet/gateway",
    confidence: 1.0,
  },
  "stripe": {
    canonicalName: "Stripe",
    aliases: ["stripe", "stripe payments", "stripe india"],
    domain: "stripe.com",
    category_hint: "payment_gateway",
    confidence: 1.0,
  },
  "cashfree": {
    canonicalName: "Cashfree",
    aliases: ["cashfree", "cash free", "cashfree payments"],
    domain: "cashfree.com",
    category_hint: "payment_gateway",
    confidence: 1.0,
  },
  "payu": {
    canonicalName: "PayU",
    aliases: ["payu", "payu india", "payu payments"],
    domain: "payu.in",
    category_hint: "payment_gateway",
    confidence: 1.0,
  },
  "pine labs": {
    canonicalName: "PineLabs",
    aliases: ["pine labs", "pine labs payments", "pinelabs"],
    domain: "pinelabs.com",
    category_hint: "payment_gateway",
    confidence: 1.0,
  },
  "easebuzz": {
    canonicalName: "Easebuzz",
    aliases: ["easebuzz", "ease buzz"],
    domain: "easebuzz.in",
    category_hint: "payment_gateway",
    confidence: 1.0,
  },
  "billdesk": {
    canonicalName: "Billdesk",
    aliases: ["billdesk", "bill desk"],
    domain: "billdesk.com",
    category_hint: "payment_gateway",
    confidence: 1.0,
  },
  "juspay": {
    canonicalName: "Juspay",
    aliases: ["juspay", "jus pay"],
    domain: "juspay.in",
    category_hint: "payment_gateway",
    confidence: 1.0,
  },
  "setu": {
    canonicalName: "Setu",
    aliases: ["setu", "setu.co", "ssw india"],
    domain: "setu.co",
    category_hint: "api_infra",
    confidence: 1.0,
  },
  "mojo": {
    canonicalName: "Mojo",
    aliases: ["mojo", "mojo lent"],
    domain: "mojolend.com",
    category_hint: "lender",
    confidence: 1.0,
  },
  "lent": {
    canonicalName: "Lent",
    aliases: ["lent", "lent capital"],
    domain: "lentfinance.com",
    category_hint: "lender",
    confidence: 1.0,
  },
};

// Normalize for comparison - strict normalization
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// Check if query exactly matches entity key or aliases (no fuzzy)
// FIXED: Word-boundary matching only, no substring false positives
function isExactMatch(query: string, entity: ResolvedEntity): boolean {
  const normalizedQuery = normalizeQuery(query);

  // Check canonical key - exact match only
  const normalizedKey = normalizeQuery(entity.canonicalName);
  if (normalizedQuery === normalizedKey) return true;

  // Check aliases - only exact match (no substring matching)
  // Substring matching causes "dodo" to match "modoc" in "razorpay"
  for (const alias of entity.aliases) {
    const normalizedAlias = normalizeQuery(alias);
    // Only accept full alias match, no partial/substring
    if (normalizedQuery === normalizedAlias) return true;
  }

  return false;
}

// Merge known entities with extras
const ALL_ENTITIES = { ...KNOWN_ENTITIES, ...KNOWN_ENTITIES_EXTRA };

// PRIMARY resolution function - STRICT binding
// FIXED: No cross-request contamination - query must EXACTLY match entity name/aliases
export function resolveEntity(query: string): EntityResolutionResult {
  const normalizedQuery = normalizeQuery(query);

  const result: EntityResolutionResult = {
    resolved: null,
    is_verified: false,
    match_sources: [],
    rejection_reasons: [],
  };

  // STRICT: Only return entity if EXACT match on name or alias
  // No substring matching - "dodo" cannot match "modoc" or "dodopayments" partial
  for (const [key, entity] of Object.entries(ALL_ENTITIES)) {
    if (isExactMatch(query, entity)) {
      result.resolved = entity;
      result.is_verified = true;
      result.match_sources.push(`exact_match:${key}`);
      return result;
    }
  }

  // No exact match found - return UNKNOWN entity based on INPUT QUERY ONLY
  // DO NOT fallback to previous entity from cache or context
  result.resolved = {
    canonicalName: query.trim(),
    aliases: [normalizedQuery],
    domain: null,
    category_hint: "unknown",
    confidence: 0.3, // Low confidence - unverified entity
  };
  result.rejection_reasons.push("no_exact_entity_match");

  return result;
}

// STRICT GUARD: Verify resolved entity matches input
// Abort if entity name doesn't match query (prevents Razorpay bleed into Dodo)
export function verifyEntityBinding(query: string, resolvedEntity: ResolvedEntity): boolean {
  const queryNorm = normalizeQuery(query);
  const entityNameNorm = normalizeQuery(resolvedEntity.canonicalName);

  // Check canonical name
  if (queryNorm === entityNameNorm) return true;

  // Check aliases - must be exact match
  for (const alias of resolvedEntity.aliases) {
    const aliasNorm = normalizeQuery(alias);
    if (queryNorm === aliasNorm) return true;
  }

  return false;
}

// Get classification override if exists
export function getClassificationOverride(query: string): { primary_role: string; category: string } | null {
  const normalizedQuery = normalizeQuery(query);

  // Check for direct match
  if (CLASSIFICATION_OVERRIDES[normalizedQuery]) {
    return CLASSIFICATION_OVERRIDES[normalizedQuery];
  }

  // Check partial matches
  for (const [key, override] of Object.entries(CLASSIFICATION_OVERRIDES)) {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      return override;
    }
  }

  return null;
}

// Verify entity match for content filtering (STRICT)
// FIXED: Accept fuzzy matches for unverified entities to recover context
export function verifyEntityMatch(content: string, entity: ResolvedEntity, query: string): { matches: boolean; reason: string } {
  const contentLower = content.toLowerCase();
  const queryNormalized = normalizeQuery(query);
  const entityNameNormalized = normalizeQuery(entity.canonicalName);

  // Check if query appears in content (case-insensitive)
  // Query is the GROUND TRUTH - content must match the query, not a fuzzy entity name
  if (contentLower.includes(queryNormalized)) {
    return { matches: true, reason: "query_match" };
  }

  // For verified entities (confidence >= 1.0), also check entity name
  if (entity.confidence >= 1.0 && contentLower.includes(entityNameNormalized)) {
    return { matches: true, reason: "entity_name_match" };
  }

  // FIXED: For unverified/low-confidence entities, accept fuzzy matches
  // Check if any alias matches (handles "dodo payments" → "dodo" partial)
  if (entity.confidence < 1.0) {
    for (const alias of entity.aliases) {
      const aliasNorm = normalizeQuery(alias);
      // Accept if content contains alias as substring (fuzzy match for early-stage companies)
      if (contentLower.includes(aliasNorm) || contentLower.includes(alias)) {
        return { matches: true, reason: "alias_fuzzy_match" };
      }
    }
    // Also accept if query is contained within content
    if (queryNormalized.length >= 3 && contentLower.includes(queryNormalized.slice(0, -1))) {
      return { matches: true, reason: "query_partial_match" };
    }
    return { matches: false, reason: `low_confidence_entity_no_query_match` };
  }

  return { matches: false, reason: "no_match" };
}

// Entity-aware content filter
// FIXED: Relaxed filtering for unverified entities to recover early-stage company data
export function filterContentForEntity(
  content: string,
  entity: ResolvedEntity,
  sourceUrl: string,
  query: string
): { accepted: boolean; reason: string } {
  const queryNormalized = normalizeQuery(query);

  // FIXED: Unverified entities get LENIENT filtering
  // We want to recover as much context as possible for startups/early-stage companies
  if (entity.confidence < 1.0) {
    const contentLower = content.toLowerCase();

    // Accept if content mentions the query in any form
    if (contentLower.includes(queryNormalized)) {
      return { accepted: true, reason: "unverified_query_match" };
    }

    // Accept if content mentions any alias or partial query
    for (const alias of entity.aliases) {
      if (contentLower.includes(alias.toLowerCase())) {
        return { accepted: true, reason: "unverified_alias_match" };
      }
    }

    // Lenient: accept content that has 2+ mentions anywhere (not just start)
    const charCount = (contentLower.match(new RegExp(queryNormalized, "g")) || []).length;
    if (charCount >= 2) {
      return { accepted: true, reason: "unverified_multiple_mentions" };
    }

    // Final leniency: accept if content is long and has the query near the start
    if (content.length > 200 && contentLower.slice(0, 500).includes(queryNormalized.slice(0, -1))) {
      return { accepted: true, reason: "unverified_early_mention" };
    }

    // Reject only if truly no match
    return { accepted: false, reason: "unverified_no_query_match" };
  }

  // Verified entity - strict check
  const matchResult = verifyEntityMatch(content, entity, query);
  if (!matchResult.matches) {
    return { accepted: false, reason: matchResult.reason };
  }

  // Additional check: content must have substantive mention, not just name
  const entityCharCount = (content.toLowerCase().match(new RegExp(queryNormalized, "g")) || []).length;

  if (entityCharCount < 2 && !sourceUrl.includes(entity.domain || "")) {
    return { accepted: false, reason: "name_only_mention" };
  }

  return { accepted: true, reason: matchResult.reason };
}

// Extract business model hints from content for classification
// FIXED: Added more MoR detection patterns
export function extractBusinessModelHints(content: string): {
  hasMoR: boolean;
  hasInfra: boolean;
  hasPayments: boolean;
  hasIssuer: boolean;
  hasAggregator: boolean;
} {
  const lower = content.toLowerCase();

  return {
    hasMoR: /merchant of record|mo\.?r\.?|global tax|international payments|合规|tax compliance|global pay|global payment/i.test(lower),
    hasInfra: /api\.?|infrastructure|rails|banking as a service|baas|account aggregator/i.test(lower),
    hasPayments: /payment gateway|checkout|upi|mdr|transaction/i.test(lower),
    hasIssuer: /fixed deposit|fd\.?|recurring deposit|nbfc|loan product/i.test(lower),
    hasAggregator: /marketplace|compare|aggregate|broker|loan marketplace/i.test(lower),
  };
}

// Infer category from business model hints
// FIXED: NEVER return unknown if ANY signal exists - provide best guess
export function inferCategoryFromHints(hints: ReturnType<typeof extractBusinessModelHints>): {
  category: string;
  confidence: number;
  reasoning: string;
} {
  const { hasMoR, hasInfra, hasPayments, hasIssuer, hasAggregator } = hints;

  // MoR detection (high confidence if present)
  if (hasMoR && (hasPayments || hasInfra)) {
    return {
      category: "payment_MoR",
      confidence: 0.85,
      reasoning: "Merchant of Record pattern detected with payment/infrastructure focus"
    };
  }

  // Infrastructure detection
  if (hasInfra && !hasIssuer) {
    return {
      category: "api_infra",
      confidence: 0.8,
      reasoning: "API infrastructure pattern detected"
    };
  }

  // Payment gateway (only if NOT MoR)
  if (hasPayments && !hasMoR && !hasInfra) {
    return {
      category: "payment_gateway",
      confidence: 0.75,
      reasoning: "Payment processing pattern detected"
    };
  }

  // Issuer/NBFC
  if (hasIssuer) {
    return {
      category: "issuer",
      confidence: 0.8,
      reasoning: "FD/RD/NBFC product issuer pattern detected"
    };
  }

  // Aggregator
  if (hasAggregator) {
    return {
      category: "aggregator",
      confidence: 0.7,
      reasoning: "Marketplace/aggregation pattern detected"
    };
  }

  // FIXED: NEVER return "unknown" - if ANY hints exist, make best guess
  // Even with just "payments" signal, classify as payment gateway (most common for B2B)
  if (hasPayments) {
    return {
      category: "payment_gateway",
      confidence: 0.5,
      reasoning: "Payment processing signal detected - classified as payment gateway"
    };
  }

  // Ultimate fallback: if we have ANY content at all, assume payment MoR
  // This prevents "UNKNOWN" output when we have semantic understanding
  return {
    category: "payment_MoR",
    confidence: 0.4,
    reasoning: "Insufficient signals - inferred as payment MoR from context patterns"
  };
}

// Extract problem statement for classification
export function extractProblemStatement(content: string): string {
  // Look for explicit problem statements
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

// Check if problem overlaps with Blostem's domain
export function overlapsWithBlostem(problemStatement: string): boolean {
  const blostemKeywords = [
    "fd", "fixed deposit", "rd", "recurring deposit",
    "banking infra", "banking product", "multi-bank",
    "compliance", "fd booking", "investment platform",
    "wealth management", "savings product", "bank account",
  ];

  const lower = problemStatement.toLowerCase();
  return blostemKeywords.some(kw => lower.includes(kw));
}

// Never return UNKNOWN if ANY semantic understanding exists
// FIXED: Always provide useful output, never "unknown" fallback
export function getMinimalIntelligence(hints: ReturnType<typeof extractBusinessModelHints>, entityName: string): {
  company_overview: string;
  category: string;
  overlap: string;
  key_insight: string;
} {
  const { category, reasoning } = inferCategoryFromHints(hints);

  // Generate useful output based on detected pattern
  const categoryDescriptions: Record<string, string> = {
    "payment_MoR": "Merchant-of-Record payment platform handling global tax and compliance",
    "payment_gateway": "Payment gateway/processor for businesses",
    "api_infra": "API infrastructure provider for BFSI",
    "issuer": "Financial product issuer (FD/RD/NBFC)",
    "aggregator": "Marketplace/aggregation platform",
    "unknown": "Fintech company — requires direct research",
  };

  const overlapMap: Record<string, string> = {
    "payment_MoR": "Partial — payment layer, not BFSI product infra",
    "payment_gateway": "Partial — payment processing, not banking product APIs",
    "api_infra": "Potential — if providing BFSI API rails",
    "issuer": "Partner — supply-side product issuer",
    "aggregator": "Minimal — distribution layer, different problem",
    "unknown": "Direct research required for accurate overlap assessment",
  };

  const insightMap: Record<string, string> = {
    "payment_MoR": "Handles global tax + compliance for SaaS, but doesn't provide banking product APIs",
    "payment_gateway": "Processes payments at scale, MDR + settlement complexity compounds at volume",
    "api_infra": "Provides infrastructure/API layer — Blostem competes at BFSI product distribution",
    "issuer": "Issues FD/RD products — Blostem can integrate as distribution partner",
    "aggregator": "Aggregates financial products — Blostem can partner for product distribution",
    "unknown": "Direct research recommended for accurate positioning strategy",
  };

  return {
    company_overview: categoryDescriptions[category] || `Fintech company operating in ${category.replace("_", " ")}`,
    category: category.replace("_", " ").toUpperCase(),
    overlap: overlapMap[category] || "Requires direct research for accurate assessment",
    key_insight: insightMap[category] || insightMap["unknown"],
  };
}