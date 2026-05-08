import { tavily } from "@tavily/core";
import type { Citation } from "@/types/battlecard";
import type { SearchResult } from "@/types/pipeline";
import {
  resolveEntity,
  scoreContentMatch,
  overlapsWithBlostem,
  extractProblemStatement,
} from "./entity-resolution";
import { classifyCompetitor } from "./classify";
import {
  normalizeDomain,
  getDomainType,
  getDomainAuthority,
  getSourceWeight,
} from "./utils/domain";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const MAX_PER_DOMAIN = 4;
const MAX_TOTAL = 20;
const MIN_AUTHORITY_THRESHOLD = 0.4;

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

const HIGH_QUALITY_SIGNALS = [
  /by\s+\w+\s+\w+/i,
  /\d{4}[-\/]\d{2}[-\/]\d{2}/,
  /updated?\s+\d+/i,
  /\[\d+\]\s*sources?:/i,
];

function assessContentQuality(url: string, title: string, content: string): number {
  let qualityScore = 0;
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  for (const pattern of LOW_QUALITY_PATTERNS) {
    if (pattern.test(lowerUrl) || pattern.test(lowerTitle)) {
      qualityScore -= 3;
    }
  }

  if (/gov\.\w+|\.gov\.\w+|ftp\.|ftps:|bills\.com\.au|buildmvpfast|sourcefees|kanoon360|scribd/.test(lowerUrl)) {
    qualityScore -= 4;
  }

  if (content.length < 200) qualityScore -= 2;

  for (const signal of HIGH_QUALITY_SIGNALS) {
    if (signal.test(content) || signal.test(title)) qualityScore += 1;
  }

  if (content.length > 1000) qualityScore += 1;
  if (/india|indian|upi|rupee|₹|fd|fixed deposit/i.test(lowerContent)) qualityScore += 1;

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

  for (const kw of pricingKeywords) { if (lower.includes(kw) || titleLower.includes(kw)) signalBonus += 3; }
  for (const kw of complaintKeywords) { if (lower.includes(kw)) signalBonus += 2; }
  for (const kw of reviewKeywords) { if (lower.includes(kw) || titleLower.includes(kw)) signalBonus += 1; }
  for (const kw of indiaKeywords) { if (lower.includes(kw) || titleLower.includes(kw)) signalBonus += 2; }

  const authorityBonus = authority * 2;
  return (sourceWeight * 10) + signalBonus + (result.score * 2) + authorityBonus + contentQuality;
}

type SourceType = "independent" | "review" | "news" | "forum";

function getSourceType(url: string): SourceType {
  const type = getDomainType(url);
  if (type === "official") return "news";
  return type;
}

function selectDiversifiedResults(
  scored: Array<{ url: string; title: string; content: string; score: number; sourceWeight: number; compositeScore: number }>,
): Array<{ url: string; title: string; content: string; score: number; sourceWeight: number }> {
  const selected: Array<{ url: string; title: string; content: string; score: number; sourceWeight: number }> = [];
  const domainUsage: Record<string, number> = {};
  const typeCount: Record<SourceType, number> = { independent: 0, review: 0, news: 0, forum: 0 };

  // First pass: ensure we get at least 2 from each critical type
  const typeTargets = { independent: 3, review: 2, news: 3, forum: 2 };

  for (const result of scored) {
    if (result.sourceWeight < MIN_AUTHORITY_THRESHOLD) {
      continue;
    }

    const domain = normalizeDomain(result.url);
    const sourceType = getSourceType(result.url);
    const typeDeficit = (typeTargets[sourceType] || 0) - (typeCount[sourceType] || 0);

    if (typeDeficit > 0 && (domainUsage[domain] || 0) <= MAX_PER_DOMAIN) {
      selected.push({
        url: result.url,
        title: result.title,
        content: result.content,
        score: result.score,
        sourceWeight: result.sourceWeight,
      });
      domainUsage[domain] = (domainUsage[domain] || 0) + 1;
      typeCount[sourceType] = (typeCount[sourceType] || 0) + 1;
    }

    if (selected.length >= MAX_TOTAL) break;
  }

  // Second pass: fill remaining slots with highest scoring results
  if (selected.length < MAX_TOTAL) {
    for (const result of scored) {
      if (selected.some(s => s.url === result.url)) continue;
      if (result.sourceWeight < MIN_AUTHORITY_THRESHOLD) continue;

      const domain = normalizeDomain(result.url);
      if (domainUsage[domain] >= MAX_PER_DOMAIN) continue;

      selected.push({
        url: result.url,
        title: result.title,
        content: result.content,
        score: result.score,
        sourceWeight: result.sourceWeight,
      });
      domainUsage[domain] = (domainUsage[domain] || 0) + 1;

      if (selected.length >= MAX_TOTAL) break;
    }
  }

  const topDomains = Object.entries(domainUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`[Search] Selected ${selected.length} results. Types: independent=${typeCount.independent}, review=${typeCount.review}, news=${typeCount.news}, forum=${typeCount.forum}`);
  console.log(`[Search] Top domains: ${topDomains.map(([d, c]) => `${d}=${c}`).join(", ")}`);
  return selected;
}

