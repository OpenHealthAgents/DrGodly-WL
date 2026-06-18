import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getDetectedRegion } from "@/lib/region-server";
import { getBillablePlanPrices, getCountryCurrencyMap, getCountryPriceMap } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const region = await getDetectedRegion();
    
    // Load active products and their active plans; inactive catalog items stay hidden from the UI.
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        plans: {
          where: { isActive: true },
          include: {
            prices: true,
          },
          orderBy: { durationMonths: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      products: products.map((product) => {
        // Convert stored single-dose plan rows into the billable monthly amounts expected by the UI.
        const doseAdjustedPlans = product.plans.map((plan) => {
          const billablePrices = getBillablePlanPrices(plan.prices, product.formFactor);

          return {
            ...plan,
            priceCurrencies: getCountryCurrencyMap(billablePrices),
            prices: getCountryPriceMap(billablePrices),
          };
        });

        return {
          ...product,
          plans: doseAdjustedPlans,
        };
      }),
      region,
    });
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
