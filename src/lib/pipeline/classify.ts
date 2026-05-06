import type { BFSICategory } from "@/types/entity";
import type { ClassificationResult } from "@/types/pipeline";
import { getMarketRole, CLASSIFICATION_SIGNALS, CATEGORY_PRECEDENCE } from "@/types/entity";

export type { ClassificationResult };
export { getPricingModelForCategory } from "@/types/entity";

// Deterministic scoring classifier
export function classifyCompetitor(
  competitorName: string,
  content: string
): ClassificationResult {
  const combined = `${competitorName} ${content}`.toLowerCase();
  const scores: Record<string, number> = {};
  const signals: string[] = [];

  // Calculate scores for each category
  for (const [category, patternList] of Object.entries(CLASSIFICATION_SIGNALS)) {
    let categoryScore = 0;
    for (const { pattern, weight } of patternList) {
      if (pattern.test(combined)) {
        categoryScore += weight;
        signals.push(`${category}:${pattern.source.slice(0, 20)}`);
      }
    }
    scores[category] = categoryScore;
  }

  // Find max score
  let maxScore = 0;
  let maxCategory: BFSICategory = "payment_gateway"; // default

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
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

  // Rule: Never return unknown if signals exist
  if (maxScore < 0.5) {
    maxCategory = "payment_gateway"; // Default fallback
  }

  const marketRole = getMarketRole(maxCategory);

  return {
    category: maxCategory,
    confidence: maxScore > 0 ? Math.min(1, maxScore / 6) : 0.3,
    signals: signals.slice(0, 6),
    isCompetitor: marketRole === "competitor",
    marketRole,
    reasoning: `Score: ${maxScore.toFixed(1)}, category: ${maxCategory}`,
  };
}
