import { IntakeData } from "./intake-state";

export interface RecommendedPlan {
  drugType: "semaglutide" | "liraglutide" | "tirzepatide";
  tier: "affordable" | "standard" | "premium";
  explanation: string;
}

export interface RecommendationResult {
  primary: RecommendedPlan;
  secondary?: RecommendedPlan;
}

/**
 * Deterministic recommendation engine based on user preferences.
 * Medvi logic:
 * - Default -> semaglutide (affordable/most popular)
 * - If user prefers Potency -> tirzepatide (premium/most potent)
 * - If user prefers Tablets -> semaglutide tablet-compatible options
 */
export function getRecommendations(preferences: Partial<IntakeData>): RecommendationResult {
  const primaryInterest = preferences?.primaryInterest;
  const formFactor = preferences?.formFactor;

  if (primaryInterest === "potency") {
    return {
      primary: {
        drugType: "tirzepatide",
        tier: "premium",
        explanation: "Based on your preference for the highest potency and effectiveness, we recommend Tirzepatide. It has shown the highest weight loss percentage (up to 22.5%) in clinical trials.",
      },
      secondary: {
        drugType: "semaglutide",
        tier: "affordable",
        explanation: "Semaglutide is our most popular and balanced alternative.",
      },
    };
  }

  if (formFactor === "tablet") {
    return {
      primary: {
        drugType: "semaglutide",
        tier: "affordable",
        explanation: "Since you prefer a non-injection option, we recommend a tablet-compatible Semaglutide plan when available in your region.",
      },
      secondary: {
        drugType: "tirzepatide",
        tier: "premium",
        explanation: "If you decide an injection is acceptable, Tirzepatide is the strongest option available.",
      },
    };
  }

  // Default / Affordability
  return {
    primary: {
      drugType: "semaglutide",
      tier: "affordable",
      explanation: "We recommend Semaglutide as your best match. It is our most popular, affordable, and balanced GLP-1 medication for consistent results.",
    },
    secondary: {
      drugType: "tirzepatide",
      tier: "premium",
      explanation: "If you want maximum weight loss results, Tirzepatide is the strongest option available.",
    },
  };
}