export function buildSearchQueries(competitor: string): string[] {
  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;
  return [
  // 0. COMPANY DESCRIPTION FIRST — Who is this entity? (No BFSI keywords needed)
  `"${competitor}" "about" OR "what we do" OR "company profile" OR "founded in" OR "headquartered" OR "our story" site:wikipedia.org OR site:crunchbase.com OR site:tracxn.com OR site:linkedin.com/company`,

// 1. ENTITY ANCHOR — Company databases (global, not India-specific)
`"${competitor}" (fintech OR payments OR banking OR "merchant" OR "enterprise") (founded OR "series" OR "raised" OR "funding" OR "HQ" OR "website") site:crunchbase.com OR site:tracxn.com OR site:linkedin.com OR site:angellist.com OR site:pitchbook.com`,

// 2. ENTITY ANCHOR — India-specific databases
`"${competitor}" (fintech OR payments OR banking) india (founded OR "how it works" OR "what we do" OR "series" OR "raised") site:crunchbase.com OR site:tracxn.com OR site:linkedin.com OR site:zaubacorp.com OR site:tofler.in`,

// 3. DEEP EDITORIAL — Best single source for BFSI context, strategy, and business model
`site:medianama.com OR site:the-ken.com OR site:inc42.com OR site:entrackr.com OR site:yourstory.com OR site:moneycontrol.com OR site:livemint.com OR site:economictimes.indiatimes.com OR site:businessstandard.com "${competitor}"`,

// 4. REGULATORY & LAUNCH SIGNALS — What they've built or been approved for recently
`"${competitor}" ("RBI" OR "NPCI" OR "SEBI" OR "IRDAI" OR "licence" OR "approval" OR "launches" OR "partnership" OR "MoU") after:${lastYear}-01-01 site:rbi.org.in OR site:medianama.com OR site:entrackr.com OR site:inc42.com`,

// 5. REAL CUSTOMER SENTIMENT — Actual friction, not templated noise
`"${competitor}" (review OR complaint OR feedback OR experience) (onboarding OR support OR compliance OR "not working" OR "issue" OR "delay" OR "fraud") site:reddit.com OR site:g2.com OR site:trustpilot.com OR site:mouthshut.com OR site:ambitionbox.com OR site:glassdoor.com OR site:producthunt.com`,

// 6. PRICING & COMMERCIAL MODEL — MDR, fees, bundling signals
`"${competitor}" (pricing OR "MDR" OR fees OR "commission" OR "subscription" OR "rate card" OR "per transaction" OR "revenue model") site:inc42.com OR site:entrackr.com OR site:medianama.com OR site:tracxn.com OR site:yourstory.com`,

// 7. COMPETITIVE POSITIONING — How the market sees them vs others
`"${competitor}" (vs OR alternative OR competitor OR "compared to" OR "instead of") india fintech (2025 OR 2026) site:reddit.com OR site:g2.com OR site:stackshare.io OR site:slashdot.org OR site:getapp.com OR site:softwareadvice.com`,
  ];
}

// Extended queries for non-competitor categories (aggregator, issuer)
export function buildExtendedQueries(competitor: string): string[] {
  return [
    // For AGGREGATOR: marketplace/comparison queries
    `${competitor} loan marketplace india`,
    `${competitor} credit score service india`,
    `${competitor} how it works loans`,
    // For ISSUER: FD/NBFC queries
    `${competitor} FD interest rates India`,
    `${competitor} CRISIL rating NBFC`,
    `${competitor} RD FD offerings`,
  ];
}




