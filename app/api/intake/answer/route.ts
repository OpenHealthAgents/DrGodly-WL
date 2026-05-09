import { NextRequest, NextResponse } from "next/server";
import { IntakeData, IntakeStep, StepValidators, getNextStep } from "@/lib/intake-state";
import { getIntakeSessionId, setIntakeSessionId } from "@/lib/session-utils";
import { getPendingIntake, updatePendingIntake } from "@/lib/intake-persistence";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { step, answer } = await req.json();
    const sessionId = getIntakeSessionId();

    if (!step || !Object.values(IntakeStep).includes(step as IntakeStep)) {
      return NextResponse.json({ error: "Invalid step" }, { status: 400 });
    }

    const pending = await getPendingIntake(sessionId);
    const currentStep = pending?.currentStep || IntakeStep.HEIGHT;

    if (step !== currentStep) {
      return NextResponse.json(
        { error: `Wrong step. Expected ${currentStep}` },
        { status: 400 }
      );
    }

    const validator = StepValidators[step as IntakeStep];
    if (!validator) {
      return NextResponse.json({ error: "No validator for step" }, { status: 500 });
    }

    const result = validator.safeParse(answer);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.format() },
        { status: 400 }
      );
    }

    // Get user session if available
    const userSession = await auth.api.getSession({
      headers: headers(),
    });

    // Update state in DB
    const updatedPending = await updatePendingIntake(
      sessionId,
      step as IntakeStep,
      result.data as Prisma.InputJsonValue,
      userSession?.user.id
    );

    await logAudit({
      userId: userSession?.user.id,
      action: "UPDATE_INTAKE_STEP",
      resource: "PendingIntake",
      resourceId: updatedPending.id,
      details: `Updated step: ${step}`,
    });


    const intakeData = updatedPending.data as unknown as IntakeData;
    const nextStep = getNextStep(step as IntakeStep, intakeData);
    
    // Update current step for next time
    if (nextStep !== IntakeStep.COMPLETED) {
      await (await import("@/lib/prisma")).default.pendingIntake.update({
        where: { sessionId },
        data: { currentStep: nextStep }
      });
    }

    if (nextStep === IntakeStep.COMPLETED) {
      const { determineEligibility } = await import("@/lib/eligibility");
      const { getRecommendations } = await import("@/lib/recommendations");
      const eligibility = determineEligibility(intakeData);
      const recommendations = getRecommendations(intakeData);

      const prisma = (await import("@/lib/prisma")).default;

      // Clean up pending intake as it is now complete
      try {
        await prisma.pendingIntake.delete({
          where: { sessionId },
        });
        console.log("Deleted completed pending intake for session:", sessionId);
      } catch (deleteError) {
        console.warn("Failed to delete pending intake (likely already gone):", deleteError);
      }

      try {
        const userEmail = userSession?.user.email || "test@wellora.com";

        const user = await prisma.user.upsert({
          where: { email: userEmail },
          update: {},
          create: {
            email: userEmail,
            name: userSession?.user.name || "Test User",
          },
        });

        // Store Intake
        const finalIntake = await prisma.intake.upsert({
          where: { userId: user.id },
          update: {
            firstName: intakeData.firstName,
            lastName: intakeData.lastName,
            email: intakeData.email,
            phone: intakeData.phone,
            shippingState: intakeData.shippingState,
            height: intakeData.height,
            weight: intakeData.weight,
            goalWeight: intakeData.goalWeight,
            gender: intakeData.gender,
            dateOfBirth: new Date(intakeData.dateOfBirth),
            healthData: {
              healthCritical: intakeData.healthCritical,
              healthExtended: intakeData.healthExtended,
              bloodPressure: intakeData.bloodPressure,
              heartRate: intakeData.heartRate,
              opiateUse: intakeData.opiateUse,
              priorSurgery: intakeData.priorSurgery,
              currentMeds: intakeData.currentMeds,
            } as Prisma.InputJsonValue,
            history: {
              medicationHistory: intakeData.medicationHistory,
              programHistory: intakeData.programHistory,
            } as Prisma.InputJsonValue,
            preferences: {
              primaryInterest: intakeData.primaryInterest,
              formFactor: intakeData.formFactor,
              personalizationGoals: intakeData.personalizationGoals,
              hasAdditionalInfo: intakeData.hasAdditionalInfo,
            } as Prisma.InputJsonValue,
            additionalInfo: intakeData.additionalInfoDetails,
          },
          create: {
            userId: user.id,
            firstName: intakeData.firstName,
            lastName: intakeData.lastName,
            email: intakeData.email,
            phone: intakeData.phone,
            shippingState: intakeData.shippingState,
            height: intakeData.height,
            weight: intakeData.weight,
            goalWeight: intakeData.goalWeight,
            gender: intakeData.gender,
            dateOfBirth: new Date(intakeData.dateOfBirth),
            healthData: {
              healthCritical: intakeData.healthCritical,
              healthExtended: intakeData.healthExtended,
              bloodPressure: intakeData.bloodPressure,
              heartRate: intakeData.heartRate,
              opiateUse: intakeData.opiateUse,
              priorSurgery: intakeData.priorSurgery,
              currentMeds: intakeData.currentMeds,
            } as Prisma.InputJsonValue,
            history: {
              medicationHistory: intakeData.medicationHistory,
              programHistory: intakeData.programHistory,
            } as Prisma.InputJsonValue,
            preferences: {
              primaryInterest: intakeData.primaryInterest,
              formFactor: intakeData.formFactor,
              personalizationGoals: intakeData.personalizationGoals,
              hasAdditionalInfo: intakeData.hasAdditionalInfo,
            } as Prisma.InputJsonValue,
            additionalInfo: intakeData.additionalInfoDetails,
          },
        });

        await logAudit({
          userId: user.id,
          action: "CREATE_OR_UPDATE_FINAL_INTAKE",
          resource: "Intake",
          resourceId: finalIntake.id,
          details: "Final intake completed and stored",
        });

        // Store Eligibility
        const finalEligibility = await prisma.eligibility.upsert({
          where: { userId: user.id },
          update: {
            status: eligibility.status,
            reason: eligibility.reason,
          },
          create: {
            userId: user.id,
            status: eligibility.status,
            reason: eligibility.reason,
          },
        });

        await logAudit({
          userId: user.id,
          action: "COMPUTE_ELIGIBILITY",
          resource: "Eligibility",
          resourceId: finalEligibility.id,
          details: `Status computed: ${eligibility.status}`,
        });

      } catch (dbError) {
        console.error("Database storage failed:", dbError);
      }

      const response = NextResponse.json({
        success: true,
        nextStep,
        data: intakeData,
        eligibility,
        recommendations,
      });
      
      setIntakeSessionId(sessionId); // Ensure cookie is set
      return response;
    }

    const response = NextResponse.json({
      success: true,
      nextStep,
      data: intakeData,
    });
    
    setIntakeSessionId(sessionId);
    return response;
  } catch (error) {
    console.error("Intake error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


