import { Prisma } from "@prisma/client";
import prisma from "./prisma";
import { IntakeStep } from "./intake-state";

export async function getPendingIntake(sessionId: string) {
  return await prisma.pendingIntake.findUnique({
    where: { sessionId },
  });
}

export async function updatePendingIntake(
  sessionId: string,
  step: IntakeStep,
  data: Prisma.InputJsonValue,
  userId?: string
) {
  const existing = await getPendingIntake(sessionId);

  if (existing) {
    const updatedData = { ...(existing.data as Prisma.JsonObject), [step]: data as Prisma.InputJsonValue };
    return await prisma.pendingIntake.update({
      where: { sessionId },
      data: {
        currentStep: step,
        data: updatedData as Prisma.InputJsonObject,
        userId: userId || existing.userId,
      },
    });
  }

  return await prisma.pendingIntake.create({
    data: {
      sessionId,
      userId,
      currentStep: step,
      data: { [step]: data } as Prisma.InputJsonObject,
    },
  });
}



export async function deletePendingIntake(sessionId: string) {
  return await prisma.pendingIntake.deleteMany({
    where: { sessionId },
  });
}
