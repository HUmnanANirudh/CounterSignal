import type {
  SentimentSignal,
  SentimentCluster,
  SentimentAnalysis,
  SentimentTopic,
  SentimentPolarity,
  PricingEvidence,
  FinancialEvent,
  EventCluster,
} from "@/types/sentiment";
import { isCustomerSentimentSource, getSentimentSourceConfig } from "./utils/sentiment-sources";
import type { Citation } from "@/types/battlecard";
import { inferTopicFromText } from "./utils/taxonomy";
import { detectPolarity } from "./utils/polarity";
import { cleanPipelineText } from "./utils/text-cleaner";

function calculateSignalConfidence(
  text: string,
  sourceConfig: ReturnType<typeof getSentimentSourceConfig>,
  sourceUrl?: string
): number {
  // 1. Determine if this is a verified or high-quality source
  const isVerifiedSource = sourceConfig != null;
  const isHQNews = sourceUrl && /\b(the-ken|entrakr|inc42|livemint|economictimes|business-standard|medianama|yourstory|vccircle|moneycontrol)\b/i.test(sourceUrl);

  // 2. Base confidence
  let confidence = isVerifiedSource ? 0.5 : isHQNews ? 0.45 : 0.25;

  // Source type weights
  const typeWeights: Record<string, number> = {
    review: 0.8,
    app_review: 0.7,
    forum: 0.6,
    employment: 0.5,
    news: 0.4,
  };
  
  if (sourceConfig) {
    confidence = typeWeights[sourceConfig.type] ?? 0.5;
  } else if (isHQNews) {
    confidence = 0.55; // Boost HQ news base
  }

  // 3. Content Detail Bonus
  if (text.length > 150) confidence += 0.1;
  if (text.length > 300) confidence += 0.1;

  // Exact quote or numeric specificity
  if (/["'“”‘’]/.test(text)) confidence += 0.15;
  if (/\d+/.test(text) || /\b(percent|MDR|fee|charges|MDR|settlement)\b/i.test(text)) {
    confidence += 0.1;
  }

  return Math.min(confidence, 0.95);
}

export async function extractSentimentSignals(
  content: string,
  citations: Citation[],
  competitor: string
): Promise<SentimentSignal[]> {
  const signals: SentimentSignal[] = [];
  const competitorLower = competitor.toLowerCase();

  // Split content by headers: "## Title"
  const rawSections = content.split(/\n## /);
  const answersSection = rawSections[0];
  const dataSections = rawSections.slice(1);

  let signalIndex = 0;

  // 1. Process search result sections (verified attribution)
  for (const section of dataSections) {
    const lines = section.split("\n");
    const title = lines[0].trim();
    const body = lines.slice(1).join("\n");

    // Find the citation that matches this title
    const matchingCitation = citations.find(c =>
      title.includes(c.title.slice(0, 15)) ||
      c.title.includes(title.slice(0, 15)) ||
      title.toLowerCase().includes(c.source.toLowerCase())
    );

    if (!matchingCitation) continue;

    const sourceConfig = getSentimentSourceConfig(matchingCitation.url);
    const sentences = body.split(/[.!?\n]+/).filter((s) => s.trim().length > 30);
    
    let sourceSignals = 0;

    for (const sentence of sentences) {
      if (sourceSignals >= 5) break;

      // ENTITY RELEVANCE GATE: Signal must mention the entity or be in a verified source block about the entity
      const lowerSentence = sentence.toLowerCase();
      const mentionsEntity = lowerSentence.includes(competitorLower) || 
                            competitorLower.split(' ').some(word => word.length > 3 && lowerSentence.includes(word));
      
      if (!mentionsEntity && !sourceConfig) continue; // Reject generic noise from unverified sources
      
      const isNews = !sourceConfig;
      const cleaned = cleanPipelineText(sentence, { isNewsSource: isNews, minWords: 8 });
      if (!cleaned || cleaned.trim() === "") continue;

      const topic = inferTopicFromText(cleaned);
      const polarity = detectPolarity(cleaned);

      if (polarity === "neutral") continue; // Reject non-sentimental trivia

      const confidence = calculateSignalConfidence(cleaned, sourceConfig, matchingCitation.url);

      if (confidence < 0.3) continue;

      signals.push({
        id: `sentiment_${signalIndex++}`,
        polarity,
        topic,
        quote: cleaned,
        source: sourceConfig?.domain ?? matchingCitation.source ?? "unknown",
        sourceType: sourceConfig?.type ?? (isCustomerSentimentSource(matchingCitation.url) ? "forum" : "news"),
        sourceUrl: matchingCitation.url,
        date: matchingCitation.date,
        confidence,
        citationId: matchingCitation.id,
      });
      sourceSignals++;
    }
  }

  // 2. Process answers section
  const answerSentences = answersSection.split(/[.!?\n]+/).filter((s) => s.trim().length > 30);
  for (const sentence of answerSentences) {
    const lowerSentence = sentence.toLowerCase();
    if (!lowerSentence.includes(competitorLower)) continue; // Summary must be entity-focused

    const cleaned = cleanPipelineText(sentence, { isNewsSource: true, minWords: 12 });
    if (!cleaned || cleaned.length < 50) continue;

    const topic = inferTopicFromText(cleaned);
    const polarity = detectPolarity(cleaned);

    let confidence = 0.4;
    if (cleaned.includes('"')) confidence += 0.15;
    if (/\d+/.test(cleaned)) confidence += 0.05;

    if (confidence < 0.5) continue;

    signals.push({
      id: `sentiment_${signalIndex++}`,
      polarity,
      topic,
      quote: cleaned,
      source: "Search Summary",
      sourceType: "news",
      confidence,
      citationId: citations[0]?.id,
    });
  }

  return signals;
}

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function clusterSentimentSignals(
  signals: SentimentSignal[],
  competitor: string
): Promise<SentimentCluster[]> {
  const groupKey = (topic: string, polarity: string) => `${topic}:::${polarity}`;
  const groups: Record<string, SentimentSignal[]> = {};

  // Group by (topic, polarity)
  for (const signal of signals) {
    const key = groupKey(signal.topic, signal.polarity);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(signal);
  }

  const rawClusters: any[] = [];

  for (const [key, topicSignals] of Object.entries(groups)) {
    if (topicSignals.length === 0) continue;
    const [topic, polarity] = key.split(":::") as [SentimentTopic, SentimentPolarity];

    // Determine pattern confidence
    const frequency = topicSignals.length;
    const avgConfidence =
      topicSignals.reduce((acc, s) => acc + s.confidence, 0) / topicSignals.length;

    let patternConfidence: "HIGH" | "MEDIUM" | "LOW" = 
      (frequency >= 3 && avgConfidence >= 0.7) ? "HIGH" :
      (frequency >= 2 && avgConfidence >= 0.5) ? "MEDIUM" : "LOW";

    const pattern: SentimentCluster["pattern"] =
      frequency >= 3 ? "recurring" : frequency === 2 ? "emerging" : "isolated";

    const evidence = topicSignals[0].quote.slice(0, 120);

    rawClusters.push({
      topic,
      polarity,
      pattern,
      patternConfidence,
      frequency,
      signals: topicSignals,
      evidence,
    });
  }

  // Batch summarize clusters via LLM for "intelligence" and to avoid template vibes
  if (rawClusters.length > 0) {
    try {
      const prompt = `Synthesize professional sentiment themes for "${competitor}".
Each theme MUST be a single, dense, operator-grade sentence (max 25 words).
Incorporate specific details from the signals but maintain executive tone.
No templates. No fluff.

Clusters:
${rawClusters.map((c, i) => `[Cluster ${i}] Topic: ${c.topic}, Polarity: ${c.polarity}\nSignals: ${c.signals.map((s: any) => s.quote).join(' | ')}`).join('\n\n')}

Return ONLY a JSON array of strings: ["summary for cluster 0", "summary for cluster 1", ...]`;

      const { text } = await generateText({
        model: google("gemini-2.5-flash-lite"),
        prompt,
      });

      const cleanJson = text.replace(/```json|```/g, "").trim();
      const summaries = JSON.parse(cleanJson);

      if (Array.isArray(summaries) && summaries.length === rawClusters.length) {
        rawClusters.forEach((c, i) => {
          c.summary = summaries[i];
        });
      }
    } catch (e) {
      console.error("[Sentiment] LLM synthesis failed, using fallback:", e);
      rawClusters.forEach(c => {
        c.summary = `${c.topic.replace(/_/g, " ")} ${c.polarity} feedback reported in ${c.frequency} signals.`;
      });
    }
  }

  // Final mapping to strict type
  const clusters: SentimentCluster[] = rawClusters.map(c => ({
    topic: c.topic,
    polarity: c.polarity,
    pattern: c.pattern,
    patternConfidence: c.patternConfidence,
    frequency: c.frequency,
    signals: c.signals,
    summary: c.summary || "No summary generated.",
    evidence: c.evidence,
  }));

  // Sort by frequency descending
  clusters.sort((a, b) => b.frequency - a.frequency);

  console.log(`[Sentiment] Clustered into ${clusters.length} topic clusters`);
  return clusters;
}

export async function buildSentimentAnalysis(
  signals: SentimentSignal[],
  competitor: string
): Promise<SentimentAnalysis> {
  const clusters = await clusterSentimentSignals(signals, competitor);

  const uniqueTopics = new Set(signals.map((s) => s.topic));
  const polarityCounts = signals.reduce(
    (acc, s) => {
      acc[s.polarity] = (acc[s.polarity] || 0) + 1;
      return acc;
    },
    {} as Record<SentimentPolarity, number>
  );

  const totalSignals = signals.length;
  const overallPolarity =
    (polarityCounts.positive ?? 0) > (polarityCounts.negative ?? 0)
      ? "positive"
      : (polarityCounts.negative ?? 0) > (polarityCounts.mixed ?? 0)
      ? "negative"
      : "mixed";

  const evidenceSources = Array.from(uniqueTopics).map((topic) => {
    const topicSignals = signals.filter((s) => s.topic === topic);
    const sourceDomains = [...new Set(topicSignals.map((s) => s.source))];
    return { domain: sourceDomains[0] ?? "unknown", count: topicSignals.length };
  });

  // Identify gaps
  const allTopics: SentimentTopic[] = [
    "support",
    "pricing",
    "reliability",
    "onboarding",
    "api_quality",
    "settlement_speed",
    "compliance",
    "ux",
    "documentation",
    "hidden_fees",
    "account_holds",
    "integration_friction",
  ];
  const gaps = allTopics.filter((t) => !uniqueTopics.has(t));

  const avgConfidence = signals.length > 0
    ? signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length
    : 0;

  const confidence: SentimentAnalysis["confidence"] =
    (avgConfidence >= 0.65 && signals.length >= 4) || signals.length >= 8
      ? "HIGH"
      : (avgConfidence >= 0.45 && signals.length >= 2) || signals.length >= 4
      ? "MEDIUM"
      : "LOW";

  return {
    clusters,
    totalSignals,
    uniqueTopics,
    overallPolarity,
    confidence,
    evidenceSources,
    gaps,
  };
}

export function clusterFinancialEvents(events: FinancialEvent[]): EventCluster[] {
  // Group by event family (semantic grouping)
  const familyGroups: Record<string, FinancialEvent[]> = {};

  for (const event of events) {
    if (!familyGroups[event.eventFamily]) {
      familyGroups[event.eventFamily] = [];
    }
    familyGroups[event.eventFamily].push(event);
  }

  const clusters: EventCluster[] = [];

  for (const [family, familyEvents] of Object.entries(familyGroups)) {
    // Find the most recent date
    const sortedByDate = [...familyEvents].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const dateRange =
      sortedByDate.length > 1
        ? `${sortedByDate[sortedByDate.length - 1].date} — ${sortedByDate[0].date}`
        : sortedByDate[0]?.date ?? "Unknown";

    // Merge implications (deduplicate)
    const allImplications = [...new Set(familyEvents.flatMap((e) => e.implications))];

    // Determine cluster confidence
    const highConfidenceCount = familyEvents.filter(
      (e) => e.confidence === "HIGH"
    ).length;
    const confidence: EventCluster["confidence"] =
      highConfidenceCount >= familyEvents.length * 0.5 ? "HIGH" :
      highConfidenceCount >= 1 ? "MEDIUM" : "LOW";

    clusters.push({
      eventFamily: family,
      headline: familyEvents[0]?.headline ?? family,
      dateRange,
      implications: allImplications.slice(0, 5),
      events: familyEvents,
      confidence,
    });
  }

  return clusters;
}

export function extractPricingEvidence(
  pricingCandidates: string[],
  citations: Citation[]
): PricingEvidence[] {
  const evidence: PricingEvidence[] = [];

  for (const candidate of pricingCandidates) {
    // Clean the evidence text first
    const cleanedText = cleanPipelineText(candidate, { minWords: 6 });
    if (!cleanedText) continue;

    const lower = cleanedText.toLowerCase();

    // Skip generic funding mentions
    if (/raised|funding|investor|seed|series|pre-seed/i.test(lower)) continue;

    // Determine model type
    let model: PricingEvidence["model"] = "unknown";
    let hasSpecificPrice = false;

    if (/\b(mdr|merchant discount|transaction.*percent|charge.*percent)\b/i.test(lower)) {
      model = "MDR";
      if (/\d+/.test(lower)) hasSpecificPrice = true;
    } else if (/\b(subscription|monthly|annual|plan)\b/i.test(lower)) {
      model = "subscription";
      if (/[\$₹]\s*[\d,]+/.test(lower)) hasSpecificPrice = true;
    } else if (/\b(usage|based on|per.*transaction|per.*api.*call)\b/i.test(lower)) {
      model = "usage_based";
      if (/[\$₹]\s*[\d,]+/.test(lower)) hasSpecificPrice = true;
    } else if (/\b(enterprise|custom|contact.*sales|negotiat)\b/i.test(lower)) {
      model = "enterprise_contract";
    } else if (/\b(float|cash.*in.*hand|balance)\b/i.test(lower)) {
      model = "float_income";
    } else if (/\b(spread|bid.*ask|forex)\b/i.test(lower)) {
      model = "spread_based";
    } else if (/\b(take.*rate|percentage.*volume|value.*add)\b/i.test(lower)) {
      model = "take_rate";
    } else if (/\b(saas|platform.*fee|infra.*charge)\b/i.test(lower)) {
      model = "SaaS";
    }

    // Find citation
    const matchingCitation = citations.find((c) =>
      cleanedText.includes(c.title.slice(0, 15))
    );

    // Determine confidence based on specificity
    let confidence: PricingEvidence["confidence"] = "LOW";
    if (hasSpecificPrice) {
      confidence = "MEDIUM";
    }
    if (matchingCitation && isCustomerSentimentSource(matchingCitation.url) && hasSpecificPrice) {
      confidence = "HIGH";
    }

    // Only include if we have some signal
    if (model === "unknown" && !hasSpecificPrice) continue;

    evidence.push({
      model,
      evidence: cleanedText.slice(0, 300),
      confidence,
      source: matchingCitation?.source ?? "unknown",
      sourceUrl: matchingCitation?.url,
      citationId: matchingCitation?.id,
    });
  }

  return evidence;
}