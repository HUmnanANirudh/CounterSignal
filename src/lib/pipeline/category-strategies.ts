import { BFSICategory, CategoryStrategy } from "@/types/entity";

export const CATEGORY_STRATEGIES: Record<BFSICategory, CategoryStrategy> = {
  // 1. PAYMENT LAYER
  payment_gateway: {
    strategicGoal: "Differentiate on orchestration depth vs transaction movement",
    validate: "Gateways optimize transaction acceptance and checkout reliability",
    acknowledge: "Handles checkout conversion and acquiring bank routing",
    reframe: "Payment orchestration does not solve the orchestration complexity of regulated banking products",
    specify: "Blostem facilitates FD/RD bookings through a standardized flow across multiple banks.",
  },
  payment_aggregator: {
    strategicGoal: "Highlight missing regulatory rails and ledgering",
    validate: "Aggregators simplify merchant onboarding and multi-modal payment acceptance",
    acknowledge: "Abstracts the complexity of managing multiple acquiring bank relationships",
    reframe: "Aggregators move funds but do not provide the ledgering and regulatory rails for banking products",
    specify: "Blostem is the payment aggregator equivalent for banking products.",
  },
  wallet: {
    strategicGoal: "Shift focus from consumer liquidity to institutional yield",
    validate: "Wallets simplify consumer payments and transaction flows",
    acknowledge: "Drives consumer engagement and peer-to-peer liquidity",
    reframe: "Wallet infrastructure optimizes payments, not regulated banking-product orchestration",
    specify: "Blostem provides FD/RD infrastructure instead of consumer payment abstraction",
  },
  upi_app: {
    strategicGoal: "Position as the backend yield engine for high-velocity transaction apps",
    validate: "UPI apps dominate consumer retail payments and P2P transfers",
    acknowledge: "Provides high-frequency transaction rails and consumer ubiquity",
    reframe: "UPI solves instant settlement, but not the long-term custody and yield generation of banking products",
    specify: "Blostem attaches FD/RD yield products directly to UPI transaction flows",
  },
  payment_orchestration: {
    strategicGoal: "Contrast payment routing vs banking integration maintenance",
    validate: "Orchestrators optimize routing across multiple payment gateways to improve success rates",
    acknowledge: "Manages complex checkout routing and failover logic",
    reframe: "Routing transactions does not solve the maintenance overhead of multiple direct bank integrations",
    specify: "Blostem standardizes the onboarding and booking flow for regulated products.",
  },
  merchant_of_record: {
    strategicGoal: "Differentiate on ownership and compliance control vs abstraction",
    validate: "Teams use MoR providers to simplify global payments, tax handling, and compliance",
    acknowledge: "Handles operational complexity around global SaaS payments and compliance",
    reframe: "MoR simplifies payment operations but abstracts ownership, custody, and compliance control",
    specify: "Blostem provides infra-layer control without outsourcing merchant ownership",
  },

  // 2. BANKING INFRA
  banking_api_infra: {
    strategicGoal: "Highlight the 'last mile' orchestration delta",
    validate: "Banking APIs provide foundational access to underlying core banking systems",
    acknowledge: "Abstracts legacy bank connectivity into modern REST interfaces",
    reframe: "Raw banking APIs require heavy lifting to orchestrate into compliant financial products",
    specify: "Blostem provides the unified orchestration layer that sits atop raw banking APIs.",
  },
  embedded_finance_infra: {
    strategicGoal: "Show depth in complex regulated products vs horizontal ledgering",
    validate: "Embedded finance layers allow platforms to offer banking services natively",
    acknowledge: "Enables non-banks to launch accounts, cards, and lending products",
    reframe: "General-purpose embedded finance often lacks depth in specific regulated products like FDs and RDs",
    specify: "Blostem focuses specifically on high-yield banking products with deeper issuer integrations.",
  },
  neobanking_infra: {
    strategicGoal: "Position as the definitive supplier for yield-bearing assets",
    validate: "Neobanking infra provides white-labeled banking experiences and ledgering",
    acknowledge: "Powers digital-first banking frontends and customer ledgers",
    reframe: "Building a neobank requires orchestrating multiple backend suppliers for yield and credit",
    specify: "Blostem acts as the definitive supplier for FD/RD capabilities within the neobanking stack",
  },

  // 3. LENDING / CREDIT
  nbfc: {
    strategicGoal: "Pivot from capital supply to technical distribution efficiency",
    validate: "NBFCs provide the capital and regulatory licensing for credit products",
    acknowledge: "Supplies the balance sheet and underwriting capabilities",
    reframe: "Direct NBFC integrations create single-partner lock-in and fragmented developer experiences",
    specify: "Blostem aggregates multiple NBFCs into a single distribution-ready infrastructure layer",
  },
  lending_platform: {
    strategicGoal: "Introduce the need for 'balance sheet balance' via deposits",
    validate: "Lending platforms optimize loan origination and lifecycle management",
    acknowledge: "Streamlines credit assessment and disbursement workflows",
    reframe: "Credit is only one side of the balance sheet; platforms often lack native yield/savings products",
    specify: "Blostem provides the deposit infrastructure to balance credit-focused platforms",
  },
  loan_aggregator: {
    strategicGoal: "Shift from lead-gen to embedded relationship ownership",
    validate: "Loan aggregators match consumers with the best credit offers",
    acknowledge: "Drives customer acquisition for lending partners",
    reframe: "Aggregators typically act as lead-gen rather than embedding the core financial product",
    specify: "Blostem enables true embedded finance, keeping the user within your ecosystem",
  },
  bnpl: {
    strategicGoal: "Differentiate checkout features vs comprehensive savings products",
    validate: "BNPL providers optimize checkout conversion through point-of-sale financing",
    acknowledge: "Provides short-term liquidity and increases merchant GMV",
    reframe: "BNPL is a checkout feature, not a comprehensive financial product suite",
    specify: "Blostem provides the underlying infrastructure to offer sustainable savings products",
  },

  // 4. WEALTH / INVESTMENT
  broker: {
    strategicGoal: "Position as the infra supplier for high-yield cash-management",
    validate: "Brokerages optimize investing access and retail distribution",
    acknowledge: "Provides consumer-grade UX for wealth creation and trading",
    reframe: "Broker platforms sit above infra layers rather than replacing them",
    specify: "Blostem powers the infrastructure underneath savings products as a supplier to brokers",
  },
  wealth_platform: {
    strategicGoal: "Highlight the manufacturer-distribution bridge",
    validate: "Wealth platforms consolidate investment tracking and portfolio management",
    acknowledge: "Optimizes end-user wealth distribution and advisory",
    reframe: "Distribution platforms rely on underlying manufacturers to supply regulated products",
    specify: "Blostem provides the embeddable infrastructure that allows platforms to distribute FDs natively",
  },
  robo_advisor: {
    strategicGoal: "Enable algorithmic allocation to fixed-income assets",
    validate: "Robo-advisors automate wealth allocation and portfolio rebalancing",
    acknowledge: "Abstracts investment strategy into algorithmic asset management",
    reframe: "Algorithms require reliable, direct access to fixed-income asset manufacturers",
    specify: "Blostem provides direct API access to FDs for automated allocation",
  },

  // 5. DEPOSIT / SAVINGS SUPPLY SIDE
  fd_provider: {
    strategicGoal: "Connect asset manufacturers to digital distribution",
    validate: "FD providers manufacture the core fixed-income asset",
    acknowledge: "Provides the balance sheet and regulatory wrapper for deposits",
    reframe: "Banks manufacture the product but lack developer-friendly distribution infrastructure",
    specify: "Blostem acts as the technology bridge between FD manufacturers and digital platforms",
  },
  rd_provider: {
    strategicGoal: "Unify fragmented recurring deposit flows",
    validate: "RD providers manufacture recurring deposit products",
    acknowledge: "Handles recurring collections and yield generation",
    reframe: "Integrating direct RD flows from banks is highly fragmented and legacy-bound",
    specify: "Blostem unifies RD booking across multiple banks into a single modern API",
  },
  issuer: {
    strategicGoal: "Abstract legacy technology for faster platform launch",
    validate: "Issuers hold the ultimate regulatory license for financial instruments",
    acknowledge: "Carries the compliance, capital, and risk burden",
    reframe: "Issuers are not technology companies; direct integration is slow and rigid",
    specify: "Blostem abstracts legacy issuer technology for rapid distribution",
  },

  // 6. DISTRIBUTION LAYER
  marketplace: {
    strategicGoal: "Embedded journey vs redirect marketplace lead-gen",
    validate: "Marketplaces optimize discovery and comparison of financial products",
    acknowledge: "Drives top-of-funnel acquisition for banks and lenders",
    reframe: "Traditional marketplaces rely on redirecting users, losing the customer relationship",
    specify: "Blostem enables marketplaces to embed the actual booking journey",
  },
  distribution_api: {
    strategicGoal: "Embedded lifecycle management vs affiliate links",
    validate: "Distribution APIs provide access to third-party financial products",
    acknowledge: "Aggregates mutual funds, insurance, or credit into single APIs",
    reframe: "Many distribution APIs act as affiliate links rather than true embedded infrastructure",
    specify: "Blostem handles the entire lifecycle and ledgering of the deposit",
  },
  embedded_distribution: {
    strategicGoal: "Provide the compliant backend for point-of-need distribution",
    validate: "Embedded distribution puts financial products at the point of need",
    acknowledge: "Monetizes existing user bases through contextual finance",
    reframe: "Embedding finance requires robust backend compliance and multi-bank orchestration",
    specify: "Blostem provides the compliant backend rails for deposit distribution",
  },

  // 7. INSURANCE
  insurtech: {
    strategicGoal: "Complement insurance stacks with banking product layer",
    validate: "Insurtechs optimize underwriting, distribution, and claims processing",
    acknowledge: "Modernizes legacy insurance workflows and policy management",
    reframe: "Insurance infrastructure operates on different rails than core banking and deposits",
    specify: "Blostem provides the complementary banking product layer for insurtech platforms",
  },
  insurance_aggregator: {
    strategicGoal: "Expand lead-gen apps into asset-holding savings products",
    validate: "Insurance aggregators simplify policy comparison and purchasing",
    acknowledge: "Drives consumer transparency and lead generation for insurers",
    reframe: "Aggregators typically lack the infrastructure to hold assets or manage yield",
    specify: "Blostem enables aggregators to expand into savings with minimal infra overhead",
  },

  // 8. CORE BANKING / LEDGER
  core_banking: {
    strategicGoal: "Modern orchestration bridge for legacy core systems",
    validate: "Core banking systems provide the ultimate ledger of truth for financial institutions",
    acknowledge: "Handles fundamental account balances and ledger entries",
    reframe: "Core systems are inflexible and not designed for rapid third-party fintech embedding",
    specify: "Blostem acts as the orchestration layer between legacy cores and modern fintech frontends",
  },
  ledger_infra: {
    strategicGoal: "Regulated bank connectivity vs software-only ledgering",
    validate: "Ledger infrastructure provides scalable, immutable transaction recording",
    acknowledge: "Ensures financial data integrity and real-time balance tracking",
    reframe: "A ledger tracks money, but it doesn't connect you to the regulated banks that hold it",
    specify: "Blostem provides actual banking integrations, not just the software to track them",
  },

  // 9. COMPLIANCE / RISK
  kyc_aml: {
    strategicGoal: "Embed compliance into the full product lifecycle",
    validate: "KYC/AML tools optimize onboarding compliance and identity verification",
    acknowledge: "Specializes in fraud reduction and regulatory identity checks",
    reframe: "Identity verification is only one step of the BFSI product lifecycle",
    specify: "Blostem integrates compliance natively into the full lifecycle of FD/RD booking",
  },
  fraud_risk: {
    strategicGoal: "Verticalize risk controls into deposit orchestration",
    validate: "Fraud and risk platforms optimize transaction safety and anomaly detection",
    acknowledge: "Protects platforms from bad actors and financial loss",
    reframe: "Risk scoring is a horizontal tool, not a complete banking product infrastructure",
    specify: "Blostem embeds risk controls directly into the deposit orchestration flow",
  },
  regtech: {
    strategicGoal: "Automate reporting specifically for deposit orchestration",
    validate: "Regtech automates compliance reporting and regulatory adherence",
    acknowledge: "Reduces the operational burden of managing complex financial regulations",
    reframe: "Regtech reports on data, but doesn't orchestrate the underlying financial products",
    specify: "Blostem natively handles compliance specifically for FD/RD orchestration",
  },

  // 10. GLOBAL / EDGE CASES
  bigtech_finance: {
    strategicGoal: "B2B infra for platforms looking to match Bigtech UX",
    validate: "Bigtechs leverage massive distribution to offer commoditized finance",
    acknowledge: "Provides unparalleled consumer reach and UX",
    reframe: "Bigtechs partner with banks but rarely provide B2B infrastructure for others to build on",
    specify: "Blostem provides the B2B infrastructure to embed finance like a Bigtech",
  },
  crypto_fintech: {
    strategicGoal: "Regulated fiat certainty vs alternative yield rails",
    validate: "Crypto fintechs optimize decentralized assets and alternative yield",
    acknowledge: "Provides access to tokenized assets and blockchain rails",
    reframe: "Crypto rails lack the regulatory certainty and deposit insurance of traditional banking",
    specify: "Blostem provides access to regulated, insured banking products with fiat certainty",
  },
  cross_border_payments: {
    strategicGoal: "Domestic regulatory booking vs international fund movement",
    validate: "Cross-border platforms optimize FX and international settlement",
    acknowledge: "Reduces the friction and cost of moving money globally",
    reframe: "Moving money internationally does not solve local regulatory deposit booking",
    specify: "Blostem specializes in deep domestic banking infrastructure for deposits",
  }
};

export function getCategoryStrategy(category: BFSICategory | string): CategoryStrategy {
  if (category in CATEGORY_STRATEGIES) {
    return CATEGORY_STRATEGIES[category as BFSICategory];
  }
  return CATEGORY_STRATEGIES.banking_api_infra;
}
