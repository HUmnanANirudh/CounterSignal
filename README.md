# CounterSignal - Real-time Competitive Sales Engine

> AI-powered battlecard generator for BFSI AEs that transforms web data into VARS-aligned sales intelligence in under 60 seconds.

## Overview

CounterSignal is a real-time competitive intelligence tool designed for Blostem's Account Executives. It takes a competitor name as input and generates comprehensive battlecards with competitor intelligence, VARS positioning, and objection handling.

### Key Features

- **AE-Aligned Output**: Deal primitives (objections, counters, landmines, FUD flips) — not research summaries
- **VARS Framework**: Supporting layer for Validate → Acknowledge → Reframe → Specify
- **Real-time Research**: Web search via Tavily + LLM extraction via Gemini
- **Source Trust System**: Dynamic authority-based source selection
- **Cross-Type Validation**: Signals validated across multiple domain types
- **PDF Generation**: One-click battlecard export

## Architecture

```
[Input: Competitor Name]
        ↓
[Stage 1: SEARCH] Tavily batched search (8 queries)
        ↓
[Stage 2: SELECT] Authority-weighted scoring → top 10 sources
        ↓
[Stage 3: PREPROCESS] Rules-based extraction
        ↓
[Stage 4: EXTRACT] LLM structured extraction
        ↓
[Stage 5: SIGNALS] Cross-type signal validation
        ↓
[Stage 5.5: DEAL PRIMITIVES] Rule-based AE primitives derivation ← NEW
        ↓
[Stage 6: VARS] LLM generation (supporting layer)
        ↓
[Stage 7: RENDER] Markdown + PDF output
```

## Pipeline Stages

### 1. Search (`src/lib/pipeline/search.ts`)
- Batched queries targeting: startup media, review platforms, business news, forums
- Authority tiers: independent BFSI media (10) > startup media + reviews (9) > business news (8) > forums (5)
- Content quality assessment: rejects SEO aggregators, scraped content, mirrors
- Competitor domains (razorpay.com, stripe.com, etc.) heavily deprioritized as biased sources
- Domain normalization: trusts `.com`, `inc42.com`, `medianama.com` over `.gov.ng`, `bills.com.au`

### 2. Selection (`selectDiversifiedResults`)
- Two-pass algorithm ensuring type diversity
- Targets: news (3), review (2), forum (2), independent (3)
- Authority threshold: 0.4 minimum
- Max 3 results per domain
- Competitor domains deprioritized (biased sources)

### 3. Preprocess (`src/lib/pipeline/preprocess.ts`)
- Rules-based extraction of:
  - Pricing candidates
  - Complaint sentences
  - Review blocks
  - Feature mentions
  - Dates

### 4. Extract (`src/lib/pipeline/extract.ts`)
- LLM Call 1: Structured JSON extraction
- Pricing validation: transaction models cannot have fixed dollar entry prices
- Retry logic: 1 retry on JSON parse failure
- Hallucination guardrails for pricing patterns

### 5. Signal Validation (`src/lib/pipeline/signals.ts`)
- Cross-type validation: signals must appear in ≥2 domain types
- Domain types: independent, review, news, forum
- Content quality scoring with Indian context bonuses

### 5.5. Deal Primitives (`src/lib/pipeline/deal-primitives.ts`) ← NEW
- **Competitor Type Detection**: wallet | gateway | infra | NBFC → type-specific attack vectors
- **Implicit Complaint Expansion**: fraud, regulatory, financial health signals → deal weapons
- **Signal Traceability**: shows signal → weapon reasoning for demo differentiation
- **Competitor-Specific Dismisses**: not template leakage, actual competitor type-based
- **Trigger-Based Selling**: `compete_aggressively_when` for deal timing
- No additional LLM calls (+1-2ms latency only)

### 6. VARS Generation (`src/lib/pipeline/vars-objections.ts`)
- LLM Call 2: VARS layer + objection handling (supporting layer)
- Grounded in extracted signals with citation IDs
- Sanitization of hallucinated pricing patterns

### 7. Render (`src/lib/pipeline/render.ts`)
- Markdown template rendering
- PDF generation via jsPDF

## Source Authority Tiers

> **Note:** Competitor domains (razorpay.com, stripe.com, etc.) are **biased sources** — they won't publish negative info about themselves. Independent sources are prioritized.

| Tier | Authority | Domains | Rationale |
|------|-----------|---------|------------|
| 1 | 10 | inc42.com, medianama.com | Independent BFSI fintech intelligence |
| 2 | 9 | entrackr.com, dealstreet.in, vccircle.com, g2.com, capterra.com | Startup media + user reviews |
| 3 | 8 | moneycontrol.com, livemint.com, forbesindia.in | Independent business news |
| 4 | 7 | bloomberg.com, forbes.com, economictimes.indiatimes.com | Global news (lower Indian context) |
| 5 | 7 | reddit.com | Forum discussions (user ground truth) |
| 6 | 5 | trustpilot.com, techcrunch.com | Reviews + tech news |
| 7 | 4 | twitter.com, x.com | Social (unverified, real-time) |

