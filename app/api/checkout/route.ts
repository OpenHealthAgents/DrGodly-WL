import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured, toRazorpayAmount } from "@/lib/razorpay";
import { getDetectedRegion } from "@/lib/region-server";
import { getBillablePlanPriceForRegion, getConsultationFee, getDoseMultiplierForFormFactor, getOrderTotal, getShippingFee } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const RAZORPAY_SUPPORTED_CURRENCIES = new Set(["INR"]);



export async function POST(req: Request) {
  try {
    // The checkout endpoint is intentionally server-side only because it depends on auth and Razorpay secrets.
    const authSession = await auth.api.getSession({
      headers: await headers(),
    });

    if (!authSession) {
      return NextResponse.json({ error: "Unauthorized. Please log in to complete your order." }, { status: 401 });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json({ error: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." }, { status: 500 });
    }

    const userId = authSession.user.id;
    const userEmail = authSession.user.email;
    const region = await getDetectedRegion();

    const { planId, address } = await req.json();


    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: {
        product: true,
        prices: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Compute the region-aware, dose-adjusted medication charge before adding service fees.
    const price = getBillablePlanPriceForRegion(plan.prices, region, plan.product.formFactor);
    const doseMultiplier = getDoseMultiplierForFormFactor(plan.product.formFactor);

    if (!RAZORPAY_SUPPORTED_CURRENCIES.has(price.currency)) {
      return NextResponse.json({
        error: `Razorpay checkout currently supports INR payments only. Selected plan currency is ${price.currency}.`,
      }, { status: 400 });
    }

    const consultationFee = getConsultationFee(price.currency);
    const shippingFee = getShippingFee(price.currency);
    // Razorpay expects the final order total, not just the medication subtotal.
    const totalPrice = getOrderTotal(price.amount, price.currency);
    const amount = toRazorpayAmount(totalPrice);

    if (amount < 100) {
      return NextResponse.json({ error: "Order amount must be at least 100 paise." }, { status: 400 });
    }

    const receipt = `order_${Date.now()}`;
    const razorpayOrder = await createRazorpayOrder({
      amount,
      currency: price.currency,
      receipt,
      notes: {
        userId,
        planId: plan.id,
        email: userEmail,
        country: price.country,
        currency: price.currency,
        doseMultiplier: String(doseMultiplier),
        consultationFee: String(consultationFee),
        shippingFee: String(shippingFee),
        street: address?.street || "",
        city: address?.city || "",
        state: address?.state || "",
        zip: address?.zip || "",
      },
    });

    await prisma.order.create({
      data: {
        userId: userId,
        planId: plan.id,
        status: "pending",
        razorpayOrderId: razorpayOrder.id,
      },
    });

    return NextResponse.json({
      key: getRazorpayKeyId(),
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      name: "DrGodly",
      description: `${plan.drugType} ${plan.durationMonths}-month program`,
      prefill: {
        email: userEmail,
        name: authSession.user.name || "",
      },
      total: totalPrice,
      medicationTotal: price.amount,
      doseMultiplier,
      consultationFee,
      shippingFee,
    });
  } catch (error) {
    console.error("Razorpay Checkout Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
