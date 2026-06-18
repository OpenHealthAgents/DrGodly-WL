import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateBMI, determineEligibility } from "../lib/eligibility";
import { getNextStep, IntakeStep, StepValidators } from "../lib/intake-state";
import { calculatePersonalization } from "../lib/personalization";
import { AVAILABLE_PLANS } from "../lib/plans";
import {
  getBillablePlanPriceForRegion,
  getConsultationFee,
  getDoseMultiplierForFormFactor,
  getOrderTotal,
  getPlanPriceForRegion,
  getShippingFee,
} from "../lib/pricing";
import { getPricingTierForProduct, getLowestEntryPriceLabel } from "../lib/pricing-strategy";
import { getRecommendations } from "../lib/recommendations";
import { TrustContentSchema } from "../lib/trust-validation";

const baseIntake = {
  height: 170,
  weight: 90,
  goalWeight: 75,
  gender: "female" as const,
  dateOfBirth: "1990-01-01",
  healthCritical: ["none"],
  healthExtended: ["none"],
  opiateUse: "no" as const,
  priorSurgery: "no" as const,
  currentMeds: "no" as const,
  bloodPressure: "120/80",
  heartRate: "72",
  medicationHistory: "none",
  programHistory: "no" as const,
  primaryInterest: "affordability" as const,
  formFactor: "injection" as const,
  hasAdditionalInfo: "no" as const,
  personalizationGoals: ["steady_progress"],
  firstName: "Test",
  lastName: "User",
  shippingState: "CA",
  email: "test@example.com",
  phone: "5551234567",
};

describe("eligibility engine", () => {
  it("calculates BMI from height in centimeters and weight in kilograms", () => {
    assert.equal(Number(calculateBMI(170, 80).toFixed(1)), 27.7);
  });

  it("marks users below BMI 27 as not eligible", () => {
    const result = determineEligibility({
      ...baseIntake,
      weight: 70,
    });

    assert.equal(result.status, "not_eligible");
    assert.match(result.reason ?? "", /below our current threshold of 27/);
  });

  it("allows BMI 27 and above through the initial criteria when no severe condition is present", () => {
    const result = determineEligibility({
      ...baseIntake,
      weight: 78.03,
    });

    assert.equal(result.status, "eligible");
  });

  it("routes users with severe conditions to doctor review", () => {
    const result = determineEligibility({
      ...baseIntake,
      healthExtended: ["diabetes"],
    });

    assert.equal(result.status, "doctor_review");
  });

  it("marks users with critical health conditions as not eligible", () => {
    const result = determineEligibility({
      ...baseIntake,
      healthCritical: ["active_cancer"],
    });

    assert.equal(result.status, "not_eligible");
  });

  it("marks personal or family history of MTC or MEN 2 as not eligible", () => {
    const result = determineEligibility({
      ...baseIntake,
      healthCritical: ["mtc_men2_history"],
    });

    assert.equal(result.status, "not_eligible");
    assert.match(result.reason ?? "", /Medullary Thyroid Carcinoma|MEN 2/);
  });
});

describe("personalization engine", () => {
  it("returns rounded BMI and a simple timeline range for weight loss goals", () => {
    const result = calculatePersonalization(90, 75, 170);

    assert.equal(result.bmi, 31.1);
    assert.deepEqual(result.weeklyWeightLossRange, { min: 1.2, max: 1.6 });
    assert.deepEqual(result.estimatedWeeksToGoal, { min: 10, max: 13 });
    assert.equal(result.successProbability, 85);
    assert.ok(result.metabolicScore >= 75 && result.metabolicScore <= 95);
  });

  it("does not estimate negative loss when the user is already at or below goal", () => {
    const result = calculatePersonalization(75, 80, 170);

    assert.deepEqual(result.weeklyWeightLossRange, { min: 0, max: 0 });
    assert.deepEqual(result.estimatedWeeksToGoal, { min: 0, max: 0 });
  });
});

