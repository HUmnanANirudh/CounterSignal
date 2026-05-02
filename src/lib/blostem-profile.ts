export const blostemProfile = {
  icp: ["SMBs", "fintech startups", "mid-market BFSI firms"],
  pricing_model: "SaaS with transparent per-seat pricing",
  pricing_philosophy: "No hidden fees, predictable costs",
  strengths: [
    "faster onboarding (days not months)",
    "transparent pricing",
    "better API reliability (99.99% uptime)",
    "dedicated BFSI support team",
    "modern stack / better DX",
  ],
  differentiators: [
    "2-week onboarding vs industry avg 3-6 months",
    "No enterprise lock-in contracts",
    "Purpose-built for BFSI compliance needs",
  ],
  weaknesses: [
    "Less brand recognition than incumbents",
    "Smaller ecosystem / fewer integrations",
  ],
  avoid_competitor_when: [
    "Enterprise deal > 500 seats (competitor has volume discounts)",
    "Requires deep existing ecosystem integrations",
  ],
  compete_aggressively_when: [
    "Prospect frustrated with slow onboarding",
    "Prospect complains about unpredictable pricing",
    "Prospect values developer experience",
    "Prospect needs BFSI-specific compliance features",
  ],
} as const;

export type BlostemProfile = typeof blostemProfile;