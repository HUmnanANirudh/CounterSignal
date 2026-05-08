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
  // Determine if this is a verified sentiment source
  const isVerifiedSource = sourceConfig != null ||
    (sourceUrl && isCustomerSentimentSource(sourceUrl));

  // Base confidence
  let confidence = isVerifiedSource ? 0.5 : 0.25;

  // Source type weights (if available)
  const typeWeights: Record<string, number> = {
    review: 0.8,
    app_review: 0.7,
    forum: 0.6,
    employment: 0.5,
    news: 0.4,
  };
  
  if (sourceConfig) {
    confidence = typeWeights[sourceConfig.type] ?? 0.5;
  }

  // Content length bonus (longer = more specific = higher confidence)
  if (text.length > 150) confidence += 0.1;
  if (text.length > 300) confidence += 0.1;

  // Exact quote indicator (quotes, specificity)
  if (/["'“”‘’]/.test(text)) confidence += 0.15;

  // Specific details (numbers, dates, names) = higher confidence
  if (/\d+/.test(text)) confidence += 0.05;

  return Math.min(confidence, 0.95);
}

export function extractSentimentSignals(
  content: string,
  citations: Citation[]
): SentimentSignal[] {
  const signals: SentimentSignal[] = [];

  // Split content by headers: "## Title"
  // The first part (before any "## ") contains the AI-generated answers
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
    
    // PER-SOURCE LIMIT: Max 5 signals per individual source to prevent bias
    let sourceSignals = 0;

    for (const sentence of sentences) {
      if (sourceSignals >= 5) break;

      // Determine if source is news (skeptical of sentiment)
      const isNews = !sourceConfig;
      
      const cleaned = cleanPipelineText(sentence, { isNewsSource: isNews, minWords: 8 });
      if (!cleaned || cleaned.trim() === "") continue;

      // Classify
      const topic = inferTopicFromText(cleaned);
      const polarity = detectPolarity(cleaned);

      // Calculate confidence
      const confidence = calculateSignalConfidence(cleaned, sourceConfig, matchingCitation.url);

      // Threshold gate
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

  // 2. Process answers section (fallback attribution to first citation or "AI Summary")
  const answerSentences = answersSection.split(/[.!?\n]+/).filter((s) => s.trim().length > 30);
  for (const sentence of answerSentences) {
    const cleaned = cleanPipelineText(sentence, { isNewsSource: true, minWords: 12 }); // Summary needs substance
    if (!cleaned || cleaned.length < 50) continue;

    const topic = inferTopicFromText(cleaned);
    const polarity = detectPolarity(cleaned);

    // AI answers get lower base confidence but can be boosted by content signals
    let confidence = 0.4;
    if (cleaned.includes('"')) confidence += 0.15;
    if (/\d+/.test(cleaned)) confidence += 0.05;

    if (confidence < 0.5) continue; // Higher bar for AI-summarized sentiment

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

  console.log(`[Sentiment] Extracted ${signals.length} signals from ${signals.length > 0 ? new Set(signals.map(s => s.source)).size : 0} sources`);
  return signals;
}

export function clusterSentimentSignals(signals: SentimentSignal[]): SentimentCluster[] {
  const topicGroups: Record<SentimentTopic, SentimentSignal[]> = {} as Record<
    SentimentTopic,
    SentimentSignal[]
  >;

  // Group by topic
  for (const signal of signals) {
    if (!topicGroups[signal.topic]) {
      topicGroups[signal.topic] = [];
    }
    topicGroups[signal.topic].push(signal);
  }

  const clusters: SentimentCluster[] = [];

  for (const [topic, topicSignals] of Object.entries(topicGroups)) {
    if (topicSignals.length === 0) continue;

    // Determine pattern confidence based on frequency and agreement
    const frequency = topicSignals.length;
    const avgConfidence =
      topicSignals.reduce((acc, s) => acc + s.confidence, 0) / topicSignals.length;

    let patternConfidence: "HIGH" | "MEDIUM" | "LOW";
    if (frequency >= 3 && avgConfidence >= 0.7) {
      patternConfidence = "HIGH";
    } else if (frequency >= 2 && avgConfidence >= 0.5) {
      patternConfidence = "MEDIUM";
    } else {
      patternConfidence = "LOW";
    }

    // Sort by polarity for summary
    const byPolarity = topicSignals.reduce(
      (acc, s) => {
        acc[s.polarity] = (acc[s.polarity] || 0) + 1;
        return acc;
      },
      {} as Record<SentimentPolarity, number>
    );

    const dominantPolarity =
      (Object.entries(byPolarity).sort((a, b) => b[1] - a[1])[0]?.[0] as SentimentPolarity) ?? "mixed";

    const pattern: SentimentCluster["pattern"] =
      frequency >= 3 ? "recurring" : frequency === 2 ? "emerging" : "isolated";

    // PROFESSIONAL THEME SYNTHESIS
    const themeTemplates: Record<SentimentTopic, Partial<Record<SentimentPolarity, string>>> = {
      support: {
        positive: "Users report highly responsive and helpful support channels with fast resolution.",
        negative: "Support escalation delays appear repeatedly during account-review or transaction incidents.",
        mixed: "Support quality is inconsistent, with high responsiveness but varied resolution depth."
      },
      pricing: {
        positive: "Competitive and transparent pricing models are frequently cited as a key market differentiator.",
        negative: "Users report concerns regarding opaque fee structures and unexpected transaction charges.",
        mixed: "Value-to-cost ratio is viewed positively, though entry-level pricing is perceived as high."
      },
      reliability: {
        positive: "Platform stability and uptime consistency are highlighted as core operational strengths.",
        negative: "Occasional service outages and reliability issues impact user trust during peak hours.",
        mixed: "General stability is good, but performance varies during high-volume settlement windows."
      },
      ux: {
        positive: "The interface is consistently praised for its intuitive design and low onboarding friction.",
        negative: "Users report UI clutter and navigation complexity in the merchant dashboard.",
        mixed: "Modern aesthetics are appreciated, but critical workflows can be difficult to locate."
      },
      onboarding: {
        positive: "Onboarding and KYC workflows are noted for being fast and highly automated.",
        negative: "Manual verification delays and document rejection cycles cause significant friction.",
        mixed: "Digital onboarding is smooth, but edge-case compliance checks are slow."
      },
      api_quality: {
        positive: "Developer-friendly SDKs and comprehensive documentation reduce integration cycles.",
        negative: "API documentation is often outdated or lacks clear error-handling examples.",
        mixed: "API performance is robust, but the integration sandbox is limited."
      },
      settlement_speed: {
        positive: "Fast settlement cycles and clear payout visibility are major drivers of retention.",
        negative: "Recurring complaints regarding delayed settlements and lack of status transparency.",
        mixed: "Settlements are generally on-time, but weekend processing is inconsistent."
      },
      compliance: {
        positive: "Strong adherence to regulatory guidelines provides peace of mind for enterprise partners.",
        negative: "Stiff compliance requirements and sudden account holds create operational risk.",
        mixed: "Regulatory standing is secure, but compliance-driven UX changes are jarring."
      },
      documentation: {
        positive: "Extensive help resources and tutorials facilitate self-serve troubleshooting.",
        negative: "Help articles lack technical depth and fail to cover complex use cases.",
        mixed: "Broad documentation exists, but search functionality is poor."
      },
      hidden_fees: {
        positive: "Transparent commercial terms with no reported hidden costs or surprises.",
        negative: "Repeated mentions of surprise charges not clearly disclosed in the initial contract.",
        mixed: "Core pricing is clear, but peripheral service fees are sometimes unexpected."
      },
      account_holds: {
        positive: "Account security measures are robust and protect against fraudulent activity.",
        negative: "Sudden and unexplained account freezes cause severe business disruption for merchants.",
        mixed: "Necessary security protocols are in place, but the unfreezing process is slow."
      },
      integration_friction: {
        positive: "Technical implementation is seamless with dedicated support for complex stacks.",
        negative: "Integration requires significant manual configuration and technical overhead.",
        mixed: "Standard integrations are easy, but bespoke configurations are friction-heavy."
      }
    };

    const summary = themeTemplates[topic as SentimentTopic]?.[dominantPolarity] || 
                    `${topic.replace(/_/g, " ").charAt(0).toUpperCase() + topic.replace(/_/g, " ").slice(1)} ${dominantPolarity} patterns reported by multiple sources.`;

    const evidence = topicSignals[0].quote.slice(0, 120);

    clusters.push({
      topic: topic as SentimentTopic,
      pattern,
      patternConfidence,
      frequency,
      signals: topicSignals,
      summary,
      evidence,
    });
  }

  // Sort by frequency descending
  clusters.sort((a, b) => b.frequency - a.frequency);

  console.log(`[Sentiment] Clustered into ${clusters.length} topic clusters`);
  return clusters;
}

export function buildSentimentAnalysis(
  signals: SentimentSignal[],
): SentimentAnalysis {
  const clusters = clusterSentimentSignals(signals);

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

  const avgConfidence =
    signals.length > 0
      ? signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length
      : 0;
  const confidence: SentimentAnalysis["confidence"] =
    avgConfidence >= 0.7 && signals.length >= 3
      ? "HIGH"
      : avgConfidence >= 0.5 && signals.length >= 2
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