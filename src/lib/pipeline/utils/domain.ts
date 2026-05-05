import type { BFSICategory } from "@/types/entity";

// Domain authority tiers (higher = more trusted for INDEPENDENT intelligence)
export const DOMAIN_TIERS: Record<string, number> = {
  "inc42.com": 10,
  "medianama.com": 10,
  "entrackr.com": 9,
  "dealstreet.in": 9,
  "vccircle.com": 9,
  "moneycontrol.com": 8,
  "livemint.com": 8,
  "forbesindia.in": 8,
  "bloomberg.com": 7,
  "forbes.com": 7,
  "economictimes.indiatimes.com": 7,
  "g2.com": 9,
  "capterra.com": 9,
  "trustpilot.com": 8,
  "reddit.com": 7,
  "twitter.com": 4,
  "x.com": 4,
  "techcrunch.com": 5,
};

export const SOURCE_WEIGHTS: Record<string, number> = {
  "inc42.com": 1.0,
  "medianama.com": 1.0,
  "entrackr.com": 0.95,
  "dealstreet.in": 0.95,
  "vccircle.com": 0.9,
  "moneycontrol.com": 0.9,
  "livemint.com": 0.9,
  "forbesindia.in": 0.9,
  "bloomberg.com": 0.7,
  "forbes.com": 0.7,
  "economictimes.indiatimes.com": 0.7,
  "g2.com": 0.95,
  "capterra.com": 0.95,
  "trustpilot.com": 0.85,
  "reddit.com": 0.8,
  "twitter.com": 0.4,
  "x.com": 0.4,
  "techcrunch.com": 0.5,
};

export function normalizeDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("trustpilot")) return "trustpilot";
    if (hostname.includes("wsj")) return "wsj";
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return hostname;
  } catch {
    return "unknown";
  }
}

export type DomainType = "review" | "news" | "independent" | "forum" | "official";

export function getDomainType(url: string): DomainType {
  const normalized = normalizeDomain(url);
  const lower = normalized.toLowerCase();

  if (lower.includes("g2") || lower.includes("capterra") || lower.includes("trustpilot") || lower.includes("clutch") || lower.includes("goodfirms")) {
    return "review";
  }
  if (lower.includes("inc42") || lower.includes("medianama") || lower.includes("entrackr") || lower.includes("dealstreet") || lower.includes("vccircle")) {
    return "independent";
  }
  if (lower.includes("moneycontrol") || lower.includes("livemint") || lower.includes("economictimes") || lower.includes("forbes") || lower.includes("bloomberg") || lower.includes("techcrunch")) {
    return "news";
  }
  if (lower.includes("reddit") || lower.includes("quora") || lower.includes("stackoverflow") || lower.includes("twitter") || lower.includes("x.com") || lower.includes("facebook") || lower.includes("linkedin")) {
    return "forum";
  }

  return "news";
}

export function getDomainAuthority(url: string): number {
  const normalized = normalizeDomain(url);
  const lower = normalized.toLowerCase();
  if (DOMAIN_TIERS[lower]) return DOMAIN_TIERS[lower];
  for (const [domain, authority] of Object.entries(DOMAIN_TIERS)) {
    if (lower.includes(domain)) return authority;
  }
  return 4;
}

export function getSourceWeight(url: string): number {
  const normalized = normalizeDomain(url);
  const lower = normalized.toLowerCase();
  if (SOURCE_WEIGHTS[lower]) return SOURCE_WEIGHTS[lower];
  for (const [domain, weight] of Object.entries(SOURCE_WEIGHTS)) {
    if (lower.includes(domain)) return weight;
  }
  return 0.4;
}

export function getEntityCategoryHint(query: string): BFSICategory | null {
  const lower = query.toLowerCase().replace(/[^a-z0-9\s]/g, "");

  if (/\b(groww|zerodha|upstox|broker|trading|stock)\b/i.test(lower)) return "broker";
  if (/\b(shriram|bajaj|nbfc|loan|lending)\b/i.test(lower)) return "nbfc";
  if (/\b(paytm|wallet|mobikwik)\b/i.test(lower)) return "wallet";
  if (/\b(setu|decentro|yap|open\.?tech|banking.?api)\b/i.test(lower)) return "banking_api_infra";
  if (/\b(dodo|paddle|merchant.?of.?record|mor)\b/i.test(lower)) return "merchant_of_record";
  if (/\b(phonepe|google\s*pay|gpay)\b/i.test(lower)) return "upi_app";
  if (/\b(paisabazaar|bankbazaar|policybazaar|marketplace)\b/i.test(lower)) return "marketplace";

  return null;
}
