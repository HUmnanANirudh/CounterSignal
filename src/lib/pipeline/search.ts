import { tavily } from "@tavily/core";
import type { Citation } from "@/types/battlecard";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const DOMAIN_WEIGHTS: Record<string, number> = {
  "g2.com": 8,
  "capterra.com": 7,
  "moneycontrol.com": 10,
  "comparake.in": 9,
  "inc42.com": 9,
  "businessworld.in": 8,
  "economictimes.indiatimes.com": 8,
  "business-standard.com": 7,
  "fintechnews.in": 9,
  "medianama.com": 9,
  "crunchbase.com": 7,
  "linkedin.com": 6,
  "medium.com": 5,
};

function getDomainWeight(url: string): number {
  for (const [domain, weight] of Object.entries(DOMAIN_WEIGHTS)) {
    if (url.includes(domain)) return weight;
  }
  if (url.includes("official") || url.includes(".io") || url.includes(".co")) return 7;
  if (url.includes("news") || url.includes("blog")) return 5;
  return 3;
}

function keywordBonus(url: string, title: string, content: string): number {
  const text = `${url} ${title} ${content}`.toLowerCase();
  let bonus = 0;
  if (text.includes("pricing") || text.includes("price") || text.includes("charge") || text.includes("fee")) bonus += 3;
  if (text.includes("review") || text.includes("compare") || text.includes("comparison")) bonus += 2;
  if (text.includes("complaint") || text.includes("issue") || text.includes("problem")) bonus += 2;
  if (text.includes("launch") || text.includes("release") || text.includes("announce")) bonus += 2;
  // India-specific keyword bonuses
  if (text.includes("india") || text.includes("indian")) bonus += 4;
  if (text.includes("upi") || text.includes("npi") || text.includes("npci")) bonus += 3;
  if (text.includes("rbi") || text.includes("compliance")) bonus += 2;
  if (text.includes("razorpay") || text.includes("phonepe") || text.includes("paytm")) bonus += 1;
  return bonus;
}

function scoreResult(result: { url: string; title: string; content: string; score: number }): number {
  return getDomainWeight(result.url) + keywordBonus(result.url, result.title, result.content) + result.score;
}

export function buildSearchQueries(competitor: string): string[] {
  return [
    `${competitor} pricing India fintech`,
    `${competitor} fees charges India`,
    `${competitor} review India`,
    `${competitor} complaints India`,
    `${competitor} latest news India 2024 2025`,
    `${competitor} India fintech startup`,
    `${competitor} case study India`,
    `${competitor} vs Razorpay vs Stripe India`,
  ];
}

export async function search(competitor: string): Promise<{
  citations: Citation[];
  rawContent: string;
}> {
  if (!TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  const queries = buildSearchQueries(competitor);
  const tvly = tavily({ apiKey: TAVILY_API_KEY });

  const searchPromises = queries.map((query) =>
    tvly.search(query, {
      searchDepth: "basic",
      topic: "finance",
      maxResults: 5,
      includeAnswer: true,
      includeImages: false,
    }).catch(() => null)
  );

  const results = await Promise.all(searchPromises);
  const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null && r.results.length > 0);

  if (validResults.length === 0) {
    return { citations: [], rawContent: "" };
  }

  const allResults: Array<{ url: string; title: string; content: string; score: number }> = [];
  const seenUrls = new Set<string>();

  for (const result of validResults) {
    for (const item of result.results) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        allResults.push({
          url: item.url,
          title: item.title,
          content: item.content ?? "",
          score: item.score,
        });
      }
    }
  }

  const scored = allResults.map((r) => ({ ...r, compositeScore: scoreResult(r) }));
  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const top6 = scored.slice(0, 6);

  const citations: Citation[] = top6.map((item, index) => ({
    id: `citation-${index + 1}`,
    title: item.title,
    url: item.url,
    source: new URL(item.url).hostname.replace("www.", ""),
    score: item.score,
  }));

  const rawContent = [
    validResults[0]?.answer ?? "",
    ...top6.map((r) => `## ${r.title}\n${r.content}`).join("\n\n"),
  ].join("\n\n");

  return { citations, rawContent };
}