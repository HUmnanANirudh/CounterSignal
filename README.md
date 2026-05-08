# CounterSignal
An AI-Driven GTM Intelligence Engine for BFSI Infrastructure

## The Problem

Fintech AEs and Growth leads spend 10+ hours a week researching competitors before a high-stakes deal. Traditional RAG (Retrieval-Augmented Generation) tools often fail them by:

1. **RAG Dumps**: Providing a list of raw citations instead of a synthesized strategy.
2. **Noise Contamination**: Including irrelevant PR fluff, image paths, and social media hashtags.
3. **Lack of Implication**: Telling you what a competitor *has*, but not why it *matters* to your deal.

Fintech teams don't need more data; they need **Analyst-Grade Operational Intelligence**.

---

## What I Built

A category-aware intelligence engine that converts raw web data into operator-ready battlecards in under 60 seconds.

**Input**: Competitor name (e.g., "Paytm", "Setu", "Razorpay")

**Output**: A 1-page executive battlecard with synthesized themes, capability matrices, and persona-specific counters.

---

## Why CounterSignal?

- **Strategic Implication Modeling**: Decouples raw signals from prose to model the "So What?" of every competitor move.
- **Truth Calibration**: Split confidence modeling (Entity vs. Strategic) protects you from hallucinations in low-data scenarios.
- **Cynical GTM Realism**: Acknowledges "Why We Lose" to build trust with the sales field.
- **Unified Taxonomy**: Centralized materiality filtering rejects 90% of web noise before it reaches the reasoning layer.

**Target users**: Fintech AEs, Sales Engineers, and GTM Strategy leads.

**Market context**: With rising CAC and platform consolidation in the Indian BFSI sector, a single well-timed "Counter" on regulatory risk or architectural lock-in can save a multi-crore enterprise deal.

---

## Architecture

| Stage | Description |
|------|------------|
| Entity Resolution | Maps competitor to a specific BFSI category (e.g., Payment Gateway, Banking API) |
| Multi-Source Research | Uses Tavily to fetch high-authority sources (The Ken, Medianama, Inc42) |
| Materiality Gate | Unified text-cleaner rejects PR fluff, image paths, and non-strategic noise |
| Sentiment Synthesis | Clusters customer voice from Reddit/G2/Trustpilot into professional themes |
| Capability Matrix | Dynamic mapping of technical infrastructure overlap (Payment Routing, KYC, etc.) |
| Event Clustering | Semantic deduplication of regulatory and funding events into a timeline |
| Strategic Synthesis | LLM models GTM implications and persona-specific displacement vectors |
| Analyst Sanitization | Post-processing layer enforces professional "AE Language" and strips filler |

---

## Technical Stack

- **Framework**: Next.js 15 + TypeScript
- **AI**: Google Gemini 2.5 via @ai-sdk/google
- **Search**: Tavily Search Engine
- **UI**: shadcn/ui + Tailwind CSS v4
- **Editor**: TipTap (Markdown-ready editing)
- **Sanitization**: Custom regex-based filler removal and structural validation

---

## The Pipeline: Deep Dive

CounterSignal operates a 6-stage intelligence pipeline designed to filter out the noise of the open web and surface only actionable GTM insights.

### 1. Research & Source Tiering
The pipeline begins by fetching 15-20 high-authority documents using the Tavily search engine. Unlike generic search, we apply a **Source Authority Map** (`domain.ts`) that weights specific Indian BFSI and tech publications (e.g., *The Ken*, *Medianama*, *Entrackr*) higher than generic aggregators. 

### 2. The Materiality Gate (Noise Rejection)
Before any data reaches the LLM, it passes through the **Unified Text Cleaner** (`text-cleaner.ts`). This is a deterministic stage that rejects ~90% of raw web data.
- **Artifact Rejection**: Removes image paths, tracking pixels, and CSS fragments.
- **PR Fluff Filtering**: Suppresses sentences that lack strategic or buyer-operational impact (e.g., generic corporate descriptions).
- **News-Source Strictness**: For news articles, the gate enforces a "Quote Requirement"—a signal is only treated as customer sentiment if it contains a direct quote from a user or stakeholder.

