// Entity resolution layer - maps search queries to verified entities
// Eliminates noisy sources before they contaminate extraction

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

// Known entity database - in production this would be a knowledge graph
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
  "payments bank": {
    canonicalName: "Payments Bank",
    aliases: ["payments bank", "payment bank"],
    domain: null,
    category_hint: "issuer",
    confidence: 0.8,
  },
  "setu": {
    canonicalName: "Setu",
    aliases: ["setu", "setu.co", "ssw india"],
    domain: "setu.co",
    category_hint: "api_infra",
    confidence: 1.0,
  },
  "finicity": {
    canonicalName: "Finicity",
    aliases: ["finicity"],
    domain: "finicity.com",
    category_hint: "api_infra",
    confidence: 1.0,
  },
  "blostem": {
    canonicalName: "Blostem",
    aliases: ["blostem", "blostem infra"],
    domain: "blostem.com",
    category_hint: "bfsi_infra",
    confidence: 1.0,
  },
};

// Domain authority tiers for entity verification
const ENTITY_DOMAIN_TIERS: Record<string, number> = {
  "razorpay.com": 1.0,
  "paytm.com": 1.0,
  "stripe.com": 1.0,
  "cashfree.com": 1.0,
  "setu.co": 1.0,
  "inc42.com": 0.9,
  "medianama.com": 0.9,
  "entrackr.com": 0.9,
  "bloomberg.com": 0.8,
  "moneycontrol.com": 0.8,
  "g2.com": 0.85,
  "capterra.com": 0.85,
  "trustpilot.com": 0.7,
  "reddit.com": 0.5,
};

// Normalize entity name for lookup
function normalizeEntityName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
}

// Check if a domain is a known competitor domain
function getDomainAuthority(url: string): number {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    return ENTITY_DOMAIN_TIERS[hostname] || 0.5;
  } catch {
    return 0.3;
  }
}

// Primary entity resolution function
export function resolveEntity(query: string): EntityResolutionResult {
  const normalized = normalizeEntityName(query);
  const result: EntityResolutionResult = {
    resolved: null,
    is_verified: false,
    match_sources: [],
    rejection_reasons: [],
  };

  // Step 1: Check known entities database
  for (const [key, entity] of Object.entries(KNOWN_ENTITIES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      result.resolved = entity;
      result.is_verified = true;
      result.match_sources.push(`known_entity:${key}`);
      return result;
    }

    // Check aliases
    for (const alias of entity.aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        result.resolved = entity;
        result.is_verified = true;
        result.match_sources.push(`alias:${alias}`);
        return result;
      }
    }
  }

  // Step 2: Fuzzy match on common fintech entities
  const fuzzyMatches = fuzzyMatch(normalized);
  if (fuzzyMatches.length > 0) {
    const bestMatch = fuzzyMatches[0];
    result.resolved = bestMatch.entity;
    result.is_verified = true;
    result.match_sources.push(`fuzzy:${bestMatch.score}`);
    return result;
  }

  // Step 3: Unknown entity - return minimal resolution
  result.resolved = {
    canonicalName: query.trim(),
    aliases: [normalized],
    domain: null,
    category_hint: "unknown",
    confidence: 0.3,
  };
  result.rejection_reasons.push("entity_not_in_database");

  return result;
}

// Fuzzy matching for entity names
function fuzzyMatch(query: string): Array<{ entity: ResolvedEntity; score: number }> {
  const results: Array<{ entity: ResolvedEntity; score: number }> = [];

  for (const entity of Object.values(KNOWN_ENTITIES)) {
    let score = 0;
    const queryLower = query.toLowerCase();

    // Check canonical name
    if (entity.canonicalName.toLowerCase().includes(queryLower)) {
      score = 0.8;
    }

    // Check aliases
    for (const alias of entity.aliases) {
      if (alias.includes(queryLower) || queryLower.includes(alias)) {
        score = Math.max(score, 0.7);
      }
      // Character overlap
      const overlap = characterOverlap(queryLower, alias);
      score = Math.max(score, overlap * 0.5);
    }

    if (score > 0.3) {
      results.push({ entity, score });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}

function characterOverlap(a: string, b: string): number {
  const setA = new Set(a.replace(/\s/g, ""));
  const setB = new Set(b.replace(/\s/g, ""));
  let overlap = 0;
  for (const char of setA) {
    if (setB.has(char)) overlap++;
  }
  return overlap / Math.max(setA.size, setB.size);
}

// Verify if content matches resolved entity
export function verifyEntityMatch(content: string, entity: ResolvedEntity): { matches: boolean; reason: string } {
  const contentLower = content.toLowerCase();

  // Check canonical name
  if (entity.canonicalName.toLowerCase().includes(contentLower) || contentLower.includes(entity.canonicalName.toLowerCase())) {
    return { matches: true, reason: "canonical_name_match" };
  }

  // Check aliases
  for (const alias of entity.aliases) {
    if (contentLower.includes(alias.toLowerCase())) {
      return { matches: true, reason: `alias_match:${alias}` };
    }
  }

  // Check domain if available
  if (entity.domain && contentLower.includes(entity.domain.toLowerCase())) {
    return { matches: true, reason: `domain_match:${entity.domain}` };
  }

  // Low confidence entity without verification
  if (entity.confidence < 0.5) {
    return { matches: false, reason: `unverified_entity:${entity.confidence}` };
  }

  return { matches: false, reason: "no_entity_match" };
}

// Entity-aware content filter
export function filterContentForEntity(
  content: string,
  entity: ResolvedEntity,
  sourceUrl: string
): { accepted: boolean; reason: string } {
  const domainAuthority = getDomainAuthority(sourceUrl);

  // High-authority domains get benefit of doubt
  if (domainAuthority >= 0.9) {
    return { accepted: true, reason: "high_authority_source" };
  }

  // Check entity match
  const entityMatch = verifyEntityMatch(content, entity);

  if (!entityMatch.matches) {
    return {
      accepted: false,
      reason: `entity_mismatch: content doesn't reference ${entity.canonicalName}`,
    };
  }

  // Check for name-only vs actual content match
  const nameOnlyMatch = content.toLowerCase().split(entity.canonicalName.toLowerCase()).length <= 1;

  if (nameOnlyMatch && domainAuthority < 0.8) {
    return {
      accepted: false,
      reason: "name_only_mention_without_substantive_content",
    };
  }

  return { accepted: true, reason: entityMatch.reason };
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