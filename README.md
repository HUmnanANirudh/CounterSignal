# CounterSignal - Real-time Competitive Sales Engine

> AI-powered battlecard generator for BFSI AEs. **Accuracy > Coverage** — a battlecard that says "I don't know" is more valuable than one that confidently lies.

## Overview

CounterSignal transforms web data into sales-ready battlecards in under 30 seconds. Unlike generic AI tools, every output traces back to actual signals — no hallucinated positioning, no generic templates.

### Key Features

- **Signal-Indexed Primitives**: Objections, counters, landmines all derive from actual signal content
- **Compressed VARS**: 1-2 lines per section, each backed by signal evidence
- **Confidence Gating**: Low data quality → honest suppression, not generic content
- **Entity Resolution**: Verifies content substance, rejects noise ("Dodo Payments" ≠ "Dodo Deliveries")
- **Kill Switches**: Insufficient data stops the pipeline early, preventing hallucination

## Architecture

```
Input: Competitor Name
       ↓
[ENTITY RESOLUTION] Stage 0.5
  Verify entity, reject noise, map aliases
       ↓
[SEARCH] Tavily batched search (6 queries)
       ↓
[PREPROCESS] Rules-based extraction
  Pricing, complaints, reviews, negative signals
       ↓
[CLASSIFY] Multi-axis market role detection
  Product type, business role, market position
       ↓
[SIGNAL GATE] Kill switch at < 2 signals
       ↓
[EXTRACT] LLM Call 1 — structured intelligence
       ↓
[SIGNALS] Cross-type validation + citation mapping
       ↓
[CONFIDENCE GATE]
  < 0.7 → suppress VARS + objections
  < 0.5 → suppress landmines
       ↓
[PRIMITIVES] Signal-indexed derivation
  (no extra LLM call — ~1ms)
       ↓
[VARS] Compressed LLM Call 2 (conditional)
  1-2 lines per section, signal-backed
       ↓
[RENDER] Markdown + PDF output
```

**Target Latency: <30s**

## Core Design Principles

### 1. Signal-Indexed, Not Template-Based

Old approach:
```
category → template → fill blanks ❌
```

New approach:
```
signals → reasoning → output ✅
```

Every section traces to actual signal content. Example:

```typescript
// OLD (same for all companies with "regulatory" signal)
counter: "Regulatory issues compound compliance burden..."

// NEW (derived from actual signal)
signal: "₹500 crore RBI penalty on Razorpay"
counter: "Razorpay faced ₹500 crore RBI action — how does regulatory exposure affect your risk tolerance?"
```

### 2. No Hallucination Architecture

| Gate | Condition | Action |
|------|-----------|--------|
| Entity confidence | < 0.3 relevant docs | Return "insufficient entity grounding" |
| Pricing + Complaints | Both = 0 | Return "insufficient intelligence" |
| Signals | < 2 validated | Return "insufficient signal data" |
| Confidence | < 0.7 | Suppress VARS + objections |
| Confidence | < 0.5 | Suppress landmines |

### 3. Entity Resolution Layer

Verifies content substance before processing:

```
Input: "Dodo Payments"
Accept: inc42.com article about Dodo Payments fintech
Reject: "Dodo Deliveries" logistics article
Reject: "DODO crypto token" unrelated
Reject: Name-only mention without substantive content
```

## Pipeline Stages

### 0.5 Entity Resolution (`entity-resolution.ts`)
- Maps search query to verified entity with aliases + domain
- `resolveEntity()` returns canonical name, confidence, category hint
- `filterContentForEntity()` rejects noise before it enters pipeline
- Known entity database for major Indian fintechs

### 1. Search (`search.ts`)
- 6 queries: Reddit, "introducing", entity-anchored, reviews, startup news, financial news
- Authority tiers: independent BFSI fintech media > reviews > business news > forums > social
- Entity-filtered results: rejects sources without actual entity mention
- Two-pass selection: type diversity first, then highest-scoring

### 2. Preprocess (`preprocess.ts`)
Rules-based extraction (no LLM):
- **Pricing candidates**: Pattern matching for fees, costs, plans
- **Complaint sentences**: Requires 2+ pattern matches
- **Review blocks**: Sentences with "pros", "cons", "review"
- **Negative signals**: Auto-detected via regex (fraud, regulatory, financial, reliability, strategy drift)

### 3. Classify (`classify.ts`)
Multi-axis classification:
```typescript
{
  primary_layer: "payments" | "infra" | "issuer" | "distribution",
  business_model: "gateway" | "MoR" | "API_infra" | "NBFC",
  role_vs_blostem: "competitor" | "partner" | "irrelevant"
}
```

Decision tree:
1. Owns FD/loans? → ISSUER (partner)
2. Provides BFSI API rails? → INFRA (competitor)
3. Is marketplace? → AGGREGATOR (non-competitor)
4. Is consumer banking app? → END_PRODUCT (non-competitor)
5. Is payment gateway? → PAYMENT_GATEWAY (competitor)
6. Is wallet? → WALLET (competitor)

### 4. Extract (`extract.ts`)
**LLM Call 1**: Structured JSON extraction
- Pricing validation: rejects transaction models with fixed dollar entry prices
- Hallucination guards: rejects "9%", "8%" without context, "capped at $X" patterns
- No fallback content — weak data → kill switch

