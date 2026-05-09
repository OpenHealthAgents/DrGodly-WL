import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardView from "@/components/DashboardView";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: headers(),
  });

  if (!session) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      orders: {
        include: {
          plan: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      intake: true,
    },
  });

  if (!user) {
    redirect("/");
  }

  // Current plan is the most recent order
  const latestOrder = user.orders[0];
  const currentPlan = latestOrder
    ? {
        drugType: latestOrder.plan.drugType,
        tier: latestOrder.plan.tier,
        price: latestOrder.plan.price,
        durationMonths: latestOrder.plan.durationMonths,
        status: latestOrder.status,
        createdAt: latestOrder.createdAt.toISOString(),
      }
    : undefined;

  const dashboardData = {
    user: {
      email: user.email,
      name: user.name,
    },
    currentPlan,
    orders: user.orders.map((o) => ({
      id: o.id,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      plan: {
        drugType: o.plan.drugType,
        tier: o.plan.tier,
        price: o.plan.price,
        durationMonths: o.plan.durationMonths,
      },
    })),
    intake: user.intake
      ? {
          weight: user.intake.weight,
          goalWeight: user.intake.goalWeight,
        }
      : undefined,
  };

  return <DashboardView data={dashboardData} />;
}
