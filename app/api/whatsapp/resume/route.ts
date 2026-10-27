import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Resumes a WhatsApp qualified intake session in the web browser.
 * Sets the intake session cookie and redirects the patient to /results.
 */
export async function GET(req: NextRequest) {
  const sessionParam = req.nextUrl.searchParams.get("session");

  if (!sessionParam) {
    return NextResponse.redirect(new URL("/intake", req.url));
  }

  try {
    const pending = await prisma.pendingIntake.findUnique({
      where: { sessionId: sessionParam },
    });

    const response = NextResponse.redirect(new URL("/results", req.url));
    response.cookies.set("drgodly_intake_session", sessionParam, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[WhatsApp Resume] Failed to resume session:", error);
    const fallbackResponse = NextResponse.redirect(new URL("/results", req.url));
    fallbackResponse.cookies.set("drgodly_intake_session", sessionParam, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return fallbackResponse;
  }
}
