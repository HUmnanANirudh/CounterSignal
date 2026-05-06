# CounterSignal — Battlecard Generator for BFSI AEs

> "A battlecard that says 'I don't know' is more valuable than one that confidently lies."

## The Problem

Account Executives in BFSI spend hours researching competitors — and most still rely on generic templates that contradict what customers actually say. The cost? Lost credibility in the room when a customer pushes back with real data.

Hallucinated battlecards don't just hurt positioning — they erode trust with the one person who matters: the buyer evaluating your solution.

## The Solution

CounterSignal is a GTM intelligence engine that transforms web signals into decision-oriented battlecards. Every output traces back to source-verified evidence, arbitrated through a multi-factor confidence model.

### GTM Capabilities

A pipeline that goes beyond raw extraction into **Strategic Intelligence**:
1. **Signal Arbitration**: Automatically resolves contradictions (e.g., "easy setup" vs "complex integration") using weighted source authority.
2. **Strategic Overlap Matrix**: Maps competitor capabilities against Blostem's core BFSI infrastructure layer across 5 dimensions.
3. **Decision Orientation**: Explicitly guides AEs on when to "Push Aggressively" vs "Avoid Competing" based on extracted deal patterns.
4. **Source Authority Weighting**: Propagates trust from high-signal sources (Bloomberg, Reuters, Inc42) while discounting social noise.
5. **Anti-Genericity Engine**: Enforces semantic diversity across all sections to eliminate generic prose and repetitive "fluff".

### Why It's Different

| Tool Behavior | CounterSignal Behavior |
|---------------|----------------------|
| Naive Keyword Matches | Contextual Polarity (Risk vs Feature detection) |
| Flat Confidence Scores | Multi-factor Scoring (Entity, Class, Extraction, Authority, Strategy Fit) |
| Signal Volume Bias | Source-Weighted Arbitration (Trusting experts over noise) |
| Generic Objections | Signal-Indexed Primitives (Derived from architectural implications) |

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
                (w/ Confidence Score & Matrix)
```

### Key Design Decisions

**Signal Arbitration & Contradiction Resolution**
The system detects conflicting claims in extracted data. Instead of surfacing contradictions, it arbitrates using **Source Authority Weighting**. If a Bloomberg profile cites complexity while a marketing landing page claims "ease of use," the system favors the high-authority risk signal for AE safety.

**Strategic Overlap Matrix**
Moves beyond binary competitor classification to model specific capability overlaps:
- **Payments / BFSI Infra / Custody / Compliance / Lending**
Renders as a high-readability matrix to help AEs identify the exact point of attack.

**Holistic Multi-Factor Confidence Scoring**
The confidence score is no longer a simple signal count. It's an aggregate of pipeline health:
`Score = (Entity 25%) + (Classification 25%) + (Extraction 20%) + (Signal Authority 20%) + (Strategy Fit 10%) - Data Gap Penalties`

**Semantic Diversity Enforcement**
An anti-genericity circuit filters semantically redundant phrases across objections, landmines, and customer truths, ensuring the final 1,200-line output is high-density and execution-ready.

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