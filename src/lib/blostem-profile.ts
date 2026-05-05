export const blostemProfile = {
  name: "Blostem",
  description: "Banking infrastructure layer for regulated products (FDs, RDs, credit) — the 'payment aggregator equivalent for banking products'",

  icp: [
    "Wealth apps and brokerages (e.g., Zerodha Coin)",
    "NBFCs looking to offer FD products",
    "Fintechs building savings/wealth management",
    "Apps with existing user base needing banking products",
  ],

  target_problems: [
    "Point-to-point bank integrations are slow, brittle, expensive",
    "Each bank has different APIs, compliance processes, reconciliation",
    "Maintenance overhead pulls focus from core product",
    "FD onboarding friction — every bank has its own KYC flow not designed for FD-only customers",
  ],

  product: {
    type: "Banking infrastructure aggregator",
    offerings: [
      "FD (Fixed Deposit) booking from multiple banks/NBFCs",
      "RD (Recurring Deposit) support",
      "Credit on UPI (in development)",
      "FD-backed credit cards (in development)",
    ],
    how_it_works: "Single standardized API for onboarding, booking, servicing across multiple banks",
  },

  strengths: [
    "Single API for multi-bank FD/RD access (no more point-to-point integrations)",
    "Standardized onboarding, booking, and servicing flow",
    "Purpose-built for compliance with regulatory requirements",
    "Years of experience building this infrastructure",
    "Partner network of banks and NBFCs",
    "Co-creation model with partner institutions",
    "Focus on the unglamorous but critical infra work",
    "Trusted by Zerodha — integrating FD on Coin",
    "Backed by Rainmatter (Zerodha's VC arm)",
  ],

  differentiators: [
    "Payment aggregator equivalent for banking products (vs stitching together bank integrations)",
    "No need to rebuild the same stack for each bank partnership",
    "Multi-bank FD access through single integration",
    "Purpose-built for the Indian wealth/savings market",
    "Not a bank itself — infrastructure layer, so partners maintain customer relationships",
    "Launch FD products in weeks not months",
  ],

  pricing_model: "B2B SaaS / infrastructure pricing (not disclosed publicly)",
  pricing_philosophy: "Transparent costs, no hidden fees, predictable for partners",

  recent_news: [
    "Raised investment from Rainmatter (Zerodha's VC arm)",
    "Zerodha will integrate Blostem to offer FDs on Coin",
    "Building since 2019+ with founding team of Sandeep, Ravi, Uday, Pankaj",
    "~$131 lakh crores in FDs with banks in India (~₹66 lakh crores from individuals) — massive market",
    "Individual FD balances grew ~80% over 6 years across different rate cycles",
    "Credit on UPI and FD-backed credit cards in development",
  ],

  avoid_competitor_when: [
    "Prospect is a bank wanting to build their own infra",
    "Prospect needs only a single bank FD (direct integration is fine)",
    "Enterprise deals requiring heavy customization outside standard FD/RD flows",
  ],

  compete_aggressively_when: [
    "Prospect is building wealth management platform and tired of point-to-point integrations",
    "Prospect complains about reconciliation and maintenance overhead",
    "Prospect wants to offer FDs quickly without building bank integrations",
    "Prospect values standardization and compliance handles",
    "Prospect is a brokerage or wealth app wanting to add FD products",
  ],

  VARS_context: {
    validate: "You're considering Blostem to solve the integration complexity that comes with offering banking products like FDs to your users.",
    acknowledge: "Blostem has proven infrastructure trusted by platforms like Zerodha and backed by Rainmatter.",
    reframe: "Building point-to-point integrations with each bank is slow, expensive, and distracts from your core product.",
    specify: "Blostem provides a single API for multi-bank FD access with standardized compliance, so you can launch in weeks not months.",
  },
  social_proof: {
    investor: "Rainmatter (Zerodha's VC arm)",
    integration_partner: "Zerodha Coin",
    quote: "We have been speaking with the Blostem team for a while now, and what they are building is something the wealthtech ecosystem has quietly needed for years.",
    market_context: "~$131 lakh crores in FDs with banks in India; retail FD balances grew ~80% in 6 years",
  },
} as const;

export type BlostemProfile = typeof blostemProfile;
