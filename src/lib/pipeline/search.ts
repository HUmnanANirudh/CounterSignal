import { tavily } from "@tavily/core";
import type { Citation } from "@/types/battlecard";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

// Domain authority tiers (higher = more trusted)
const DOMAIN_TIERS: Record<string, number> = {
  "razorpay.com": 10,
  "cashfree.com": 10,
  "paytm.com": 10,
  "stripe.com": 10,
  "plaid.com": 10,
  "adyen.com": 10,
  "bloomberg.com": 9,
  "livemint.com": 9,
  "moneycontrol.com": 9,
  "forbes.com": 9,
  "forbesindia.in": 9,
  "inc42.com": 8,
  "entrackr.com": 8,
  "medianama.com": 8,
  "vccircle.com": 8,
  "dealstreet.in": 8,
  "g2.com": 7,
  "capterra.com": 7,
  "trustpilot.com": 7,
  "reddit.com": 6,
  "twitter.com": 5,
  "x.com": 5,
  "techcrunch.com": 5,
  "economictimes.indiatimes.com": 5,
};

const SOURCE_WEIGHTS: Record<string, number> = {
  "razorpay.com": 1.0,
  "cashfree.com": 1.0,
  "paytm.com": 1.0,
  "stripe.com": 1.0,
  "plaid.com": 1.0,
  "adyen.com": 1.0,
  "inc42.com": 0.95,
  "medianama.com": 0.95,
  "entrackr.com": 0.9,
  "livemint.com": 0.9,
  "moneycontrol.com": 0.9,
  "forbesindia.in": 0.9,
  "dealstreet.in": 0.9,
  "forbes.com": 0.6,
  "bloomberg.com": 0.6,
  "techcrunch.com": 0.6,
  "economictimes.indiatimes.com": 0.6,
  "g2.com": 0.85,
  "capterra.com": 0.85,
  "trustpilot.com": 0.85,
  "reddit.com": 0.7,
  "twitter.com": 0.5,
  "x.com": 0.5,
  "wsj.com": 0.3,
};

const MAX_PER_DOMAIN = 3;
const MAX_TOTAL = 10;
const MIN_AUTHORITY_THRESHOLD = 0.4;

// Patterns that indicate low-quality scraped/SEO content
const LOW_QUALITY_PATTERNS = [
  /comprehensive.*guide/i,
  /complete.*guide/i,
  /ultimate.*guide/i,
  /.*alternatives?$/i,
  /.*pricing.*calculator/i,
  /vs\s+\w+\s+vs\s+\w+/i,
  /compare[\w\-]+\.com/i,
  /mirror|archive|cache/i,
  /gov\.\w+|gov\.\w+\.\w+/i,
  /ftp\.|ftps\./i,
  /scribd/i,
  /bills\.com\.au/i,
  /.*mvpfast.*/i,
  /sourcefees/i,
  /kanoon360/i,
];

// Signals indicating original authoritative content
const HIGH_QUALITY_SIGNALS = [
  /by\s+\w+\s+\w+/i,
  /\d{4}[-\/]\d{2}[-\/]\d{2}/,
  /updated?\s+\d+/i,
  /\[\d+\]\s*sources?:/i,
];