### 5. Signals (`signals.ts`)
**Cross-type validation**:
- Signals must appear in ≥2 domain types OR
- HIGH severity signals (trust_risk, regulatory, financial_health) bypass validation OR
- Single strong source (≥2 citations, same domain)

**Signal types** (not negative-only):
```typescript
type SignalType =
  | "trust_risk" | "regulatory" | "financial_health" | "reliability" | "strategy_drift"
  | "pricing_complaint" | "support_issue" | "integration_issue" | "onboarding_delay" | "quality_issue"
  | "positive" | "feature"
```

### 6. Deal Primitives (`deal-primitives.ts`)
**Signal-indexed derivation** — no extra LLM call (~1ms):

```typescript
deriveObjectionFromSignal(signal)  // Objection text from signal content
deriveCounterFromSignal(signal)     // Counter from signal, not template
deriveLandmineFromSignal(signal)    // Question tied to specific signal
deriveWinFromSignal(signal)        // "Why we win" from complaint
```

**Kill switch**: If signals = 0, all sections return empty/minimal — no generic fallback.

### 7. VARS (`vars-objections.ts`)
**Compressed VARS** — 1-2 lines per section:

```typescript
// Before: 4-8 lines per section, generic narrative
// After:
validate: "Buyer evaluating Razorpay despite regulatory signals."
acknowledge: "Strong developer experience."
reframe: "Regulatory expansion increases operational complexity."
specify: "Blostem removes this with fixed-cost BFSI infra."
```

**Rules**:
- Each section 1-2 lines MAX (< 50 words total)
- Each line traces to signal content
- temperature: 0.15 (deterministic compression)
- maxOutputTokens: 1024 (enforces compression)
- Signals < 2 → null VARS, not generic content

### 8. Confidence Gating (`index.ts`)

| Confidence | VARS | Objections | Landmines | Pricing Narrative |
|------------|------|------------|-----------|-------------------|
| ≥ 0.7 | ✅ | ✅ | ✅ | ✅ |
| 0.5-0.7 | ❌ | ✅ | ✅ | ✅ |
| < 0.5 | ❌ | ❌ | ❌ | honest "no data" |

## Source Authority Tiers

| Tier | Score | Domains |
|------|-------|---------|
| 1 | 10 | inc42.com, medianama.com |
| 2 | 9 | entrackr.com, dealstreet.in, vccircle.com, g2.com, capterra.com |
| 3 | 8 | moneycontrol.com, livemint.com, forbesindia.in |
| 4 | 7 | bloomberg.com, forbes.com, reddit.com |
| 5 | 4 | twitter.com, x.com |

**Note**: Competitor domains (razorpay.com, stripe.com) are biased — excluded from selection.

## Competitor Classification

| Category | Role | vs Blostem |
|----------|------|------------|
| PAYMENT_GATEWAY | Competitor | MDR + settlement complexity |
| WALLET | Competitor | Wallet MDR vs fixed infra cost |
| INFRA | Competitor | Generic infra vs FD/RD specialization |
| ISSUER | Partner | FD/NBFC products — supply-side |
| AGGREGATOR | Non-competitor | Marketplace, different problem |
| END_PRODUCT | Non-competitor | Consumer app, different buyer |

**Output modes**:
- **Competitor** → Battlecard (signal-indexed primitives + VARS)
- **Partner (ISSUER)** → Supply Card (what they offer, partnership Qs)
- **Non-competitor** → Strategic Context (market role, disqualify Qs)

## Setup

### Environment Variables

```bash
TAVILY_API_KEY=your_tavily_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Installation & Running

```bash
bun install
bun run dev
```

Open http://localhost:3000, enter competitor name.

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
- `chunk`: Markdown content chunks (streamed)
- `done`: Final battlecard object
- `error`: Error messages

## Project Structure

```
src/
├── app/
│   ├── api/battlecard/route.ts   # SSE streaming endpoint
│   ├── layout.tsx
│   └── page.tsx                   # Main UI
├── components/
│   ├── battlecard-display.tsx     # Structured battlecard UI
│   └── ui/                        # shadcn components
├── lib/
│   ├── blostem-profile.ts         # Blostem static config
│   └── pipeline/
│       ├── entity-resolution.ts   # Entity verification
│       ├── classify.ts           # Multi-axis classification
│       ├── deal-primitives.ts    # Signal-indexed primitives
│       ├── extract.ts            # LLM Call 1
│       ├── index.ts              # Orchestrator + confidence gating
│       ├── preprocess.ts         # Rules-based extraction
│       ├── render.ts             # Markdown rendering
│       ├── search.ts             # Tavily search
│       ├── signals.ts            # Signal validation
│       └── vars-objections.ts    # Compressed VARS
└── types/
    └── battlecard.ts             # Schema definitions
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

**Caps**:
- ≤4 weak signals → confidence capped at 90%
- Signal count ≤4 → effective confidence capped at 85%

## What Changed (2026-05-05)

| Before | After |
|--------|-------|
| Template-based primitives | Signal-indexed derivation |
| Verbose VARS (4-8 lines/section) | Compressed VARS (1-2 lines) |
| Generic entity filtering | Entity resolution layer |
| No confidence gating | Hard suppression at < 0.7 |
| Negative-only signals | Balanced signal mix |
| Fallback hallucination | Kill switches |

## Dependencies

- **@ai-sdk/google**: Gemini LLM
- **@tavily/core**: Web search
- **ai**: Text generation SDK
- **jspdf**: PDF generation
- **react-markdown**: Markdown rendering