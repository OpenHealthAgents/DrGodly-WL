import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;
    const userId = session.metadata?.userId;

    if (userId) {
      await prisma.order.update({
        where: { stripeSessionId: session.id },
        data: {
          status: "paid",
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
        },
      });
    }
  }

  if (event.type === "invoice.payment_succeeded") {
    // Handle recurring payment logic if needed
  }

  if (event.type === "customer.subscription.deleted") {
    // Mark subscription as cancelled in DB
  }


  return NextResponse.json({ received: true });
}
