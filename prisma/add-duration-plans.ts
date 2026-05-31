import "dotenv/config";

const DURATION_DISCOUNTS: Record<number, number> = {
  3: 0.1,
  6: 0.18,
  12: 0.25,
};

async function createPrisma() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to add duration plans.");
  }

  const [{ PrismaClient }, { PrismaPg }, pgModule] = await Promise.all([
    import("@prisma/client"),
    import("@prisma/adapter-pg"),
    import("pg"),
  ]);
  const pool = new pgModule.default.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return { prisma, pool };
}

function targetPlanId(basePlanId: string, durationMonths: number) {
  return `${basePlanId}-${durationMonths}mo`;
}

function discountedTotal(monthlyAmount: number, durationMonths: number) {
  const discount = DURATION_DISCOUNTS[durationMonths];
  const total = monthlyAmount * durationMonths * (1 - discount);

  return Math.round(total * 100) / 100;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const updateExisting = process.argv.includes("--update-existing");
  const { prisma, pool } = await createPrisma();

  let plansCreated = 0;
  let plansExisting = 0;
  let pricesCreated = 0;
  let pricesUpdated = 0;

  try {
    const basePlans = await prisma.plan.findMany({
      where: {
        durationMonths: 1,
        isActive: true,
        product: { isActive: true },
      },
      include: {
        prices: true,
      },
      orderBy: { id: "asc" },
    });

    for (const basePlan of basePlans) {
      for (const durationMonths of Object.keys(DURATION_DISCOUNTS).map(Number)) {
        const planId = targetPlanId(basePlan.id, durationMonths);
        const existingPlan = await prisma.plan.findFirst({
          where: {
            OR: [
              { id: planId },
              {
                productId: basePlan.productId,
                drugType: basePlan.drugType,
                tier: basePlan.tier,
                durationMonths,
              },
            ],
          },
          include: { prices: true },
        });

        if (dryRun) {
          if (existingPlan) {
            plansExisting += 1;
          } else {
            plansCreated += 1;
          }

          for (const price of basePlan.prices) {
            const existingPrice = existingPlan?.prices.find((item) => item.country === price.country);
            if (!existingPrice) {
              pricesCreated += 1;
            } else if (updateExisting) {
              pricesUpdated += 1;
            }
          }

          continue;
        }

        const plan = existingPlan || await prisma.plan.create({
          data: {
            id: planId,
            productId: basePlan.productId,
            drugType: basePlan.drugType,
            tier: basePlan.tier,
            durationMonths,
            isActive: basePlan.isActive,
          },
          include: { prices: true },
        });

        if (existingPlan) {
          plansExisting += 1;
        } else {
          plansCreated += 1;
        }

        for (const price of basePlan.prices) {
          const amount = discountedTotal(price.amount, durationMonths);
          const existingPrice = plan.prices.find((item) => item.country === price.country);

          if (existingPrice && !updateExisting) {
            continue;
          }

          await prisma.planPrice.upsert({
            where: {
              planId_country: {
                planId: plan.id,
                country: price.country,
              },
            },
            update: {
              currency: price.currency,
              amount,
            },
            create: {
              planId: plan.id,
              country: price.country,
              currency: price.currency,
              amount,
            },
          });

          if (existingPrice) {
            pricesUpdated += 1;
          } else {
            pricesCreated += 1;
          }
        }
      }
    }

    console.log(`${dryRun ? "Would process" : "Processed"} ${basePlans.length} active 1-month plans.`);
    console.log(`${dryRun ? "Would create" : "Created"} ${plansCreated} duration plans.`);
    console.log(`${plansExisting} duration plans already existed.`);
    console.log(`${dryRun ? "Would create" : "Created"} ${pricesCreated} duration prices.`);
    if (updateExisting) {
      console.log(`${dryRun ? "Would update" : "Updated"} ${pricesUpdated} existing duration prices.`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
