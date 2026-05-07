import type { BFSICategory } from "@/types/entity";


export const DOMAIN_TIERS: Record<string, number> = {
  "inc42.com": 10,
  "medianama.com": 10,
  "entrackr.com": 10,
  "the-ken.com": 10,
  "dealstreet.in": 9,
  "vccircle.com": 9,
  "yourstory.com": 9,
  "g2.com": 9,
  "capterra.com": 9,
  "tracxn.com": 9,
  "crunchbase.com": 9,
  "moneycontrol.com": 8,
  "livemint.com": 8,
  "economictimes.indiatimes.com": 8,
  "businessstandard.com": 8,
  "forbesindia.com": 8,
  "trustpilot.com": 8,
  "producthunt.com": 8,
  "bloomberg.com": 7,
  "forbes.com": 7,
  "ft.com": 7,
  "wsj.com": 7,
  "reddit.com": 7,
  "mouthshut.com": 7,
  "ambitionbox.com": 7,
  "glassdoor.com": 7,
  "zaubacorp.com": 6,
  "tofler.in": 6,
  "rbi.org.in": 6,
  "mca.gov.in": 6,
  "techcrunch.com": 5,
  "stackshare.io": 5,
  "slashdot.org": 5,
  "getapp.com": 5,
  "softwareadvice.com": 5,
  "linkedin.com": 5,
  "x.com": 4,
};

export const SOURCE_WEIGHTS: Record<string, number> = {
  "inc42.com": 1.0,
  "medianama.com": 1.0,
  "entrackr.com": 1.0,
  "the-ken.com": 1.0,
  "dealstreet.in": 0.95,
  "vccircle.com": 0.95,
  "yourstory.com": 0.95,
  "g2.com": 0.95,
  "capterra.com": 0.95,
  "tracxn.com": 0.95,
  "crunchbase.com": 0.90,
  "moneycontrol.com": 0.90,
  "livemint.com": 0.90,
  "economictimes.indiatimes.com": 0.90,
  "businessstandard.com": 0.90,
  "forbesindia.com": 0.90,
  "trustpilot.com": 0.85,
  "producthunt.com": 0.80,
  "bloomberg.com": 0.75,
  "forbes.com": 0.75,
  "ft.com": 0.75,
  "wsj.com": 0.75,
  "reddit.com": 0.75,
  "mouthshut.com": 0.70,
  "ambitionbox.com": 0.70,
  "glassdoor.com": 0.70,
  "zaubacorp.com": 0.85,
  "tofler.in": 0.85,
  "rbi.org.in": 0.90,
  "mca.gov.in": 0.90,
  "techcrunch.com": 0.55,
  "stackshare.io": 0.55,
  "slashdot.org": 0.50,
  "getapp.com": 0.60,
  "softwareadvice.com": 0.60,
  "linkedin.com": 0.50,
  "x.com": 0.35,
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
