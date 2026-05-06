import { BFSICategory,CategoryStrategy } from "@/types";

export const CATEGORY_STRATEGIES: Record<BFSICategory, CategoryStrategy> = {
  // 1. PAYMENT LAYER
  payment_gateway: {
    validate: "Gateways optimize transaction acceptance and checkout reliability",
    acknowledge: "Handles checkout conversion and acquiring bank routing",
    reframe: "Payment orchestration does not solve the orchestration complexity of regulated banking products",
    specify: "Blostem collaborates with several banks and NBFCs, facilitating FD bookings through a standardized flow.",
  },
  payment_aggregator: {
    validate: "Aggregators simplify merchant onboarding and multi-modal payment acceptance",
    acknowledge: "Abstracts the complexity of managing multiple acquiring bank relationships",
    reframe: "Aggregators move funds but do not provide the ledgering and regulatory rails for banking products",
    specify: "Blostem is the payment aggregator equivalent for banking products—standardizing deposit flows across multiple banks.",
  },
  wallet: {
    validate: "Wallets simplify consumer payments and transaction flows",
    acknowledge: "Drives consumer engagement and peer-to-peer liquidity",
    reframe: "Wallet infrastructure optimizes payments, not regulated banking-product orchestration",
    specify: "Blostem provides FD/RD infrastructure instead of consumer payment abstraction",
  },
  upi_app: {
    validate: "UPI apps dominate consumer retail payments and P2P transfers",
    acknowledge: "Provides high-frequency transaction rails and consumer ubiquity",
    reframe: "UPI solves instant settlement, but not the long-term custody and yield generation of banking products",
    specify: "Blostem provides the backend rails to attach FD/RD yield products directly to UPI transaction flows",
  },
  payment_orchestration: {
    validate: "Orchestrators optimize routing across multiple payment gateways to improve success rates",
    acknowledge: "Manages complex checkout routing and failover logic",
    reframe: "Routing transactions does not solve the maintenance overhead of multiple direct bank integrations",
    specify: "Blostem is the payment aggregator equivalent for banking products—standardizing onboarding and booking.",
  },
  merchant_of_record: {
    validate: "Teams use MoR providers to simplify global payments, tax handling, and compliance",
    acknowledge: "Handles operational complexity around global SaaS payments and compliance",
    reframe: "MoR simplifies payment operations but abstracts ownership, custody, and compliance control",
    specify: "Blostem provides infra-layer control for regulated BFSI products without outsourcing merchant ownership",
  },

  // 2. BANKING INFRA
  banking_api_infra: {
    validate: "Banking APIs provide foundational access to underlying core banking systems",
    acknowledge: "Abstracts legacy bank connectivity into modern REST interfaces",
    reframe: "Raw banking APIs require heavy lifting to orchestrate into compliant financial products",
    specify: "Blostem is the payment aggregator equivalent for banking products—providing a single platform for multi-bank orchestration.",
  },
  embedded_finance_infra: {
    validate: "Embedded finance layers allow platforms to offer banking services natively",
    acknowledge: "Enables non-banks to launch accounts, cards, and lending products",
    reframe: "General-purpose embedded finance often lacks depth in specific regulated products like FDs and RDs",
    specify: "Blostem focuses specifically on high-yield banking products, offering deeper integrations than horizontal platforms",
  },
  neobanking_infra: {
    validate: "Neobanking infra provides white-labeled banking experiences and ledgering",
    acknowledge: "Powers digital-first banking frontends and customer ledgers",
    reframe: "Building a neobank requires orchestrating multiple backend suppliers for yield and credit",
    specify: "Blostem acts as the definitive supplier for FD/RD capabilities within a neobanking stack",
  },

  // 3. LENDING / CREDIT
  nbfc: {
    validate: "NBFCs provide the capital and regulatory licensing for credit products",
    acknowledge: "Supplies the balance sheet and underwriting capabilities",
    reframe: "Direct NBFC integrations create single-partner lock-in and fragmented developer experiences",
    specify: "Blostem aggregates multiple NBFCs and banks into a single infrastructure layer for maximum resilience",
  },
  lending_platform: {
    validate: "Lending platforms optimize loan origination and lifecycle management",
    acknowledge: "Streamlines credit assessment and disbursement workflows",
    reframe: "Credit is only one side of the balance sheet; platforms often lack native yield/savings products",
    specify: "Blostem provides the deposit/savings infrastructure to balance credit-focused platforms",
  },
  loan_aggregator: {
    validate: "Loan aggregators match consumers with the best credit offers",
    acknowledge: "Drives customer acquisition for lending partners",
    reframe: "Aggregators typically act as lead-gen rather than embedding the core financial product",
    specify: "Blostem enables true embedded finance, keeping the user within your ecosystem instead of redirecting them",
  },
  bnpl: {
    validate: "BNPL providers optimize checkout conversion through point-of-sale financing",
    acknowledge: "Provides short-term liquidity and increases merchant GMV",
    reframe: "BNPL is a checkout feature, not a comprehensive financial product suite",
    specify: "Blostem provides the underlying infrastructure to offer sustainable savings products alongside credit",
  },

  // 4. WEALTH / INVESTMENT
  broker: {
    validate: "Brokerages optimize investing access and retail distribution",
    acknowledge: "Provides consumer-grade UX for wealth creation and trading",
    reframe: "Broker platforms sit above infra layers rather than replacing them",
    specify: "Blostem powers the infrastructure underneath savings and banking products, acting as a supplier to distribution platforms",
  },
  wealth_platform: {
    validate: "Wealth platforms consolidate investment tracking and portfolio management",
    acknowledge: "Optimizes end-user wealth distribution and advisory",
    reframe: "Distribution platforms rely on underlying manufacturers and infrastructure to supply products",
    specify: "Blostem provides the embeddable infrastructure that allows platforms to distribute FD/RD products natively",
  },
  robo_advisor: {
    validate: "Robo-advisors automate wealth allocation and portfolio rebalancing",
    acknowledge: "Abstracts investment strategy into algorithmic asset management",
    reframe: "Algorithms require reliable, direct access to fixed-income asset manufacturers",
    specify: "Blostem provides direct API access to FDs, enabling robo-advisors to natively allocate into bank deposits",
  },

  // 5. DEPOSIT / SAVINGS SUPPLY SIDE
  fd_provider: {
    validate: "FD providers manufacture the core fixed-income asset",
    acknowledge: "Provides the balance sheet and regulatory wrapper for deposits",
    reframe: "Banks manufacture the product but lack developer-friendly distribution infrastructure",
    specify: "Blostem acts as the technology bridge between FD manufacturers and digital distribution platforms",
  },
  rd_provider: {
    validate: "RD providers manufacture recurring deposit products",
    acknowledge: "Handles recurring collections and yield generation",
    reframe: "Integrating direct RD flows from banks is highly fragmented and legacy-bound",
    specify: "Blostem unifies RD booking across multiple banks into a single modern API",
  },
  issuer: {
    validate: "Issuers hold the ultimate regulatory license for financial instruments",
    acknowledge: "Carries the compliance, capital, and risk burden",
    reframe: "Issuers are not technology companies; direct integration is slow and rigid",
    specify: "Blostem abstracts the legacy issuer technology so platforms can launch faster",
  },

  // 6. DISTRIBUTION LAYER
  marketplace: {
    validate: "Marketplaces optimize discovery and comparison of financial products",
    acknowledge: "Drives top-of-funnel acquisition for banks and lenders",
    reframe: "Traditional marketplaces rely on redirecting users to bank portals, losing the customer relationship",
    specify: "Blostem enables marketplaces to embed the actual booking journey, retaining the user",
  },
  distribution_api: {
    validate: "Distribution APIs provide access to third-party financial products",
    acknowledge: "Aggregates mutual funds, insurance, or credit into single APIs",
    reframe: "Many distribution APIs act as affiliate links rather than true embedded infrastructure",
    specify: "Blostem provides deep integration, handling the entire lifecycle and ledgering of the deposit",
  },
  embedded_distribution: {
    validate: "Embedded distribution puts financial products at the point of need",
    acknowledge: "Monetizes existing user bases through contextual finance",
    reframe: "Embedding finance requires robust backend compliance and multi-bank orchestration",
    specify: "Blostem provides the compliant backend rails necessary for embedded distribution of banking products",
  },

  // 7. INSURANCE
  insurtech: {
    validate: "Insurtechs optimize underwriting, distribution, and claims processing",
    acknowledge: "Modernizes legacy insurance workflows and policy management",
    reframe: "Insurance infrastructure operates on different rails than core banking and deposits",
    specify: "Blostem provides the complementary banking product layer for platforms looking to expand beyond insurance",
  },
  insurance_aggregator: {
    validate: "Insurance aggregators simplify policy comparison and purchasing",
    acknowledge: "Drives consumer transparency and lead generation for insurers",
    reframe: "Aggregators typically lack the infrastructure to hold assets or manage yield",
    specify: "Blostem enables aggregators to expand into savings and deposits with minimal infra overhead",
  },

  // 8. CORE BANKING / LEDGER
  core_banking: {
    validate: "Core banking systems provide the ultimate ledger of truth for financial institutions",
    acknowledge: "Handles fundamental account balances and ledger entries",
    reframe: "Core systems are inflexible and not designed for rapid third-party fintech embedding",
    specify: "Blostem acts as the agile orchestration layer between rigid core banking systems and modern fintech frontends",
  },
  ledger_infra: {
    validate: "Ledger infrastructure provides scalable, immutable transaction recording",
    acknowledge: "Ensures financial data integrity and real-time balance tracking",
    reframe: "A ledger tracks money, but it doesn't connect you to the regulated banks that hold it",
    specify: "Blostem provides the actual banking integrations (FD/RD), not just the software to track them",
  },

  // 9. COMPLIANCE / RISK
  kyc_aml: {
    validate: "KYC/AML tools optimize onboarding compliance and identity verification",
    acknowledge: "Specializes in fraud reduction and regulatory identity checks",
    reframe: "Identity verification is only one step of the BFSI product lifecycle",
    specify: "Blostem integrates compliance natively into the full lifecycle of FD/RD booking and servicing",
  },
  fraud_risk: {
    validate: "Fraud and risk platforms optimize transaction safety and anomaly detection",
    acknowledge: "Protects platforms from bad actors and financial loss",
    reframe: "Risk scoring is a horizontal tool, not a complete banking product infrastructure",
    specify: "Blostem embeds risk controls directly into the deposit orchestration flow",
  },
  regtech: {
    validate: "Regtech automates compliance reporting and regulatory adherence",
    acknowledge: "Reduces the operational burden of managing complex financial regulations",
    reframe: "Regtech reports on data, but doesn't orchestrate the underlying financial products",
    specify: "Blostem natively handles the compliance requirements specifically for FD/RD orchestration",
  },

  // 10. GLOBAL / EDGE CASES
  bigtech_finance: {
    validate: "Bigtechs leverage massive distribution to offer commoditized finance",
    acknowledge: "Provides unparalleled consumer reach and UX",
    reframe: "Bigtechs partner with banks but rarely provide B2B infrastructure for others to build on",
    specify: "Blostem provides the B2B infrastructure that allows any company to embed finance like a Bigtech",
  },
  crypto_fintech: {
    validate: "Crypto fintechs optimize decentralized assets and alternative yield",
    acknowledge: "Provides access to tokenized assets and blockchain rails",
    reframe: "Crypto rails lack the regulatory certainty and deposit insurance of traditional banking",
    specify: "Blostem provides access to regulated, insured banking products (FDs/RDs) with fiat certainty",
  },
  cross_border_payments: {
    validate: "Cross-border platforms optimize FX and international settlement",
    acknowledge: "Reduces the friction and cost of moving money globally",
    reframe: "Moving money internationally does not solve local regulatory deposit booking",
    specify: "Blostem specializes in deep domestic banking infrastructure for regulated deposit products",
  }
};

export function getCategoryStrategy(category: BFSICategory | string): CategoryStrategy {
  return (CATEGORY_STRATEGIES as any)[category] || CATEGORY_STRATEGIES.banking_api_infra;
}
