# CounterSignal - Real-time Competitive Sales Engine

> AI-powered battlecard generator for BFSI AEs that transforms web data into sales-ready intelligence in under 60 seconds.

## Overview

CounterSignal is a real-time competitive intelligence tool for Blostem's Account Executives. Enter a competitor name and get a complete battlecard with competitor intelligence, AE-aligned deal primitives, VARS positioning, and objection handling.

### Key Features

- **AE-Aligned Output**: Deal primitives (objections, counters, landmines, FUD flips, quick dismisses) — not research summaries
- **VARS Framework**: Validate → Acknowledge → Reframe → Specify positioning
- **Real-time Research**: Tavily web search + Gemini LLM extraction
- **Source Trust System**: Dynamic authority-based source selection (independent media prioritized over competitor domains)
- **Cross-Type Signal Validation**: Signals validated across multiple source types before inclusion
- **Competitor vs Non-Competitor Detection**: Automatically classifies brokers, lenders, insurtech as non-competitors
- **PDF Generation**: One-click battlecard export

## Architecture

```
[Input: Competitor Name]
        ↓
[Stage 1: SEARCH] Tavily batched search (6 queries)
        ↓
[Stage 2: SELECT] Authority-weighted scoring → top 10 diverse sources
        ↓
[Stage 3: PREPROCESS] Rules-based extraction (pricing, complaints, reviews, negative signals)
        ↓
[Stage 4: CLASSIFY] Competitor type detection + competitor/non-competitor gate
        ↓
[Stage 5: EXTRACT] LLM Call 1 — structured competitor intelligence
        ↓
[Stage 6: DERIVE] Cross-type signal validation + citation mapping
        ↓
[Stage 7: PRIMITIVES] Rule-based AE primitives (no extra LLM call)
        ↓
[Stage 8: VARS] LLM Call 2 — VARS + objections
        ↓
[Stage 9: RENDER] Markdown + PDF output
```

**Target Latency: <60s** — search(8-12s) + preprocess(2s) + extract(5-8s) + derive(1s) + primitives(1s) + vars(5-8s) + render(2s)

## Pipeline Stages

### 1. Search (`src/lib/pipeline/search.ts`)
- 6 queries targeting: startup media, review platforms, business news, forums, Reddit
- Authority tiers: independent BFSI fintech media (10) > reviews + startup media (9) > business news (8) > forums (7) > social (4)
- Content quality assessment: rejects SEO aggregators, scraped content, government mirrors
- **Competitor domains deprioritized** — they won't publish negative info about themselves
- Two-pass selection: first ensures type diversity, then fills with highest-scoring

### 2. Preprocess (`src/lib/pipeline/preprocess.ts`)
Rules-based extraction of:
- **Pricing candidates**: Patterns for pricing, fees, costs, plans
- **Complaint sentences**: Requires 2+ pattern matches for confidence
- **Review blocks**: Sentences containing "pros", "cons", or "review"
- **Feature mentions**: Sentences with "feature", "integrat", "capabilit"
- **Negative signals**: Auto-detected via regex (fraud, regulatory, financial health, reliability, strategy drift)
- **Dates**: Normalized date patterns for recent moves tracking

### 3. Classify (`src/lib/pipeline/classify.ts`)
- **Competitor Detection**: payment gateway, wallet, banking API, NBFC → direct competitors
- **Non-Competitor Gate**: broker, lender, insurtech → non-competitor path with disqualifying questions
- Pattern-based classification using category signals, not hardcoded company names
- Non-competitor context includes: why not a competitor, where they fit, how to position Blostem

### 4. Extract (`src/lib/pipeline/extract.ts`)
- **LLM Call 1**: Structured JSON extraction
- Pricing validation: transaction models cannot have fixed dollar entry prices
- Hallucination guardrails: rejects "9%", "8%" without specific context, "capped at $X" patterns
- Fallback content fetch if preprocessing yields weak signals