// Secondary search for early-stage/low-content entities
async function secondarySearch(competitor: string): Promise<{ answers: string[]; results: Array<{ url: string; title: string; content: string; score: number }> }> {
  console.log(`[Search] Running secondary search for ${competitor}`);

  const tvly = tavily({ apiKey: TAVILY_API_KEY! });

  // Broader queries to catch context + company database coverage
  const secondaryQueries = [
    `${competitor} company profile what do they do`,
    `${competitor} merchant of record OR payment infrastructure OR API`,
    `${competitor} OR "${competitor}" fintech payments`,
    `${competitor} site:tracxn.com OR site:crunchbase.com OR site:linkedin.com`,
  ];

  const allResults: Array<{ url: string; title: string; content: string; score: number }> = [];
  let answer: string | undefined;

  for (const query of secondaryQueries) {
    try {
      const result = await tvly.search(query, {
        searchDepth: "basic",
        topic: "finance",
        maxResults: 3,
        includeAnswer: "basic",
        includeImages: false,
      });
      if (result.answer) {
        answer = result.answer;
      }
      allResults.push(...result.results.map(r => ({
        url: r.url,
        title: r.title,
        content: r.content || "",
        score: r.score,
      })));
    } catch {
      console.warn(`[Search] Secondary query failed: ${query}`);
    }
  }

  return {
    answers: answer ? [answer] : [],
    results: allResults,
  };
}

