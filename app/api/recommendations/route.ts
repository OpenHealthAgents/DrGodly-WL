import { NextResponse } from "next/server";
import { getIntakeSessionId } from "@/lib/session-utils";
import { getPendingIntake } from "@/lib/intake-persistence";
import { getRecommendations } from "@/lib/recommendations";
import { IntakeData } from "@/lib/intake-state";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const sessionId = getIntakeSessionId();
  const pending = await getPendingIntake(sessionId);
  const data = (pending?.data as unknown as Partial<IntakeData>) || {};

  const session = await auth.api.getSession({
    headers: headers(),
  });

  if (pending) {
    await logAudit({
      userId: session?.user.id,
      action: "READ_RECOMMENDATIONS",
      resource: "PendingIntake",
      resourceId: pending.id,
      details: "Accessed recommendations based on intake",
    });
  }

  // The recommendation engine uses primaryInterest and formFactor from the data
  const result = getRecommendations(data);

  return NextResponse.json(result);
}



