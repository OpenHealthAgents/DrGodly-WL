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
 * Tiered logic:
 * - Default -> semaglutide (lowest-cost starting tier)
 * - If user prefers Potency -> tirzepatide (highest-efficacy tier)
 * - If user prefers Tablets -> semaglutide tablet-compatible options
 */
export function getRecommendations(preferences: Partial<IntakeData>): RecommendationResult {
  const primaryInterest = preferences?.primaryInterest;
  const formFactor = preferences?.formFactor;

  // Potency-first users should see tirzepatide first, with semaglutide as the cheaper fallback.
  if (primaryInterest === "potency") {
    return {
      primary: {
        drugType: "tirzepatide",
        tier: "premium",
        explanation: "Based on your preference for the highest potency and effectiveness, we recommend the high-efficacy tirzepatide tier. It is the strongest option in the program.",
      },
      secondary: {
        drugType: "semaglutide",
        tier: "affordable",
        explanation: "If you want the lowest-cost entry point, the semaglutide vial tier is the next best fit.",
      },
    };
  }

  // Tablet preference means we should bias toward a non-injection path when available.
  if (formFactor === "tablet") {
    return {
      primary: {
        drugType: "semaglutide",
        tier: "affordable",
        explanation: "Since you prefer a non-injection option, we recommend the lowest-cost semaglutide pathway when a tablet-compatible option is available in your region.",
      },
      secondary: {
        drugType: "tirzepatide",
        tier: "premium",
        explanation: "If you decide a higher-efficacy injection is acceptable, tirzepatide is the strongest tier available.",
      },
    };
  }

  // Default path: keep the recommendation conservative and cost-led.
  return {
    primary: {
      drugType: "semaglutide",
      tier: "affordable",
      explanation: "We recommend semaglutide as your best match. It is the lowest-cost starting tier and the most balanced GLP-1 medication for consistent results.",
    },
    secondary: {
      drugType: "tirzepatide",
      tier: "premium",
      explanation: "If you want maximum weight loss results, tirzepatide is the strongest tier available.",
    },
  };
}