### 5. Signal Derivation (`src/lib/pipeline/signals.ts`)
- **Cross-type validation**: signals must appear in ≥2 domain types (independent, review, news, forum)
- HIGH severity signals (trust_risk, regulatory, financial_health) bypass cross-type validation
- Citation mapping: each signal linked to source citations
- Confidence scoring: based on source count, domain diversity, signal strength, recency

### 6. Deal Primitives (`src/lib/pipeline/deal-primitives.ts`)
- **Competitor Type Detection**: auto-detects wallet | gateway | infra | NBFC → type-specific attack vectors
- **Signal-based Objections**: prioritizes trust/risk signals, generates counters with citation references
- **Quick Dismisses**: max 2, ≤12 words, no citations (for fast call use)
- **Landmines**: aggressive questions tied to real signals to expose competitor gaps
- **FUD Responses**: pre-built counters for competitor FUD
- **No additional LLM calls** — rule-based derivation adds ~1ms latency

### 7. VARS Generation (`src/lib/pipeline/vars-objections.ts`)
- **LLM Call 2**: VARS layer + objection handling
- Category-aware prompts (payment gateway vs wallet vs infra contexts)
- Citation enforcement: all counters must reference valid citation IDs
- Pricing hallucination sanitization

### 8. Render (`src/lib/pipeline/render.ts`)
- Markdown template with 40-line hard limit
- Structured UI rendering with collapsible sections
- PDF generation via jsPDF

## Source Authority Tiers

| Tier | Score | Domains | Rationale |
|------|-------|---------|------------|
| 1 | 10 | inc42.com, medianama.com | Independent BFSI fintech intelligence |
| 2 | 9 | entrackr.com, dealstreet.in, vccircle.com, g2.com, capterra.com | Startup media + user reviews |
| 3 | 8 | moneycontrol.com, livemint.com, forbesindia.in | Independent business news |
| 4 | 7 | bloomberg.com, forbes.com, reddit.com | Global news + forum discussions |
| 5 | 4 | twitter.com, x.com | Social (unverified, real-time) |

**Note:** Competitor domains (razorpay.com, stripe.com, etc.) are biased sources — deprioritized in selection.

## Low-Quality Patterns (Auto-Rejected)

URL/Title patterns indicating SEO scrapers or low-value content:
- "comprehensive guide", "complete guide", "ultimate guide"
- "alternatives", "pricing calculator", "vs X vs Y"
- Government mirrors (gov.*), FTP mirrors, scribd, bills.com.au

## Competitor Classification

Categories detected via pattern matching:

| Category | Is Competitor | Rationale |
|----------|---------------|-----------|
| PAYMENT_GATEWAY | ✅ Yes | Direct overlap with Blostem's BFSI infra layer |
| WALLET | ✅ Yes | Wallet MDR + settlement complexity vs infra predictability |
| BANKING_API | ✅ Yes | Overlapping BFSI infra use cases |
| NBFC | ✅ Yes | Overlapping compliance and deposit product space |
| BROKER | ❌ No | Retail investing focus — different buyer, different use case |
| LENDER | ❌ No | Credit/lending focus — different regulatory path |
| INSURTECH | ❌ No | Insurance focus — different product lifecycle |

Non-competitors receive: disqualifying questions, positioning guidance, overlap analysis.

## VARS Framework

The VARS (Validate → Acknowledge → Reframe → Specify) framework provides sales-ready positioning:

1. **Validate**: Why would a prospect consider this competitor?
2. **Acknowledge**: What does this competitor do well in the payment layer?
3. **Reframe**: Where payment-layer complexity creates hidden costs (MDR, settlement, reconciliation)?
4. **Specify**: How infra-layer removes payment complexity for BFSI products?

## Data Gaps Tracked

- `limited_source_diversity`: <2 unique domains
- `pricing_not_found`: No pricing candidates found
- `complaints_not_found`: No complaint sentences found
- `low_confidence_signal`: Confidence score <0.3
- `weak_signals_low_confidence`: <3 validated signals

## Setup

### Environment Variables

Create `.env.local` in the project root:

```bash
TAVILY_API_KEY=your_tavily_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Installation & Running

```bash
bun install
bun run dev
```

Open http://localhost:3000, enter a competitor name (e.g., "Razorpay", "Plaid", "Adyen"), and click Generate.

### API Endpoint

```bash
POST /api/battlecard
Content-Type: application/json

{
  "competitorName": "Razorpay"
}
```

Response: Server-Sent Events stream with:
- `status`: Pipeline stage updates (searching, preprocessing, extracting, deriving, primitives, vars, rendering)
- `chunk`: Markdown content chunks (streamed progressively)
- `done`: Final battlecard object
- `error`: Error messages

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── battlecard/
│   │       └── route.ts          # SSE streaming endpoint
│   ├── layout.tsx
│   └── page.tsx                  # Main UI
├── components/
│   ├── battlecard-display.tsx    # Structured battlecard UI
│   ├── pipeline-indicator.tsx    # Live pipeline stage display
│   └── ui/                       # shadcn UI components
├── lib/
│   ├── blostem-profile.ts       # Blostem company profile (static config)
│   └── pipeline/
│       ├── classify.ts          # Competitor type detection
│       ├── deal-primitives.ts    # AE-aligned battlecard derivation
│       ├── extract.ts           # LLM extraction (Call 1)
│       ├── index.ts             # Pipeline orchestrator
│       ├── preprocess.ts        # Rules-based preprocessing
│       ├── render.ts           # Markdown rendering
│       ├── search.ts          # Tavily search + source selection
│       ├── signals.ts         # Signal derivation + validation
│       └── vars-objections.ts  # VARS generation (Call 2)
└── types/
    ├── battlecard.ts            # Battlecard schema
    └── pipline.ts              # Pipeline stage types
```

## Confidence Scoring

```
score = (0.30 × sourceCountScore)
      + (0.20 × domainDiversityScore)
      + (0.15 × signalDiversityScore)
      + (0.20 × signalStrengthScore)
      + (0.10 × recencyScore)
      + (0.05 × domainTypeCoverage)
      + severityBonus
```

**Caps:**
- ≤4 weak signals → confidence capped at 90%
- Signal count ≤4 → effective confidence capped at 85%

## Battlecard Schema

```typescript
interface Battlecard {
  competitor: string;
  generatedAt: string;
  researchDurationMs: number;

  positioning: { tagline: string; targetSegments: string[]; differentiators: string[] };
  pricing_posture: { model: string; entryPrice: string; tiers: PricingTier[]; opacity: "clear" | "opaque" };
  recent_moves: Array<{ name: string; date: string; impact: "high" | "medium" | "low" }>;
  customer_truths: { positives: string[]; negatives: string[]; keyComplaints: string[] };

  // Legacy VARS layer (backwards compatibility)
  VARS_layer: VARSLayer;
  objection_handling: ObjectionHandling[];

  // AE-Aligned Battlecard (primary output)
  AE_BATTLECARD: AE_BATTLECARD;

  signals: Signal[];
  sourceMap: Record<string, string[]>;
  citations: Citation[];
  confidence: { score: number; factors: string[] };
  dataGaps: string[];
}

interface AE_BATTLECARD {
  company_overview: string;
  competitor_type: "wallet" | "gateway" | "infra" | "NBFC" | "unknown";
  category_contrast: string;
  quick_dismisses: string[];                    // Max 2, ≤12 words, no citations
  objection_handling: Array<{
    objection: string;
    counter: string;
    evidence: string[];                        // Citation IDs
  }>;
  why_we_win: string[];
  why_we_lose: string[];
  pricing_positioning: string;
  landmines: string[];                         // Questions to expose gaps
  FUD_responses: string[];
  proof_points: string[];
  compete_aggressively_when: string[];
  signal_trace: Array<{ signal: string; weapon: string; type: string }>;
}
```

## Dependencies

- **@ai-sdk/google**: Gemini LLM integration
- **@tavily/core**: Web search
- **ai**: Generative AI SDK for text generation
- **jspdf**: PDF generation
- **@tanstack/react-query**: React state management
- **react-markdown**: Markdown rendering
- **lucide-react**: Icons