## Low-Quality Patterns (Auto-Rejected)

URL/Title patterns indicating SEO scrapers:
- "comprehensive guide", "complete guide", "ultimate guide"
- "alternatives", "pricing calculator"
- "vs X vs Y", "compare*.com"
- Government mirrors (gov.*), FTP mirrors, scribd, bills.com.au

## VARS Framework

The VARS (Validate → Acknowledge → Reframe → Specify) framework provides sales-ready positioning:

1. **Validate**: Why would a prospect consider this competitor?
2. **Acknowledge**: What does this competitor do well?
3. **Reframe**: What tradeoffs or weaknesses exist?
4. **Specify**: What does Blostem uniquely provide?

## Data Gaps Tracked

- `limited_source_diversity`: <2 unique domains
- `pricing_not_found`: No pricing candidates found
- `complaints_not_found`: No complaint sentences found
- `reviews_not_found`: No review blocks found
- `low_confidence_signal`: Confidence score <0.3

## Setup

### Environment Variables

Create `.env.local` in the project root:

```bash
TAVILY_API_KEY=your_tavily_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Installation

```bash
bun install
bun run dev
```

### API Endpoint

```bash
POST /api/battlecard
Content-Type: application/json

{
  "competitorName": "Razorpay"
}
```

Response: Server-Sent Events stream with:
- `status`: Pipeline stage updates
- `chunk`: Markdown content chunks
- `done`: Final battlecard object
- `error`: Error messages

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── battlecard/
│   │       └── route.ts      # SSE streaming endpoint
│   └── page.tsx              # Main UI
├── components/
│   ├── battlecard-display.tsx
│   └── pipeline-indicator.tsx
├── lib/
│   ├── blostem-profile.ts    # Blostem company profile
│   └── pipeline/
│       ├── deal-primitives.ts # AE deal primitives derivation
│       ├── extract.ts        # LLM extraction
│       ├── index.ts          # Pipeline orchestrator
│       ├── preprocess.ts     # Rules-based preprocessing
│       ├── render.ts         # Markdown rendering
│       ├── search.ts         # Web search + selection
│       ├── signals.ts        # Signal derivation + validation
│       └── vars-objections.ts # VARS generation
└── types/
    ├── battlecard.ts
    └── pipline.ts
```

## Confidence Scoring

```
score = (0.35 × sourceCountScore)
      + (0.25 × domainDiversityScore)
      + (0.20 × signalDiversityScore)
      + (0.10 × recencyScore)
      + (0.10 × domainTypeCoverage)
```

Factors:
- Source count (need 6+ for max)
- Unique domains (need 3+ for max)
- Unique domain types (need review + news for good coverage)
- Signal diversity

## Battlecard Schema

```typescript
interface Battlecard {
  competitor: string;
  generatedAt: string;
  researchDurationMs: number;
  competitor_summary: string;
  positioning: { tagline: string; targetSegments: string[]; differentiators: string[] };
  pricing_posture: { model: string; entryPrice: string; tiers: PricingTier[]; opacity: "clear" | "opaque" };
  recent_moves: Array<{ name: string; date: string; impact: "high" | "medium" | "low" }>;
  customer_truths: { positives: string[]; negatives: string[]; keyComplaints: string[] };

  // Legacy VARS layer (backwards compatibility)
  VARS_layer: VARSLayer;
  objection_handling: ObjectionHandling[];

  // NEW: AE-Aligned Battlecard Layer (primary output)
  AE_BATTLECARD: AE_BATTLECARD;

  sourceMap: Record<string, string[]>;
  citations: Citation[];
  confidence: { score: number; factors: string[] };
  dataGaps: string[];
}

// NEW: AE-Aligned Battlecard
interface AE_BATTLECARD {
  company_overview: string;              // 1-2 lines, AE-ready
  quick_dismisses: string[];             // 1-liners for fast call use
  objection_handling: Array<{            // Top 3 objections with counters
    objection: string;
    counter: string;
    evidence: string[];                  // Citation IDs
  }>;
  why_we_win: string[];                  // Real outcomes, not features
  why_we_lose: string[];                 // Situational weaknesses
  pricing_positioning: string;           // Comparison guidance
  landmines: string[];                   // Questions to expose competitor gaps
  FUD_responses: string[];               // Scripts to flip FUD
  proof_points: string[];                // Evidence-backed speakable points
}
```
## Dependencies

- **@ai-sdk/google**: Gemini LLM integration
- **@tavily/core**: Web search
- **jspdf**: PDF generation
- **@tanstack/react-query**: React state management
- **react-markdown**: Markdown rendering

## License

Proprietary - Blostem Internal Use Only