export async function search(competitor: string): Promise<SearchResult> {
  if (!TAVILY_API_KEY) {
    throw new Error("TAVILY_API_KEY not configured");
  }

  const queries = buildSearchQueries(competitor);
  const tvly = tavily({ apiKey: TAVILY_API_KEY });

  console.log(`[Search] Querying Tavily for: ${competitor}`);

  const searchPromises = queries.slice(0, 6).map((query) =>
    tvly.search(query, {
      searchDepth: "basic", // Use basic for faster results
      topic: "finance",
      maxResults: 10, // Increased to capture more signals
      includeAnswer: "basic", // Reduced for latency
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
    return { citations: [], rawContent: "", entityCategoryHint: "", debugInfo: { domainCount: 0, totalResults: 0, sourcesByDomain: {}, relevantResults: 0, entityConfidence: 0 } };
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

  // ENTITY RESOLUTION: Use resolved entity for accurate filtering
  const entityResolution = resolveEntity(competitor);
  const entity = entityResolution.resolved!;
  console.log(`[Search] Entity resolved: ${entity.canonicalName} (confidence: ${entity.confidence})`);
  console.log(`[Search] Entity categoryHint: ${entity.categoryHint}`);

  // ENTITY RELEVANCE FILTER: Keep docs that mention the target entity with substance
  const competitorLower = competitor.toLowerCase();
  const competitorNormalized = competitorLower.replace(/[^a-z0-9]/g, "");

  const relevantResults: typeof allResults = [];
  const rejectedResults: { url: string; title: string; reason: string }[] = [];

  for (const r of allResults) {
    const titleLower = r.title.toLowerCase();
    const contentLower = r.content.toLowerCase();
    // Check if entity appears in title or content using aliases and canonical name
    const inTitle = 
      titleLower.includes(competitorLower) || 
      titleLower.includes(entity.canonicalName.toLowerCase()) ||
      entity.aliases.some(alias => titleLower.includes(alias.toLowerCase()));

    const inContent = 
      contentLower.includes(competitorLower) ||
      contentLower.includes(entity.canonicalName.toLowerCase()) ||
      entity.aliases.some(alias => contentLower.includes(alias.toLowerCase()));

    if (!inTitle && !inContent) {
      rejectedResults.push({ url: r.url, title: r.title, reason: "no_entity_match" });
      continue;
    }

    // Use scoring-based soft filter instead of hard rejection
    const scoreResult = scoreContentMatch(r.content, entity, competitor);

    if (!scoreResult.accepted) {
      rejectedResults.push({ url: r.url, title: r.title, reason: scoreResult.reason });
      continue;
    }

    // Check if content has substantive information (not just name drop)
    // Accept if: in title OR has substantive mentions in content
    const entityCharCount = (r.content.match(new RegExp(competitorLower, "gi")) || []).length;
    const canonicalCharCount = (r.content.match(new RegExp(entity.canonicalName, "gi")) || []).length;
    
    if (!inTitle && (entityCharCount + canonicalCharCount) < 2) {
      rejectedResults.push({ url: r.url, title: r.title, reason: "name_only_mention" });
      continue;
    }

    relevantResults.push(r);
  }

  // Log rejections for debugging
  if (rejectedResults.length > 0) {
    console.log(`[Search] Rejected ${rejectedResults.length} results:`);
    for (const rej of rejectedResults.slice(0, 5)) {
      console.log(`  - ${rej.title.slice(0, 50)}... (${rej.reason})`);
    }
  }

  // PROBLEM STATEMENT CHECK: Early detection of non-competitors
  if (relevantResults.length > 0) {
    const sampleContent = relevantResults[0].content;
    const problemStatement = extractProblemStatement(sampleContent);
    if (problemStatement && !overlapsWithBlostem(problemStatement)) {
      console.log(`[Search] Problem statement doesn't overlap with Blostem: "${problemStatement.slice(0, 60)}..."`);
      // Don't reject outright - let classification handle it
    }
  }

  console.log(`[Search] Entity-filtered results: ${relevantResults.length}/${allResults.length} relevant`);

  // MINIMAL INTELLIGENCE MODE: If < 3 relevant docs after strict filtering, try secondary search
  type MinimalIntelligence = NonNullable<SearchResult["debugInfo"]>["minimalIntelligence"];
  type InferredCategory = NonNullable<SearchResult["debugInfo"]>["inferredCategory"];

  const minimalIntelligence: MinimalIntelligence = undefined;
  let inferredCategory: InferredCategory = undefined;

  if (relevantResults.length < 3 && relevantResults.length > 0) {
    console.log(`[Search] Low relevant results — attempting minimal intelligence extraction`);

    // Extract business model hints from available content
    const sampleContent = relevantResults.map(r => r.content).join("\n");
    const categoryResult = classifyCompetitor(competitor, sampleContent);

    if (categoryResult.confidence > 0.5) {
      inferredCategory = {
        category: categoryResult.category,
        confidence: categoryResult.confidence,
        reasoning: categoryResult.reasoning
      };
      console.log(`[Search] Inferred category: ${categoryResult.category} (${categoryResult.confidence})`);
    }
  }

  // Run secondary search if we have almost no results
  if (relevantResults.length < 2) {
    console.log(`[Search] Critical low results — attempting secondary search`);
    try {
      const secondary = await secondarySearch(competitor);

      // Add secondary results if they mention the entity
      for (const r of secondary.results) {
        const contentLower = r.content.toLowerCase();
        const queryLower = competitor.toLowerCase();

        if (contentLower.includes(queryLower)) {
          const weight = getSourceWeight(r.url);
          relevantResults.push({
            url: r.url,
            title: r.title,
            content: r.content,
            score: r.score,
            sourceWeight: weight,
          });
          console.log(`[Search] Added from secondary: ${r.title.slice(0, 50)}...`);
        }
      }

      // If secondary search gave us new content, try category inference again
      if (secondary.results.length > 0 && !inferredCategory) {
        const allContent = [...relevantResults, ...secondary.results].map(r => r.content).join("\n");
        const categoryResult = classifyCompetitor(competitor, allContent);

        if (categoryResult.confidence > 0.4) {
          inferredCategory = {
            category: categoryResult.category,
            confidence: categoryResult.confidence,
            reasoning: categoryResult.reasoning
          };
        }
      }
    } catch (e) {
      console.warn(`[Search] Secondary search failed: ${e}`);
    }
  }

  // If < 3 relevant docs, flag low confidence early
  const entityConfidence = relevantResults.length >= 3 ? 0.7 : relevantResults.length >= 1 ? 0.4 : 0.1;
  if (relevantResults.length < 3) {
    console.warn(`[Search] LOW ENTITY CONFIDENCE: only ${relevantResults.length} relevant docs`);
  }

  const scored = relevantResults.map((r) => ({ ...r, compositeScore: scoreResult(r) }));
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
    entityCategoryHint: entity.categoryHint || "",
    debugInfo: {
      domainCount: Object.keys(normalizedDomainCount).length,
      totalResults: allResults.length,
      sourcesByDomain: normalizedDomainCount,
      relevantResults: relevantResults.length,
      entityConfidence,
      inferredCategory,
      minimalIntelligence,
    },
  };
}