### 3. Ontological Classification
The engine resolves the competitor against a pre-defined **BFSI Taxonomy** (`taxonomy.ts`). It identifies if the competitor is a *Payment Gateway*, *Neobank*, *Lending Infrastructure*, etc. This classification drives the downstream GTM strategy; for instance, the system knows to look for "Settlement Speed" for Gateways but "Fund Segregation" for Neo-banks.

### 4. Clustered Extraction
Instead of passing raw text, the system groups signals into two structured clusters:
- **Sentiment Clusters**: Groups individual feedback signals into broad "Themes" (e.g., "Support Latency," "API Stability"). This prevents the "RAG Dump" effect by synthesizing 10 different complaints into one actionable insight.
- **Financial Event Clusters**: Deduplicates news reporting across multiple sources to create a single, clean headline for major moves like funding rounds or regulatory enforcement.

### 5. Strategic Implication Modeling (Synthesis)
The core of CounterSignal. The LLM is prompted not just to summarize, but to **model implications**. 
- **The "So What?" Layer**: It takes a technical feature (e.g., "Native UPI Autopay") and translates it into an operational benefit for a specific buyer (e.g., "Reduces mandate failure rates for subscription businesses").
- **Persona Alignment**: Strategies are segmented by stakeholder (CTO vs. Compliance vs. Founder), providing the AE with a multi-layered attack surface.

### 6. Analyst-Grade Sanitization
The final stage is a post-processing layer (`sanitize.ts`) that transforms machine-prose into **Field-Realistic AE Language**.
- **Filler Removal**: Strips "AI-isms" like "It is important to note..." or "Furthermore...".
- **Length Constraints**: Enforces "Quick Dismiss" brevity (max 2 bullets, ≤12 words each) to ensure the content is usable in a live sales call.
- **Truth Calibration**: If data density is low, the system dynamically appends a "Low Confidence" warning to the section, protecting the AE's credibility.

---

---

## Key Components

### The Materiality Gate

A unified utility that ensures only "Signal" reaches the LLM. It rejects anything that isn't a buyer-impacting or strategically relevant snippet.

```typescript
// Centralized Materiality Check
const isMaterial = (text: string) => {
  return containsStrategicImplication(text) || 
         containsOperationalRisk(text) || 
         containsBuyerImpact(text);
};
```

### Sentiment Clusterer

Transforms raw customer feedback into professional GTM themes using a strategic template map.

```typescript
// Sample Cluster Output
Theme {
  topic: "support",
  summary: "Support escalation delays appear repeatedly during account-review incidents.",
  confidence: "MEDIUM",
  sources: ["Reddit(2)", "G2(1)"]
}
```

### Truth Calibration Engine

Splits confidence into two dimensions: **Entity Certainty** (Who are they?) and **Strategic Depth** (How much do we actually know about their strategy?).

---

## Data Flow

```
Input Competitor → Entity Resolution → Tavily Search
→ Materiality Gate → [Sentiment Clustering | Event Deduplication]
→ Strategic Modeling → Persona-Specific Counters
→ Confidence Calibration → AE Sanitization → Final Battlecard
```

---

## Why It Scales

1. **Modular Utility Architecture**: One change to the text-cleaner or taxonomy updates the entire pipeline.
2. **Domain-Specific Weights**: Prioritizes Indian BFSI sources (Entrackr, Medianama) over generic global noise.
3. **Compositional GTM Logic**: Strategies are derived from the category (e.g., "Issuance" strategy vs "Acquiring" strategy).

---

## Roadmap

- **Internal Data Integration**: Connect to internal deal logs and Win/Loss data.
- **Deep-Link Citations**: Direct-to-line highlighting in source documents.
- **Multi-Competitor Matrix**: Real-time comparison of up to 3 competitors in a single view.