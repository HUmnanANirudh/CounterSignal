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
2. Extracts positioning, pricing posture, and customer sentiment
3. Validates signals across multiple sources and assigns confidence scores
4. Generates a structured battlecard with VARS positioning, objections, and landmines
5. Gracefully degrades when data is sparse — never making up content

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
                                              Classification (competitor/partner/supply/non-comp)
                                                       ↓
                            ┌──────────────────────────┼──────────────────────────┐
                            ↓                          ↓                          ↓
                    Full Battlecard           Supply-Side Card           Strategic Context
                    (competitor)              (NBFCs, FD)                (aggregators)
                            ↓
                    Extract → Signals → Normalize → Primitives → VARS
                            ↓
                    Render + Citations + Confidence Score
```

### Key Design Decisions

**No Hallucination Architecture**
- Kill switches at entity resolution (< 0.3 confidence)
- Minimum document threshold before processing
- Signal validation requiring cross-domain evidence
- Confidence-gated section suppression (VARS, objections, landmines)

**Signal-Indexed Derivation**
Objections, counters, landmines all derive from actual signal content — not templates:

```
Signal: "₹500 crore RBI penalty on Razorpay"
Objection: "They've faced regulatory action — what does that mean for your compliance?"
Landmine: "How has Razorpay's regulatory exposure affected their enterprise customers?"

vs.

Template: "Regulatory issues may affect customer trust" ← same for every company
```

**LLM Normalization**
When raw signals are weak or fragmented, a targeted LLM call consolidates them into coherent summaries — applied sparingly, not as a fallback for missing data.

**Deterministic VARS Synthesis**
VARS positioning synthesizes from extracted data rather than a separate LLM call — faster, more consistent, traces directly to source material.

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
│       ├── index.ts             # Orchestrator + VARS synthesis
│       ├── search.ts            # Web search
│       ├── preprocess.ts        # Rules-based extraction
│       ├── classify.ts          # Market role classification
│       ├── extract.ts           # LLM extraction
│       ├── signals.ts           # Signal validation
│       ├── normalize.ts         # LLM normalization
│       ├── deal-primitives.ts   # AE primitives
│       ├── render.ts            # Markdown rendering
│       ├── context-builders.ts  # Supply/non-comp cards
│       └── entity-resolution.ts # Entity verification
└── types/                       # TypeScript definitions
```

## Tech Stack

- **Runtime**: Bun + Next.js
- **AI**: Google Gemini via @ai-sdk/google
- **Search**: Tavily Web Search
- **UI**: React 19, shadcn/ui, Tailwind CSS v4

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