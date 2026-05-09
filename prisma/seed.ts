import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding initial trust content...");

  const items = [
    // Testimonials
    {
      type: "testimonial",
      title: "Life Changing Results",
      description: "Lost 12kg in 3 months and I've never felt better. The once-weekly injection is so convenient.",
      metadata: { author: "Sarah M.", loss: "12kg lost", rating: 5 },
      isActive: true,
    },
    {
      type: "testimonial",
      title: "Finally Found Success",
      description: "Finally something that worked. I had tried every diet under the sun before Wellora.",
      metadata: { author: "James L.", loss: "15kg lost", rating: 5 },
      isActive: true,
    },
    {
      type: "testimonial",
      title: "Exceptional Support",
      description: "The medical support and coaching team are incredible. They really care about your progress.",
      metadata: { author: "Emma R.", loss: "8kg lost", rating: 5 },
      isActive: true,
    },
    // Stats
    {
      type: "stat",
      title: "Proven Outcomes",
      description: "Users typically lose 5–10% of their body weight within the first 6 months.",
      metadata: { value: "5-10%", metric: "Weight Loss" },
      isActive: true,
    },
    {
      type: "stat",
      title: "Rapid Results",
      description: "Most users see measurable results within 4–8 weeks of starting their program.",
      metadata: { value: "4-8", metric: "Weeks" },
      isActive: true,
    },
  ];

  for (const item of items) {
    await prisma.trustContent.upsert({
      where: { id: `seed-${item.title.replace(/\s+/g, "-").toLowerCase()}` },
      update: item,
      create: {
        id: `seed-${item.title.replace(/\s+/g, "-").toLowerCase()}`,
        ...item,
        metadata: item.metadata as any,
      },
    });
  }

  console.log("Seeding plans...");

  const plans = [
    { id: "sema-1", drugType: "semaglutide", tier: "affordable", price: 299, durationMonths: 1, stripePriceId: "price_sema_1m" },
    { id: "sema-3", drugType: "semaglutide", tier: "affordable", price: 747, durationMonths: 3, stripePriceId: "price_sema_3m" },
    { id: "sema-6", drugType: "semaglutide", tier: "affordable", price: 1314, durationMonths: 6, stripePriceId: "price_sema_6m" },
    { id: "sema-12", drugType: "semaglutide", tier: "affordable", price: 2148, durationMonths: 12, stripePriceId: "price_sema_12m" },
    { id: "tirz-1", drugType: "tirzepatide", tier: "premium", price: 399, durationMonths: 1, stripePriceId: "price_tirz_1m" },
    { id: "tirz-3", drugType: "tirzepatide", tier: "premium", price: 897, durationMonths: 3, stripePriceId: "price_tirz_3m" },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