function normalizeDomain(url: string): string {
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

function getDomainAuthority(url: string): number {
  const normalized = normalizeDomain(url);
  const lower = normalized.toLowerCase();
  if (DOMAIN_TIERS[lower]) return DOMAIN_TIERS[lower];
  for (const [domain, authority] of Object.entries(DOMAIN_TIERS)) {
    if (lower.includes(domain)) return authority;
  }
  return 4;
}

function getSourceWeight(url: string): number {
  const normalized = normalizeDomain(url);
  const lower = normalized.toLowerCase();
  if (SOURCE_WEIGHTS[lower]) return SOURCE_WEIGHTS[lower];
  for (const [domain, weight] of Object.entries(SOURCE_WEIGHTS)) {
    if (lower.includes(domain)) return weight;
  }
  return 0.4;
}

function assessContentQuality(url: string, title: string, content: string): number {
  let qualityScore = 0;
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Penalize patterns indicating low quality
  for (const pattern of LOW_QUALITY_PATTERNS) {
    if (pattern.test(lowerUrl) || pattern.test(lowerTitle)) {
      qualityScore -= 3;
    }
  }

  // Penalize government/FTP mirrors, scraped aggregators
  if (/gov\.\w+|\.gov\.\w+|ftp\.|ftps:|bills\.com\.au|buildmvpfast|sourcefees|kanoon360|scribd/.test(lowerUrl)) {
    qualityScore -= 4;
  }

  // Penalize short content
  if (content.length < 200) {
    qualityScore -= 2;
  }

  // Bonus for high-quality content signals
  for (const signal of HIGH_QUALITY_SIGNALS) {
    if (signal.test(content) || signal.test(title)) {
      qualityScore += 1;
    }
  }

  // Bonus for longer, detailed content
  if (content.length > 1000) {
    qualityScore += 1;
  }

  // Bonus for Indian context
  if (/india|indian|upi|rupee|₹|fd|fixed deposit/i.test(lowerContent)) {
    qualityScore += 1;
  }

  return qualityScore;
}

function scoreResult(result: { url: string; title: string; content: string; score: number }): number {
  const sourceWeight = getSourceWeight(result.url);
  const authority = getDomainAuthority(result.url);
  const contentQuality = assessContentQuality(result.url, result.title, result.content);
  const content = result.content || "";
  const title = result.title || "";

  let signalBonus = 0;
  const lower = content.toLowerCase();
  const titleLower = title.toLowerCase();

  const pricingKeywords = ["pricing", "price", "fee", "cost", "charge", "transaction", "percent", "%", "plans"];
  const complaintKeywords = ["problem", "issue", "delay", "failed", "refund", "complaint", "bad", "expensive"];
  const reviewKeywords = ["review", "rating", "customer", "experience"];
  const indiaKeywords = ["india", "indian", "upi", "rupee", "₹"];

  for (const kw of pricingKeywords) {
    if (lower.includes(kw) || titleLower.includes(kw)) signalBonus += 3;
  }
  for (const kw of complaintKeywords) {
    if (lower.includes(kw)) signalBonus += 2;
  }
  for (const kw of reviewKeywords) {
    if (lower.includes(kw) || titleLower.includes(kw)) signalBonus += 1;
  }
  for (const kw of indiaKeywords) {
    if (lower.includes(kw) || titleLower.includes(kw)) signalBonus += 2;
  }

  const authorityBonus = authority * 2;

  return (sourceWeight * 10) + signalBonus + (result.score * 2) + authorityBonus + contentQuality;
}

type SourceType = "official" | "review" | "news" | "forum";

function getSourceType(url: string): SourceType {
  const normalized = normalizeDomain(url);
  const lower = normalized.toLowerCase();

  if (["razorpay.com", "cashfree.com", "paytm.com", "stripe.com", "plaid.com", "adyen.com"].some(d => lower.includes(d))) {
    return "official";
  }
  if (["g2.com", "capterra.com", "trustpilot.com"].some(d => lower.includes(d))) {
    return "review";
  }
  if (["inc42.com", "medianama.com", "entrackr.com", "moneycontrol.com", "bloomberg.com", "forbes.com", "techcrunch.com", "livemint.com", "dealstreet.in"].some(d => lower.includes(d))) {
    return "news";
  }
  if (["reddit.com", "twitter.com", "x.com"].some(d => lower.includes(d))) {
    return "forum";
  }

  return "news";
}

function selectDiversifiedResults(
  scored: Array<{ url: string; title: string; content: string; score: number; sourceWeight: number; compositeScore: number }>
): Array<{ url: string; title: string; content: string; score: number; sourceWeight: number }> {
  const selected: Array<{ url: string; title: string; content: string; score: number; sourceWeight: number }> = [];
  const domainUsage: Record<string, number> = {};
  const typeCount: Record<SourceType, number> = { official: 0, review: 0, news: 0, forum: 0 };

  for (const result of scored) {
    if (result.sourceWeight < MIN_AUTHORITY_THRESHOLD) {
      continue;
    }

    const domain = normalizeDomain(result.url);
    const sourceType = getSourceType(result.url);

    typeCount[sourceType] = (typeCount[sourceType] || 0) + 1;
    domainUsage[domain] = (domainUsage[domain] || 0) + 1;

    if (domainUsage[domain] <= MAX_PER_DOMAIN) {
      selected.push({
        url: result.url,
        title: result.title,
        content: result.content,
        score: result.score,
        sourceWeight: result.sourceWeight,
      });
    }

    if (selected.length >= MAX_TOTAL) break;
  }

  const topDomains = Object.entries(domainUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`[Search] Selected ${selected.length} results. Types: official=${typeCount.official}, review=${typeCount.review}, news=${typeCount.news}, forum=${typeCount.forum}`);
  console.log(`[Search] Top domains: ${topDomains.map(([d, c]) => `${d}=${c}`).join(", ")}`);
  return selected;
}

export function buildSearchQueries(competitor: string): string[] {
  return [
    // Pricing from official and review sites
    `site:razorpay.com OR site:cashfree.com OR site:paytm.com ${competitor} pricing fees`,
    `site:g2.com OR site:capterra.com OR site:trustpilot.com ${competitor} pricing`,
    `site:inc42.com OR site:medianama.com OR site:entrackr.com ${competitor} pricing`,

    // Reviews
    `site:reddit.com/r/India OR site:twitter.com ${competitor} review complaint`,
    `${competitor} customer review site:trustpilot.com`,

    // News and analysis
    `${competitor} india fintech news funding`,
    `site:inc42.com OR site:medianama.com OR site:moneycontrol.com ${competitor} news`,

    // Documents
    `(${competitor} OR ${competitor} india) filetype:pdf documentation`,
  ];
}

export interface SearchResult {
  citations: Citation[];
  rawContent: string;
  debugInfo?: {
    domainCount: number;
    totalResults: number;
    sourcesByDomain: Record<string, number>;
  };
}

export async function search(competitor: string): Promise<SearchResult> {
  if (!TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  const queries = buildSearchQueries(competitor);
  const tvly = tavily({ apiKey: TAVILY_API_KEY });

  console.log(`[Search] Querying Tavily for: ${competitor}`);

  const searchPromises = queries.map((query) =>
    tvly.search(query, {
      searchDepth: "advanced",
      topic: "finance",
      maxResults: 8,
      includeAnswer: "advanced",
      includeImages: false,
    }).then((result) => {
      console.log(`[Search] "${query.slice(0, 40)}..." → ${result.results.length} results`);
      return result;
    }).catch((err) => {
      console.error(`[Search] Query failed: ${err.message}`);
      return null;
    })
  );

  const results = await Promise.all(searchPromises);
  const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null && r.results.length > 0);

  console.log(`[Search] Valid results: ${validResults.length}/${queries.length} queries`);

  if (validResults.length === 0) {
    return { citations: [], rawContent: "", debugInfo: { domainCount: 0, totalResults: 0, sourcesByDomain: {} } };
  }

  const allResults: Array<{ url: string; title: string; content: string; score: number; sourceWeight: number }> = [];
  const seenUrls = new Set<string>();
  const domainCount: Record<string, number> = {};

  for (const result of validResults) {
    for (const item of result.results) {
      if (!seenUrls.has(item.url) && item.content && item.content.length > 50) {
        seenUrls.add(item.url);
        const weight = getSourceWeight(item.url);
        const domain = normalizeDomain(item.url);

        if (!domainCount[domain]) domainCount[domain] = 0;
        domainCount[domain]++;

        allResults.push({
          url: item.url,
          title: item.title,
          content: item.content ?? "",
          score: item.score,
          sourceWeight: weight,
        });
      }
    }
  }

  console.log(`[Search] Total unique results: ${allResults.length}`);

  const scored = allResults.map((r) => ({ ...r, compositeScore: scoreResult(r) }));
  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const topResults = selectDiversifiedResults(scored);

  console.log(`[Search] Top 5 results:`);
  topResults.slice(0, 5).forEach((r, i) => {
    const domain = normalizeDomain(r.url);
    console.log(`  ${i + 1}.${domain} - ${r.title.slice(0, 50)}...`);
  });

  const citations: Citation[] = topResults.map((item, index) => ({
    id: `citation-${index + 1}`,
    title: item.title,
    url: item.url,
    source: normalizeDomain(item.url),
    score: item.score,
  }));

  const answers = validResults
    .map((r) => r.answer)
    .filter(Boolean)
    .slice(0, 4);

  const rawContent = [
    ...answers,
    ...topResults.map((r) => `## ${r.title}\n\n${r.content}`),
  ].join("\n\n");

  const normalizedDomainCount: Record<string, number> = {};
  for (const domain of Object.keys(domainCount)) {
    const normalized = normalizeDomain(`https://${domain}`);
    normalizedDomainCount[normalized] = (normalizedDomainCount[normalized] || 0) + domainCount[domain];
  }

  return {
    citations,
    rawContent,
    debugInfo: {
      domainCount: Object.keys(normalizedDomainCount).length,
      totalResults: allResults.length,
      sourcesByDomain: normalizedDomainCount,
    },
  };
}
