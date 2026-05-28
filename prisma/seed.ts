import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding inventory system...");

  // 1. Create Products
  const products = [
    {
      id: "prod-semaglutide",
      name: "Semaglutide Injections",
      description: "Our most popular GLP-1 medication. A once-weekly injection that mimics the GLP-1 hormone to reduce appetite and improve blood sugar.",
      formFactor: "injection",
      image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "prod-tirzepatide",
      name: "Tirzepatide Injections",
      description: "A dual-acting GIP and GLP-1 receptor agonist. Shown to be the most potent weight loss medication currently available.",
      formFactor: "injection",
      image: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=80&w=800&auto=format&fit=crop",
    },
    {
      id: "prod-liraglutide",
      name: "Daily Weight Loss Tablets",
      description: "A daily oral alternative for those who prefer not to use injections. Highly effective for consistent appetite management.",
      formFactor: "tablet",
      image: "https://images.unsplash.com/photo-1471864190281-ad5f9f33d70e?q=80&w=800&auto=format&fit=crop",
    }
  ];

  console.log("Upserting products...");
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  // 2. Create Plans
  const plans = [
    // Semaglutide Plans
    { 
      id: "sema-1", 
      productId: "prod-semaglutide",
      drugType: "semaglutide", 
      tier: "affordable", 
      prices: { USD: 299, GBP: 229, EUR: 279, INR: 24900 }, 
      durationMonths: 1
    },
    { 
      id: "sema-3", 
      productId: "prod-semaglutide",
      drugType: "semaglutide", 
      tier: "affordable", 
      prices: { USD: 747, GBP: 573, EUR: 699, INR: 61900 }, 
      durationMonths: 3
    },
    { 
      id: "sema-6", 
      productId: "prod-semaglutide",
      drugType: "semaglutide", 
      tier: "affordable", 
      prices: { USD: 1314, GBP: 1008, EUR: 1230, INR: 109000 }, 
      durationMonths: 6
    },
    { 
      id: "sema-12", 
      productId: "prod-semaglutide",
      drugType: "semaglutide", 
      tier: "affordable", 
      prices: { USD: 2148, GBP: 1644, EUR: 2010, INR: 178000 }, 
      durationMonths: 12
    },
    
    // Tirzepatide Plans
    { 
      id: "tirz-1", 
      productId: "prod-tirzepatide",
      drugType: "tirzepatide", 
      tier: "premium", 
      prices: { USD: 399, GBP: 309, EUR: 379, INR: 33100 }, 
      durationMonths: 1
    },
    { 
      id: "tirz-3", 
      productId: "prod-tirzepatide",
      drugType: "tirzepatide", 
      tier: "premium", 
      prices: { USD: 897, GBP: 690, EUR: 840, INR: 74500 }, 
      durationMonths: 3
    },

    // Liraglutide (Tablet) Plans
    { 
      id: "lira-1", 
      productId: "prod-liraglutide",
      drugType: "liraglutide", 
      tier: "standard", 
      prices: { USD: 349, GBP: 269, EUR: 329, INR: 29000 }, 
      durationMonths: 1
    }
  ];

  console.log("Upserting plans...");
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan as any,
    });
  }

  // 3. Seed initial trust content
  console.log("Seeding trust content...");
  const trustItems = [
    {
      id: "seed-trust-1",
      type: "testimonial",
      title: "Life Changing Results",
      description: "Lost 12kg in 3 months and I've never felt better. The once-weekly injection is so convenient.",
      metadata: { author: "Sarah M.", loss: "12kg lost", rating: 5 },
      isActive: true,
    },
    {
      id: "seed-trust-2",
      type: "testimonial",
      title: "Finally Found Success",
      description: "Finally something that worked. I had tried every diet under the sun before Wellora.",
      metadata: { author: "James L.", loss: "15kg lost", rating: 5 },
      isActive: true,
    },
    {
      id: "seed-stat-1",
      type: "stat",
      title: "Proven Outcomes",
      description: "Users typically lose 5–10% of their body weight within the first 6 months.",
      metadata: { value: "5-10%", metric: "Weight Loss" },
      isActive: true,
    }
  ];

  for (const item of trustItems) {
    await prisma.trustContent.upsert({
      where: { id: item.id },
      update: item,
      create: item as any,
    });
  }

  console.log("Inventory seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