describe("recommendation engine", () => {
  it("defaults to the affordable semaglutide tier", () => {
    const result = getRecommendations({ primaryInterest: "affordability", formFactor: "injection" });

    assert.equal(result.primary.drugType, "semaglutide");
    assert.equal(result.primary.tier, "affordable");
    assert.equal(result.secondary?.drugType, "tirzepatide");
  });

  it("recommends premium tirzepatide with an affordable fallback for potency preference", () => {
    const result = getRecommendations({ primaryInterest: "potency", formFactor: "injection" });

    assert.equal(result.primary.drugType, "tirzepatide");
    assert.equal(result.primary.tier, "premium");
    assert.equal(result.secondary?.drugType, "semaglutide");
  });

  it("recommends semaglutide when form factor preference is tablet", () => {
    const result = getRecommendations({ primaryInterest: "affordability", formFactor: "tablet" });

    assert.equal(result.primary.drugType, "semaglutide");
    assert.equal(result.primary.tier, "affordable");
  });
});

describe("intake flow", () => {
  it("advances through the structured intake steps in order", () => {
    assert.equal(getNextStep(IntakeStep.HEIGHT), IntakeStep.WEIGHT);
    assert.equal(getNextStep(IntakeStep.WEIGHT), IntakeStep.GOAL_WEIGHT);
    assert.equal(getNextStep(IntakeStep.GOAL_WEIGHT), IntakeStep.GENDER);
    assert.equal(getNextStep(IntakeStep.GENDER), IntakeStep.DATE_OF_BIRTH);
    assert.equal(getNextStep(IntakeStep.DATE_OF_BIRTH), IntakeStep.HEALTH_CRITICAL);
    assert.equal(getNextStep(IntakeStep.HEALTH_CRITICAL), IntakeStep.HEALTH_EXTENDED);
    assert.equal(getNextStep(IntakeStep.HEALTH_EXTENDED), IntakeStep.OPIATE_USE);
    assert.equal(getNextStep(IntakeStep.OPIATE_USE), IntakeStep.PRIOR_SURGERY);
    assert.equal(getNextStep(IntakeStep.PRIOR_SURGERY), IntakeStep.CURRENT_MEDS);
    assert.equal(getNextStep(IntakeStep.CURRENT_MEDS), IntakeStep.BLOOD_PRESSURE);
    assert.equal(getNextStep(IntakeStep.BLOOD_PRESSURE), IntakeStep.HEART_RATE);
    assert.equal(getNextStep(IntakeStep.HEART_RATE), IntakeStep.MEDICATION_HISTORY);
    assert.equal(getNextStep(IntakeStep.MEDICATION_HISTORY), IntakeStep.PROGRAM_HISTORY);
    assert.equal(getNextStep(IntakeStep.PROGRAM_HISTORY), IntakeStep.PRIMARY_INTEREST);
    assert.equal(getNextStep(IntakeStep.PRIMARY_INTEREST), IntakeStep.FORM_FACTOR);
    assert.equal(getNextStep(IntakeStep.FORM_FACTOR), IntakeStep.HAS_ADDITIONAL_INFO);
    assert.equal(getNextStep(IntakeStep.HAS_ADDITIONAL_INFO, { hasAdditionalInfo: "yes" }), IntakeStep.ADDITIONAL_INFO_DETAILS);
    assert.equal(getNextStep(IntakeStep.ADDITIONAL_INFO_DETAILS), IntakeStep.PERSONALIZATION_GOALS);
    assert.equal(getNextStep(IntakeStep.PERSONALIZATION_GOALS), IntakeStep.FIRST_NAME);
    assert.equal(getNextStep(IntakeStep.FIRST_NAME), IntakeStep.LAST_NAME);
    assert.equal(getNextStep(IntakeStep.LAST_NAME), IntakeStep.SHIPPING_STATE);
    assert.equal(getNextStep(IntakeStep.SHIPPING_STATE), IntakeStep.EMAIL);
    assert.equal(getNextStep(IntakeStep.EMAIL), IntakeStep.PHONE);
    assert.equal(getNextStep(IntakeStep.PHONE), IntakeStep.COMPLETED);
  });

  it("skips additional info details when the user has nothing else to add", () => {
    assert.equal(
      getNextStep(IntakeStep.HAS_ADDITIONAL_INFO, { hasAdditionalInfo: "no" }),
      IntakeStep.PERSONALIZATION_GOALS
    );
  });

  it("rejects impossible height, unsupported gender, and invalid birth date inputs", () => {
    assert.equal(StepValidators[IntakeStep.HEIGHT].safeParse(40).success, false);
    assert.equal(StepValidators[IntakeStep.GENDER].safeParse("unknown").success, false);
    assert.equal(StepValidators[IntakeStep.DATE_OF_BIRTH].safeParse("not-a-date").success, false);
  });

  it("accepts checkbox health conditions as a predefined string array", () => {
    const result = StepValidators[IntakeStep.HEALTH_EXTENDED].safeParse([
      "hypertension",
      "none",
    ]);

    assert.equal(result.success, true);
  });

  it("accepts predefined single-choice treatment preferences from the chat UI", () => {
    const result = StepValidators[IntakeStep.PRIMARY_INTEREST].safeParse("potency");

    assert.equal(result.success, true);
  });

  it("validates patient identity fields collected during intake", () => {
    assert.equal(StepValidators[IntakeStep.FIRST_NAME].safeParse("Ava").success, true);
    assert.equal(StepValidators[IntakeStep.LAST_NAME].safeParse("Patel").success, true);
    assert.equal(StepValidators[IntakeStep.EMAIL].safeParse("ava@example.com").success, true);
    assert.equal(StepValidators[IntakeStep.PHONE].safeParse("5551234567").success, true);
    assert.equal(StepValidators[IntakeStep.EMAIL].safeParse("not-an-email").success, false);
  });
});

