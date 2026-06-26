import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Razorpay signature" }, { status: 400 });
  }

  try {
    const isValid = verifyRazorpayWebhookSignature(body, signature);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid Razorpay signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id;
    const paymentId = payment?.id;

    // Treat successful capture/authorization as the source of truth for paid orders.
    if ((event.event === "payment.captured" || event.event === "payment.authorized" || event.event === "order.paid") && orderId) {
      await prisma.order.updateMany({
        where: { razorpayOrderId: orderId },
        data: {
          status: "paid",
          ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
        },
      });
    }

    if (event.event === "payment.failed" && orderId) {
      await prisma.order.updateMany({
        where: { razorpayOrderId: orderId },
        data: { status: "failed" },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
