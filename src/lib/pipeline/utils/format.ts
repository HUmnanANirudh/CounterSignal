export function normalizeFundingAmount(amountStr: string | undefined): string {
  if (!amountStr) return "Unknown";

  const lower = amountStr.toLowerCase().trim();
  
  // Extract number and unit
  const numMatch = lower.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return amountStr;
  
  const num = parseFloat(numMatch[1]);
  
  // Handle Indian notation
  if (lower.includes("crore") || lower.includes("cr")) {
    return `₹${num}Cr`;
  }
  if (lower.includes("lakh")) {
    return `₹${num}L`;
  }
  
  // Handle International notation
  if (lower.includes("mn") || lower.includes("million")) {
    return `$${num}M`;
  }
  if (lower.includes("bn") || lower.includes("billion")) {
    return `$${num}B`;
  }
  
  // Default to keeping as is but ensuring $ if it looks like USD
  if (lower.includes("$") || (!lower.includes("₹") && !lower.includes("rs"))) {
    return amountStr.startsWith("$") ? amountStr : `$${amountStr}`;
  }
  
  return amountStr;
}
