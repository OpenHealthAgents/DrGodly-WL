import { NextResponse } from "next/server";
import { getIntakeSessionId } from "@/lib/session-utils";
import { getPendingIntake } from "@/lib/intake-persistence";
import { calculatePersonalization } from "@/lib/personalization";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const sessionId = getIntakeSessionId();
  const pending = await getPendingIntake(sessionId);
  const data = (pending?.data as Record<string, unknown>) || {};
  const { height, weight, goalWeight } = data;

  const session = await auth.api.getSession({
    headers: headers(),
  });

  if (pending) {
    await logAudit({
      userId: session?.user.id,
      action: "READ_PERSONALIZATION",
      resource: "PendingIntake",
      resourceId: pending.id,
      details: "Accessed personalization data based on intake",
    });
  }

  if (
    typeof height !== "number" ||
    typeof weight !== "number" ||
    typeof goalWeight !== "number"
  ) {
    return NextResponse.json(
      { error: "Insufficient intake data for personalization" },
      { status: 400 }
    );
  }

  const result = calculatePersonalization(weight, goalWeight, height, data);



  return NextResponse.json(result);
}


