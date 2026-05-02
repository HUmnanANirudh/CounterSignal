import { tavily } from "@tavily/core";
import type { Citation } from "@/types/battlecard";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const SOURCE_WEIGHTS: Record<string, number> = {
  // Indian fintech news - high value for India context
  "inc42.com": 0.95,
  "medianama.com": 0.95,
  "entrackr.com": 0.9,
  "moneycontrol.com": 0.85,
  "economictimes.indiatimes.com": 0.8,
  "forbesindia.in": 0.85,
  // Review platforms
  "g2.com": 0.9,
  "capterra.com": 0.9,
  "trustpilot.com": 0.9,
  "reddit.com": 0.75,
  "twitter.com": 0.6,
  "x.com": 0.6,
  // Global finance - lower weight to avoid dominance
  "forbes.com": 0.6,
  "bloomberg.com": 0.6,
  "techcrunch.com": 0.65,
  "npi_bing_com": 0.4,
};

const MIN_SOURCES_PER_DOMAIN = 1;
const MIN_DOMAINS = 2;
const MAX_PER_DOMAIN = 3;
const MAX_TOTAL = 10;

function getSourceWeight(url: string): number {
  const lower = url.toLowerCase();
  for (const [domain, weight] of Object.entries(SOURCE_WEIGHTS)) {
    if (lower.includes(domain)) return weight;
  }
  return 0.5;
}

function scoreResult(result: { url: string; title: string; content: string; score: number }): number {
  const sourceWeight = getSourceWeight(result.url);
  const content = result.content || "";
  const title = result.title || "";

  let signalBonus = 0;
  const lower = content.toLowerCase();
  const titleLower = title.toLowerCase();

  const pricingKeywords = ["pricing", "price", "fee", "cost", "charge", "₹", "rupee", "transaction", "percent", "%"];
  const complaintKeywords = ["problem", "issue", "delay", "failed", "charge", "refund", "complaint", "bad", "poor", "worst", "terrible", "scam"];
  const reviewKeywords = ["review", "rating", "user", "customer", "experience", "good", "great", "excellent"];
  const indiaKeywords = ["india", "indian", "rupee", "₹", "upi", "fd", "fixed deposit"];

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

  return (sourceWeight * 10) + signalBonus + (result.score * 2);
}

function selectDiversifiedResults(
  scored: Array<{ url: string; title: string; content: string; score: number; sourceWeight: number; compositeScore: number }>
): Array<{ url: string; title: string; content: string; score: number; sourceWeight: number }> {
  const selected: Array<{ url: string; title: string; content: string; score: number; sourceWeight: number }> = [];
  const domainUsage: Record<string, number> = {};

  for (const result of scored) {
    const domain = new URL(result.url).hostname.replace("www.", "");
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

  const topDomains = Object.entries(domainUsage).sort((a, b) => b[1] - a[1]).slice(0, 3);
  console.log(`[Search] Selected ${selected.length} results. Domain distribution: ${topDomains.map(([d, c]) => `${d}=${c}`).join(", ")}`);
  return selected;
}

export function buildSearchQueries(competitor: string): string[] {
  return [
    // Pricing & fees - use dorking to target specific domains and documents
    `site:g2.com OR site:capterra.com OR site:trustpilot.com ${competitor} pricing fees`,
    `site:inc42.com OR site:medianama.com OR site:entrackr.com ${competitor} pricing fees india`,
    `filetype:pdf ${competitor} pricing fees structure`,
    `${competitor} (pricing OR fees OR cost) filetype:pdf`,

    // Reviews & complaints - target review platforms
    `site:reddit.com/r/India OR site:twitter.com ${competitor} review complaint`,
    `site:g2.com OR site:capterra.com ${competitor} review rating`,
    `${competitor} customer review site:trustpilot.com`,

    // Competitor comparisons & positioning
    `${competitor} vs Razorpay comparison india fintech`,
    `${competitor} (features OR pricing OR integration) india payment gateway`,
    `intitle:${competitor} (pricing OR review OR comparison)`,

    // News & updates - target Indian fintech news
    `site:inc42.com OR site:medianama.com OR site:moneycontrol.com ${competitor} news funding`,

    // PDFs & documents for detailed info
    `(${competitor} OR ${competitor} india) filetype:pdf documentation pricing`,
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
        const domain = new URL(item.url).hostname.replace("www.", "");

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

  console.log(`[Search] Unique domains: ${Object.keys(domainCount).join(", ")}`);
  console.log(`[Search] Total unique results: ${allResults.length}`);

  const scored = allResults.map((r) => ({ ...r, compositeScore: scoreResult(r) }));
  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const topResults = selectDiversifiedResults(scored);

  console.log(`[Search] Top 5 results:`);
  topResults.slice(0, 5).forEach((r, i) => {
    const domain = new URL(r.url).hostname.replace("www.", "");
    console.log(`  ${i + 1}.${domain} - ${r.title.slice(0, 50)}...`);
  });

  const citations: Citation[] = topResults.map((item, index) => ({
    id: `citation-${index + 1}`,
    title: item.title,
    url: item.url,
    source: new URL(item.url).hostname.replace("www.", ""),
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

  const uniqueDomains = Object.keys(domainCount).length;

  return {
    citations,
    rawContent,
    debugInfo: {
      domainCount: uniqueDomains,
      totalResults: allResults.length,
      sourcesByDomain: domainCount,
    },
  };
}