describe("plans and trust layer", () => {
  it("offers configured plan durations for available treatment tiers", () => {
    const planKeys = AVAILABLE_PLANS.map(
      (plan) => `${plan.drugType}:${plan.tier}:${plan.durationMonths}`
    );

    assert.deepEqual(planKeys, [
      "semaglutide:affordable:1",
      "semaglutide:affordable:3",
      "semaglutide:affordable:6",
      "semaglutide:affordable:12",
      "tirzepatide:premium:1",
      "tirzepatide:premium:3",
    ]);
  });

  it("validates admin-controlled testimonial and stat trust content", () => {
    const testimonial = TrustContentSchema.parse({
      type: "testimonial",
      title: "Lost 10kg in 3 months",
      description: "The guided intake and plan made it easy to stay consistent.",
      metadata: { author: "Member A", loss: "10kg lost", rating: 5 },
    });

    const stat = TrustContentSchema.parse({
      type: "stat",
      title: "Typical Weight Loss",
      description: "Users typically lose 5-10% body weight.",
      metadata: { value: "5-10%", metric: "Body weight" },
      isActive: false,
    });

    assert.equal(testimonial.isActive, true);
    assert.equal(stat.isActive, false);
  });

  it("selects country-specific plan pricing with a US fallback", () => {
    const prices = [
      { country: "US", currency: "USD", amount: 299 },
      { country: "IN", currency: "INR", amount: 24900 },
    ];

    assert.deepEqual(getPlanPriceForRegion(prices, { country: "IN" }), {
      country: "IN",
      currency: "INR",
      amount: 24900,
    });
    assert.deepEqual(getPlanPriceForRegion(prices, { country: "CA" }), {
      country: "US",
      currency: "USD",
      amount: 299,
    });
  });

  it("adds India consultation and shipping fees to INR order totals", () => {
    assert.equal(getConsultationFee("INR"), 300);
    assert.equal(getShippingFee("INR"), 100);
    assert.equal(getConsultationFee("USD"), 0);
    assert.equal(getShippingFee("USD"), 0);
    assert.equal(getOrderTotal(24900, "INR"), 25300);
  });

  it("bills weekly injections as four doses per month", () => {
    const prices = [{ country: "IN", currency: "INR", amount: 742 }];

    assert.equal(getDoseMultiplierForFormFactor("pre-filled-pen"), 4);
    assert.equal(getDoseMultiplierForFormFactor("vial"), 4);
    assert.equal(getDoseMultiplierForFormFactor("tablet"), 1);
    assert.deepEqual(getBillablePlanPriceForRegion(prices, { country: "IN" }, "injection"), {
      country: "IN",
      currency: "INR",
      amount: 2968,
    });
  });

  it("maps product formats to the three-tier pricing strategy", () => {
    assert.equal(
      getPricingTierForProduct({ drugType: "semaglutide", formFactor: "vial" }).band,
      "affordable"
    );
    assert.equal(
      getPricingTierForProduct({ drugType: "semaglutide", formFactor: "pre-filled-pen" }).band,
      "standard"
    );
    assert.equal(
      getPricingTierForProduct({ drugType: "tirzepatide", formFactor: "injection" }).band,
      "premium"
    );
    assert.match(getLowestEntryPriceLabel("IN"), /₹1,999/);
  });
});
