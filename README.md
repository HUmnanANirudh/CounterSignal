# CounterSignal — Battlecard Generator for BFSI AEs

> "A battlecard that says 'I don't know' is more valuable than one that confidently lies."

## The Problem

Account Executives in BFSI spend hours researching competitors — and most still rely on generic templates that contradict what customers actually say. The cost? Lost credibility in the room when a customer pushes back with real data.

Hallucinated battlecards don't just hurt positioning — they erode trust with the one person who matters: the buyer evaluating your solution.

## The Solution

CounterSignal is a real-time competitive intelligence engine that transforms web data into AE-ready battlecards in under 60 seconds. Every output traces back to actual signals — no hallucinated positioning, no generic templates.

### What We Built

A pipeline that:
1. Researches a named fintech/BFSI competitor via live web search
2. Classifies the entity across 30+ strict BFSI categories (e.g., `payment_gateway`, `merchant_of_record`)
3. Extracts buyer-operational truths, pricing posture, and strategic overlap
4. Maps findings to Category-Aware Strategy Templates to ensure semantic consistency
5. Synthesizes AE primitives (VARS, landmines, FUD counters) based on operational implications
6. Generates a structured battlecard with dynamic confidence scoring

### Why It's Different

Most AI tools optimize for coverage. We optimize for accuracy.

| Tool Behavior | CounterSignal Behavior |
|---------------|----------------------|
| Fills in generic content when data is weak | Suppresses sections, shows "insufficient data" |
| Assumes all competitors need the same battlecard | Routes to supply card, strategic context, or full battlecard based on market role |
| Shows confidence scores without acting on them | Gating sections based on confidence thresholds |

## Impact

- **Latency**: <60 seconds from competitor name to battlecard
- **Confidence-gated output**: Low data quality → graceful degradation, not hallucination
- **Source-verified**: Every claim traces to actual citations
- **Path-routing**: Different outputs for competitors, partners, and non-competitors

## Technical Architecture

```
Competitor Name → Entity Resolution → Web Search → Preprocessing
                                                       ↓
                                              Classification (30+ Categories)
                                                       ↓
                            ┌──────────────────────────┼──────────────────────────┐
                            ↓                          ↓                          ↓
                    Extraction Layer           Supply-Side Card           Strategic Context
               (Operational Implications)      (NBFCs, FD)                (aggregators)
                            ↓
                    Category Strategy Map
                 (Semantic Synthesis & VARS)
                            ↓
               AE Battlecard & Deal Primitives
                    (w/ Confidence Score)
```

### Key Design Decisions

**No Hallucination Architecture**
- Kill switches at entity resolution (< 0.3 confidence)
- Minimum document threshold before processing
- Signal validation requiring cross-domain evidence
- Confidence-gated section suppression (VARS, objections, landmines)

**Contextual Polarity for Signals**
Negative signals are not captured using naive keyword matches. "Fraud prevention" is a feature; "₹40Cr fraud penalty" is a risk. Signals are evaluated using contextual polarity arrays to prevent features from polluting objection workflows.

**Signal-Indexed Derivation**
Objections, counters, and landmines all derive from actual signal content focusing on architectural lock-in, custody constraints, and liability transfers:

```
Signal: "Merchant of record abstracts payment flow"
Landmine: "Who owns the merchant relationship when disputes occur under the MoR structure?"
```

**Holistic Confidence Scoring**
Confidence is no longer just "signal count". The formula weights pipeline health holistically:
`confidence = (entityCertainty * 0.3) + (classificationCertainty * 0.3) + (extractionQuality * 0.2) + (signalQuality * 0.2)`

**Category-Level Synthesis (VARS)**
To prevent repetitive, generic text across different competitors, the system maps the entity to one of 30+ strict BFSI categories (e.g., `broker`, `wallet`, `merchant_of_record`). `Reframe` and `Specify` statements are pulled from deterministic category playbooks to ensure *consistent category semantics*, while the LLM focuses only on extracting the competitor's specific *operational implications*.

## Project Structure

```
src/
├── app/
│   ├── api/battlecard/route.ts   # SSE streaming endpoint
│   ├── page.tsx                  # UI
│   └── layout.tsx
├── components/                    # UI components
├── hooks/
│   └── useBattlecard.ts          # Battlecard React hook
├── lib/
│   ├── blostem-profile.ts        # Blostem profile
│   └── pipeline/                # Core pipeline
│       ├── category-strategies.ts # Category-aware semantic playbooks
│       ├── index.ts             # Orchestrator + Synthesis
│       ├── search.ts            # Web search
│       ├── preprocess.ts        # Rules-based extraction
│       ├── classify.ts          # Market role classification
│       ├── extract.ts           # Operational implication extraction
│       ├── signals.ts           # Contextual polarity & Confidence
│       ├── normalize.ts         # LLM normalization
│       ├── deal-primitives.ts   # AE primitives (Landmines, Objections)
│       ├── render.ts            # Markdown rendering
│       ├── context-builders.ts  # Supply/non-comp cards
│       └── entity-resolution.ts # Entity verification
└── types/                       # TypeScript definitions
```

## Tech Stack

- **Runtime**: Bun + Next.js
- **AI**: Google Gemini via `ai` SDK + `@ai-sdk/google`
- **Search**: Tavily via `@tavily/core`
- **UI**: React 19, shadcn/ui, Tailwind CSS v4, base-ui, TipTap editor
- **PDF Export**: jsPDF
- **Markdown**: react-markdown + remark-gfm

## Setup

```bash
bun install
bun run dev
```

Requires:
- `TAVILY_API_KEY`
- `GEMINI_API_KEY`

## API

```bash
POST /api/battlecard
{ "competitorName": "Razorpay" }
```

Returns SSE stream with battlecard sections, confidence score, and citations.