import type { SentimentTopic } from "@/types/sentiment";

export const TAXONOMY_KEYWORDS: Record<SentimentTopic, string[]> = {
  support: ["support", "response", "reply", "help", "ticket", "escalation", "agent", "chat", "unresponsive", "delayed response"],
  pricing: ["price", "cost", "fee", "charge", "billing", "expensive", "cheap", "affordable", "pricing", "mdr", "markup"],
  reliability: ["down", "outage", "uptime", "reliable", "reliability", "crash", "break", "fail", "downtime", "system fail"],
  onboarding: ["onboard", "setup", "activate", "verification", "kyc", "approval", "document", "verification delay"],
  api_quality: ["api", "integration", "sdk", "docs", "documentation", "developer", "webhook", "sandbox", "endpoint"],
  settlement_speed: ["settlement", "payout", "transfer", "withdraw", "delay", "t+", "days", "payout delay"],
  compliance: ["compliance", "regulatory", "rbi", "license", "audit", "kyc", "aml", "authorization", "directive", "proceedings"],
  ux: ["ui", "ux", "interface", "design", "easy", "simple", "intuitive", "clutter", "navigation", "dashboard"],
  documentation: ["doc", "guide", "tutorial", "example", "reference", "help article", "tutorials"],
  hidden_fees: ["hidden", "surprise", "unexpected", "extra", "additional", "fine print", "opaque"],
  account_holds: ["frozen", "hold", "suspended", "locked", "restricted", "ban", "account freeze"],
  integration_friction: ["integration", "technical", "setup", "implement", "config", "manual process"],
};

export const TOPIC_INFERENCE_PATTERNS: Array<{ topic: SentimentTopic; patterns: RegExp[] }> = [
  { topic: "support", patterns: [/support.*(never|not|delay|hour|day|week)/i, /(no|never).*respond.*support/i] },
  { topic: "account_holds", patterns: [/account.*(frozen|held|suspend|lock|ban)/i, /(frozen|hold|suspend).*account/i] },
  { topic: "hidden_fees", patterns: [/hidden.*fee/i, /surprise.*charge/i, /unexpected.*cost/i] },
  { topic: "settlement_speed", patterns: [/settlement.*(delay|day|week)/i, /payout.*(slow|delay|day)/i] },
  { topic: "reliability", patterns: [/outage|downtime|service.*down|platform.*down/i] },
  { topic: "compliance", patterns: [/rbi.*notice|regulatory.*issue|compliance.*problem|winding\s+up|proceedings/i] },
];

export function inferTopicFromText(text: string): SentimentTopic {
  const lower = text.toLowerCase();

  // 1. Check explicit patterns first
  for (const { topic, patterns } of TOPIC_INFERENCE_PATTERNS) {
    if (patterns.some((p) => p.test(lower))) return topic;
  }

  // 2. Check keyword matching
  let bestTopic: SentimentTopic = "support";
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(TAXONOMY_KEYWORDS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic as SentimentTopic;
    }
  }

  return bestScore > 0 ? bestTopic : "support";
}
