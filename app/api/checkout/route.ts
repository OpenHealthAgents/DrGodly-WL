import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { getIntakeSessionId } from "@/lib/session-utils";

export async function POST(req: Request) {
  try {
    const authSession = await auth.api.getSession({
      headers: headers(),
    });

    const sessionId = getIntakeSessionId();
    
    // Find the user ID either from auth session or from the pending intake
    let userId = authSession?.user.id;
    let userEmail = authSession?.user.email;

    if (!userId) {
      const pending = await prisma.pendingIntake.findUnique({
        where: { sessionId },
      });
      
      if (pending?.userId) {
        userId = pending.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        userEmail = user?.email;
      }
    }

    if (!userId || !userEmail) {
      return NextResponse.json({ error: "Unauthorized or intake session not found. Please complete the intake first." }, { status: 401 });
    }

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.stripePriceId) {
      return NextResponse.json({ error: "Invalid plan or plan not configured for Stripe" }, { status: 400 });
    }

    // Support for testing without Stripe
    if (process.env.MOCK_CHECKOUT === "true") {
      await prisma.order.create({
        data: {
          userId: userId,
          planId: plan.id,
          status: "paid",
          stripeSessionId: `mock_${Date.now()}`,
        },
      });
      return NextResponse.json({ url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?status=success` });
    }


    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: userEmail,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?status=cancelled`,
      metadata: {
        userId: userId,
        planId: plan.id,
      },
    });

    // Create a pending order
    await prisma.order.create({
      data: {
        userId: userId,
        planId: plan.id,
        status: "pending",
        stripeSessionId: checkoutSession.id,
      },
    });


    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe Checkout Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
