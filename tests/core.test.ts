import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateBMI, determineEligibility } from "../lib/eligibility";
import { getNextStep, IntakeStep, StepValidators } from "../lib/intake-state";
import { calculatePersonalization } from "../lib/personalization";
import { AVAILABLE_PLANS } from "../lib/plans";
import { getRecommendations } from "../lib/recommendations";
import { TrustContentSchema } from "../lib/trust-validation";

const baseIntake = {
  height: 170,
  weight: 90,
  goalWeight: 75,
  gender: "female" as const,
  dateOfBirth: "1990-01-01",
  conditions: ["none"],
  preferences: { preference: "affordable" },
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
      conditions: ["diabetes"],
    });

    assert.equal(result.status, "doctor_review");
  });
});

describe("personalization engine", () => {
  it("returns rounded BMI and a simple timeline range for weight loss goals", () => {
    const result = calculatePersonalization(90, 75, 170);

    assert.deepEqual(result, {
      bmi: 31.1,
      weeklyWeightLossRange: { min: 0.5, max: 1 },
      estimatedWeeksToGoal: { min: 15, max: 30 },
    });
  });

  it("does not estimate negative loss when the user is already at or below goal", () => {
    const result = calculatePersonalization(75, 80, 170);

    assert.deepEqual(result.weeklyWeightLossRange, { min: 0, max: 0 });
    assert.deepEqual(result.estimatedWeeksToGoal, { min: 0, max: 0 });
  });
});

describe("recommendation engine", () => {
  it("defaults to the affordable semaglutide tier", () => {
    const result = getRecommendations("affordable");

    assert.equal(result.primary.drugType, "semaglutide");
    assert.equal(result.primary.tier, "affordable");
    assert.equal(result.secondary, undefined);
  });

  it("recommends premium tirzepatide with an affordable fallback for strongest preference", () => {
    const result = getRecommendations("strongest");

    assert.equal(result.primary.drugType, "tirzepatide");
    assert.equal(result.primary.tier, "premium");
    assert.equal(result.secondary?.drugType, "semaglutide");
  });

  it("accepts the object-shaped preference payload stored by older intake data", () => {
    const result = getRecommendations({ preference: "non_injection" });

    assert.equal(result.primary.drugType, "liraglutide");
    assert.equal(result.primary.tier, "standard");
  });
});

describe("intake flow", () => {
  it("advances through the structured intake steps in order", () => {
    assert.equal(getNextStep(IntakeStep.HEIGHT), IntakeStep.WEIGHT);
    assert.equal(getNextStep(IntakeStep.WEIGHT), IntakeStep.GOAL_WEIGHT);
    assert.equal(getNextStep(IntakeStep.GOAL_WEIGHT), IntakeStep.GENDER);
    assert.equal(getNextStep(IntakeStep.GENDER), IntakeStep.DATE_OF_BIRTH);
    assert.equal(getNextStep(IntakeStep.DATE_OF_BIRTH), IntakeStep.CONDITIONS);
    assert.equal(getNextStep(IntakeStep.CONDITIONS), IntakeStep.PREFERENCES);
    assert.equal(getNextStep(IntakeStep.PREFERENCES), IntakeStep.COMPLETED);
  });

  it("rejects impossible height, unsupported gender, and invalid birth date inputs", () => {
    assert.equal(StepValidators[IntakeStep.HEIGHT].safeParse(40).success, false);
    assert.equal(StepValidators[IntakeStep.GENDER].safeParse("unknown").success, false);
    assert.equal(StepValidators[IntakeStep.DATE_OF_BIRTH].safeParse("not-a-date").success, false);
  });

  it("accepts checkbox medical conditions as a predefined string array", () => {
    const result = StepValidators[IntakeStep.CONDITIONS].safeParse([
      "hypertension",
      "none",
    ]);

    assert.equal(result.success, true);
  });

  it("accepts predefined single-choice treatment preferences from the chat UI", () => {
    const result = StepValidators[IntakeStep.PREFERENCES].safeParse("strongest");

    assert.equal(result.success, true);
  });
});

describe("plans and trust layer", () => {
  it("offers 1, 3, and 6 month plans for each treatment tier", () => {
    const planKeys = AVAILABLE_PLANS.map(
      (plan) => `${plan.drugType}:${plan.tier}:${plan.durationMonths}`
    );

    assert.deepEqual(planKeys, [
      "semaglutide:affordable:1",
      "semaglutide:affordable:3",
      "semaglutide:affordable:6",
      "liraglutide:standard:1",
      "liraglutide:standard:3",
      "liraglutide:standard:6",
      "tirzepatide:premium:1",
      "tirzepatide:premium:3",
      "tirzepatide:premium:6",
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
});
