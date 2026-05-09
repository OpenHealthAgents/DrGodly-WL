import { NextResponse } from "next/server";
import { getIntakeSessionId } from "@/lib/session-utils";
import { getPendingIntake, deletePendingIntake } from "@/lib/intake-persistence";
import { IntakeStep } from "@/lib/intake-state";
import { logAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  console.log("GET /api/intake - Starting request");
  try {
    const sessionId = getIntakeSessionId();
    console.log("GET /api/intake - Session ID:", sessionId);
    
    const pending = await getPendingIntake(sessionId);
    console.log("GET /api/intake - Pending intake found:", !!pending);
    
    let session = null;
    try {
      session = await auth.api.getSession({
        headers: headers(),
      });
    } catch (authError) {
      console.warn("GET /api/intake - Auth session fetch failed (non-fatal):", authError);
    }

    if (pending) {
      // Don't await the audit log to keep the response fast and prevent hanging
      logAudit({
        userId: session?.user.id,
        action: "READ_INTAKE",
        resource: "PendingIntake",
        resourceId: pending.id,
        details: "Read pending intake status and data",
      }).catch(err => console.error("Audit log background failure:", err));
    }

    return NextResponse.json({
      currentStep: pending?.currentStep || IntakeStep.HEIGHT,
      data: pending?.data || {},
    });

  } catch (error) {
    console.error("GET /api/intake - Fatal error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    
    return NextResponse.json({ 
      error: "Internal Server Error", 
      details: errorMessage,
      stack: process.env.NODE_ENV === "development" ? errorStack : undefined 
    }, { status: 500 });
  }
}



export async function DELETE() {
  const sessionId = getIntakeSessionId();
  const pending = await getPendingIntake(sessionId);

  const session = await auth.api.getSession({
    headers: headers(),
  });

  if (pending) {
    await logAudit({
      userId: session?.user.id,
      action: "DELETE_INTAKE",
      resource: "PendingIntake",
      resourceId: pending.id,
      details: "Reset pending intake session",
    });
  }

  await deletePendingIntake(sessionId);
  
  return NextResponse.json({ message: "Intake reset" });
}


