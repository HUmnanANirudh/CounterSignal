/**
 * Customer Sentiment Source Allowlist
 * Only sources with verified real user voice are included.
 * All other sources (news, regulatory, funding) are excluded from sentiment extraction.
 */

export const CUSTOMER_SENTIMENT_SOURCES: Record<string, {
  domain: string;
  type: "forum" | "review" | "app_review" | "employment";
  region: "india" | "global";
  minContentLength: number;
}> = {
  reddit: {
    domain: "reddit.com",
    type: "forum",
    region: "india", // India fintech threads are highly active
    minContentLength: 100,
  },
  g2: {
    domain: "g2.com",
    type: "review",
    region: "global",
    minContentLength: 150,
  },
  capterra: {
    domain: "capterra.com",
    type: "review",
    region: "global",
    minContentLength: 150,
  },
  trustpilot: {
    domain: "trustpilot.com",
    type: "review",
    region: "global",
    minContentLength: 100,
  },
  mouthshut: {
    domain: "mouthshut.com",
    type: "review",
    region: "india",
    minContentLength: 100,
  },
  glassdoor: {
    domain: "glassdoor.com",
    type: "employment",
    region: "global",
    minContentLength: 100,
  },
  ambitionbox: {
    domain: "ambitionbox.com",
    type: "employment",
    region: "india",
    minContentLength: 100,
  },
  getapp: {
    domain: "getapp.com",
    type: "review",
    region: "global",
    minContentLength: 150,
  },
  appfollow: {
    domain: "appfollow.io",
    type: "app_review",
    region: "global",
    minContentLength: 80,
  },
  playstore: {
    domain: "play.google.com",
    type: "app_review",
    region: "global",
    minContentLength: 50,
  },
  appstore: {
    domain: "apps.apple.com",
    type: "app_review",
    region: "global",
    minContentLength: 50,
  },
  producthunt: {
    domain: "producthunt.com",
    type: "forum",
    region: "global",
    minContentLength: 100,
  },
  stackshare: {
    domain: "stackshare.io",
    type: "forum",
    region: "global",
    minContentLength: 100,
  },
};

export const SENTIMENT_SOURCE_DOMAINS = new Set(
  Object.values(CUSTOMER_SENTIMENT_SOURCES).map((s) => s.domain)
);

export function isCustomerSentimentSource(url: string): boolean {
  const normalized = url.toLowerCase();
  return Array.from(SENTIMENT_SOURCE_DOMAINS).some((domain) =>
    normalized.includes(domain)
  );
}

export function getSentimentSourceType(
  url: string
): (typeof CUSTOMER_SENTIMENT_SOURCES)[keyof typeof CUSTOMER_SENTIMENT_SOURCES]["type"] | null {
  const normalized = url.toLowerCase();
  for (const [, config] of Object.entries(CUSTOMER_SENTIMENT_SOURCES)) {
    if (normalized.includes(config.domain)) {
      return config.type;
    }
  }
  return null;
}

export function getSentimentSourceConfig(url: string) {
  const normalized = url.toLowerCase();
  for (const [, config] of Object.entries(CUSTOMER_SENTIMENT_SOURCES)) {
    if (normalized.includes(config.domain)) {
      return config;
    }
  }
  return null;
}