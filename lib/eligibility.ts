import { IntakeData } from "./intake-state";

export type EligibilityStatus = "eligible" | "not_eligible" | "doctor_review";

export interface EligibilityResult {
  status: EligibilityStatus;
  reason?: string;
}

/**
 * Calculates BMI given height in cm and weight in kg.
 */
export function calculateBMI(heightCm: number, weightKg: number): number {
  if (heightCm <= 0) return 0;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Determines eligibility based on intake data.
 * - If BMI < 27 → not eligible
 * - If personal/family history of MTC or MEN 2 → not eligible
 * - If any healthCritical conditions present → not_eligible or doctor_review
 * - Else → eligible
 */
export function determineEligibility(data: IntakeData): EligibilityResult {
  const bmi = calculateBMI(data.height, data.weight);

  const hasMtcMen2History = data.healthCritical.includes("mtc_men2_history");
  const hasCriticalCondition = data.healthCritical.length > 0 && !data.healthCritical.includes("none");
  const hasExtendedCondition = data.healthExtended.length > 0 && !data.healthExtended.includes("none");

  if (bmi < 27) {
    return {
      status: "not_eligible",
      reason: `Your BMI is ${bmi.toFixed(1)}, which is below our current threshold of 27 for GLP-1 treatment.`,
    };
  }

  if (hasMtcMen2History) {
    return {
      status: "not_eligible",
      reason: "GLP-1 medications carry a boxed warning for thyroid C-cell tumors and are contraindicated for people with a personal or family history of Medullary Thyroid Carcinoma (MTC) or Multiple Endocrine Neoplasia syndrome type 2 (MEN 2).",
    };
  }

  if (hasCriticalCondition) {
    return {
      status: "not_eligible",
      reason: "Based on your medical history (End-stage disease, active cancer, or psychiatric history), you are not currently eligible for our remote weight loss program. We recommend consulting your primary care physician.",
    };
  }

  if (hasExtendedCondition) {
    return {
      status: "doctor_review",
      reason: "Based on your medical conditions (e.g. Gallbladder, Hypertension, or Diabetes), a doctor needs to manually review your profile to ensure safety.",
    };
  }

  if (data.opiateUse === "yes") {
    return {
      status: "not_eligible",
      reason: "Recent opiate use is a contraindication for our current weight loss medications.",
    };
  }

  return {
    status: "eligible",
    reason: "You meet the initial criteria for our medical weight loss programs.",
  };
}
