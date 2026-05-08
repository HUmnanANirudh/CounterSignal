# CounterSignal
Real-time Competitive Sales Engine for BFSI AEs

## The Problem

Fintech sales teams spend 10+ hours a week researching competitors before high-stakes deals. In a market with 400+ startups and rising customer acquisition costs, a single well-timed counter on regulatory risk or architectural lag can save a multi-crore deal.

They already have search engines. They can find a competitor's website.

What they lack is a system that filters through the noise of PR content and SEO spam to find specific operational risks and pricing signals.

---

## What I Built

A research pipeline that converts raw web data into a 1-page tactical battlecard for Account Executives.

**Input**: Competitor name (e.g., "Paytm", "Cashfree")

**Output**: A structured battlecard featuring **Stack Positioning**, synthesized pricing, **Persona-based Objections**, and **Confidence Metrics**.

https://github.com/user-attachments/assets/cb5c46aa-59c0-44a7-8808-504310a778ca

---

## Why CounterSignal?

- **Noise Filtering**: Strips noise (tracking pixels, PR fluff) and unrelated search fragments to ensure high-signal LLM synthesis.
- **Category Aware**: Uses a 10-layer BFSI taxonomy to distinguish between a Payment Gateway and a Core Banking provider.
- **Evidence Based**: Low-confidence sections are explicitly flagged when source coverage is weak.
- **Tactical Focus**: Generates specific objection-handling points for CTOs, Founders, and Compliance stakeholders.
**Target users**: Account Executives, GTM leads, and Sales Engineers.
**Market context**: ndian fintech is crowded and fast-moving. Sales teams often compete against multiple infrastructure vendors in the same deal cycle, making fast and accurate competitor research increasingly important.

---

## Architecture

| Stage | Description |
|------|------------|
| Entity Resolution | Maps competitor nicknames to canonical names (e.g. "One97" -> "Paytm") |
| Tiered Research | Prioritizes specialized journals (The Ken, Medianama) over general news |
| Content Filtering | Deterministic engine strips structural noise and SEO artifacts |
| Classification | Maps the entity to a 30+ category BFSI taxonomy (e.g. Core Banking Ledger, Card Issuance). This identifies the competitor's **Stack Position**, which dynamically adjusts the battlecard's intelligence focus. |
| Extraction | Pulls pricing, positioning, and operational signals |
| Sentiment Clustering | Groups user feedback into patterns (e.g. "API Latency", "Settlement Lag") |
| GTM Synthesis | Converts signals into objection-handling points (Validate, Acknowledge, Reframe) |

---

## Technical Stack

- **Framework**: Next.js 15 + TypeScript
- **AI**: Google Gemini via @ai-sdk/google
- **Search**: Tavily Search Engine
- **UI**: shadcn/ui + Tailwind CSS
- **Sanitization**: Multi-stage noise rejection combining regex, semantic similarity gates, and domain authority weighting

---

## How It Works

1. **Search**: Executes 6+ parallel search queries using **Google Dorking** patterns (e.g. `site:domain "pricing"`, `intext:competitor "regulatory"`) to surface non-obvious operational data and industry-specific filings.
2. **Filter**: Removes content that doesn't substantively mention the entity.
3. **Classify**: Maps the entity to a 30+ category BFSI taxonomy. Identifies the competitor's **Stack Position**.
4. **Extract**: Pulls pricing, recent launches, and customer complaints.
5. **Cluster**: Groups feedback signals into 2-3 recurring themes.
6. **Pivot**: Generates stakeholder-specific counters for the sales team.

---

## Key Components

### Noise Filter

A deterministic stage that ensures only relevant signals reach the LLM. It rejects anything that isn't a buyer-impacting or strategically relevant snippet.

### Category-Aware Rendering

The battlecard is not a static template. The system dynamically reconfigures the report based on the entity's identified role:
- **Relationship Modes**: Switches between Competitive Pivot (for rivals), Integration Posture (for partners), and Reference Mode (for internal profiles).
- **Stack-Specific Analysis**: Lenders receive interest rate spread analysis, while Gateways receive settlement latency benchmarks.
- **Self-Awareness**: Recognizes Blostem's own profile to prevent redundant competitive analysis.

---

## Operator Experience

The interface is built for rapid analyst refinement:

- **Live Edit & Preview**: A dual-pane editor (TipTap-powered) allows AEs to refine AI-generated pivots while maintaining real-time Markdown-to-UI synchronization.
- **Confidence Metrics**: Every report includes a **Confidence Score** (0-1.0) derived from source density, domain authority, and entity-mention substance.
- **One-Click PDF Export**: Generates PDFs with full source citations for offline use or executive briefings.

## Data Flow

```
Input Name → Entity Resolution → Weighted Search
→ Noise Filter → BFSI Classification
→ Signal Extraction → Sentiment Clustering
→ GTM Synthesis → Final Battlecard
```
---

## Limitations & Roadmap

### Current Limitation

The search and synthesis process currently runs sequentially. This introduces:

- **Niche Entities**: Startups with < 1 year of public web presence often return low-confidence results due to strict entity-grounding rules.
- **Hybrid Conglomerates**: Large entities (e.g. Tata, Reliance) that span multiple sectors can occasionally trigger classification "smearing" across categories.


### In Progress: Parallel Batching

Migrating to a parallel architecture to reduce latency and improve reliability:

- **Concurrent Extraction**: Offload sentiment and pricing extraction to background tasks.
- **Streaming Citations**: Users will see source links while the report is still generating.

### Future Work

- **White-labeling**: Allowing any organization to define themselves as the 'host' to generate pivots against their own category strengths.
- **CRM Integration**: Automatically triggering research when a competitor is mentioned in a deal record.
- **Real-time Alerts**: Pushing high-impact events (e.g. regulatory actions or product pivots) directly to Slack/Teams for immediate field readiness.
