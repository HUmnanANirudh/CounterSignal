import type { BFSICategory } from "@/types/entity";
import type { ClassificationResult } from "@/types/pipeline";
import { getMarketRole, CLASSIFICATION_SIGNALS, CATEGORY_PRECEDENCE } from "@/types/entity";

export type { ClassificationResult };
export { getPricingModelForCategory } from "@/types/entity";

// Deterministic scoring classifier
export function classifyCompetitor(
  competitorName: string,
  content: string,
  hint?: BFSICategory
): ClassificationResult {
  const combined = `${competitorName} ${content}`.toLowerCase();
  const scores: Record<string, number> = {};
  const signals: string[] = [];

  // Calculate scores for each category using frequency analysis
  for (const [category, patternList] of Object.entries(CLASSIFICATION_SIGNALS)) {
    let categoryScore = 0;
    for (const { pattern, weight } of patternList) {
      // Use global match to count occurrences for better "intelligence"
      const matches = combined.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        // Logarithmic scaling for frequency to avoid runaway scores
        const frequencyBoost = Math.log2(1 + matches.length);
        categoryScore += weight * frequencyBoost;
        signals.push(`${category}:${pattern.source.slice(0, 15)}(x${matches.length})`);
      }
    }
    scores[category] = categoryScore;
  }

  // Boost hint score significantly if it exists
  if (hint && scores[hint] !== undefined) {
    scores[hint] += 5; // Strong bias toward resolved entity hint
  }

  // Find max score
  let maxScore = 0;
  let maxCategory: BFSICategory = hint || "payment_gateway";

  for (const [category, score] of Object.entries(scores)) {
    if (score >= maxScore) {
      // Favor hint on ties
      if (score === maxScore && category !== hint) continue;
      
      maxScore = score;
      maxCategory = category as BFSICategory;
    }
  }

  // Tie-breaking by precedence
  if (maxScore > 0) {
    const tiedCategories = Object.entries(scores)
      .filter(([, s]) => s === maxScore)
      .map(([c]) => c as BFSICategory);

    if (tiedCategories.length > 1) {
      for (const cat of CATEGORY_PRECEDENCE) {
        if (tiedCategories.includes(cat)) {
          maxCategory = cat;
          break;
        }
      }
    }
  }

  // If no signals matched, use hint or default to non_bfsi
  if (maxScore < 0.2) {
    if (hint) {
      maxCategory = hint;
    } else {
      maxCategory = "non_bfsi";
    }
  }

  const marketRole = getMarketRole(maxCategory);

  return {
    category: maxCategory,
    confidence: maxScore > 0 ? Math.min(1, maxScore / 6) : (hint ? 0.5 : 0.3),
    signals: signals.slice(0, 6),
    isCompetitor: marketRole === "direct_competitor" || marketRole === "indirect_competitor",
    marketRole,
    reasoning: `Score: ${maxScore.toFixed(1)}, category: ${maxCategory}${hint ? ` (hint: ${hint})` : ""}`,
  };
}
