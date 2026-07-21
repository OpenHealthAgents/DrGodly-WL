import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import { hashPassword } from "better-auth/crypto";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_ACCOUNT_EMAIL = process.env.TEST_ACCOUNT_EMAIL || "test@drgodly.com";
const TEST_ACCOUNT_PASSWORD = process.env.TEST_ACCOUNT_PASSWORD || "DrGodly123!";

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
      countryPrices: [
        { country: "US", currency: "USD", amount: 299 },
        { country: "GB", currency: "GBP", amount: 229 },
        { country: "DE", currency: "EUR", amount: 279 },
        { country: "FR", currency: "EUR", amount: 279 },
        { country: "IN", currency: "INR", amount: 24900 },
      ],
      durationMonths: 1
    },
    { 
      id: "sema-3", 
      productId: "prod-semaglutide",
      drugType: "semaglutide", 
      tier: "affordable", 
      countryPrices: [
        { country: "US", currency: "USD", amount: 747 },
        { country: "GB", currency: "GBP", amount: 573 },
        { country: "DE", currency: "EUR", amount: 699 },
        { country: "FR", currency: "EUR", amount: 699 },
        { country: "IN", currency: "INR", amount: 61900 },
      ],
      durationMonths: 3
    },
    { 
      id: "sema-6", 
      productId: "prod-semaglutide",
      drugType: "semaglutide", 
      tier: "affordable", 
      countryPrices: [
        { country: "US", currency: "USD", amount: 1314 },
        { country: "GB", currency: "GBP", amount: 1008 },
        { country: "DE", currency: "EUR", amount: 1230 },
        { country: "FR", currency: "EUR", amount: 1230 },
        { country: "IN", currency: "INR", amount: 109000 },
      ],
      durationMonths: 6
    },
    { 
      id: "sema-12", 
      productId: "prod-semaglutide",
      drugType: "semaglutide", 
      tier: "affordable", 
      countryPrices: [
        { country: "US", currency: "USD", amount: 2148 },
        { country: "GB", currency: "GBP", amount: 1644 },
        { country: "DE", currency: "EUR", amount: 2010 },
        { country: "FR", currency: "EUR", amount: 2010 },
        { country: "IN", currency: "INR", amount: 178000 },
      ],
      durationMonths: 12
    },
    
    // Tirzepatide Plans
    { 
      id: "tirz-1", 
      productId: "prod-tirzepatide",
      drugType: "tirzepatide", 
      tier: "premium", 
      countryPrices: [
        { country: "US", currency: "USD", amount: 399 },
        { country: "GB", currency: "GBP", amount: 309 },
        { country: "DE", currency: "EUR", amount: 379 },
        { country: "FR", currency: "EUR", amount: 379 },
        { country: "IN", currency: "INR", amount: 33100 },
      ],
      durationMonths: 1
    },
    { 
      id: "tirz-3", 
      productId: "prod-tirzepatide",
      drugType: "tirzepatide", 
      tier: "premium", 
      countryPrices: [
        { country: "US", currency: "USD", amount: 897 },
        { country: "GB", currency: "GBP", amount: 690 },
        { country: "DE", currency: "EUR", amount: 840 },
        { country: "FR", currency: "EUR", amount: 840 },
        { country: "IN", currency: "INR", amount: 74500 },
      ],
      durationMonths: 3
    },

    // Liraglutide (Tablet) Plans
    { 
      id: "lira-1", 
      productId: "prod-liraglutide",
      drugType: "liraglutide", 
      tier: "standard", 
      countryPrices: [
        { country: "US", currency: "USD", amount: 349 },
        { country: "GB", currency: "GBP", amount: 269 },
        { country: "DE", currency: "EUR", amount: 329 },
        { country: "FR", currency: "EUR", amount: 329 },
        { country: "IN", currency: "INR", amount: 29000 },
      ],
      durationMonths: 1
    }
  ];

  console.log("Upserting plans...");
  for (const plan of plans) {
    const { countryPrices, ...planData } = plan;

    await prisma.plan.upsert({
      where: { id: planData.id },
      update: planData,
      create: planData,
    });

    for (const price of countryPrices) {
      await prisma.planPrice.upsert({
        where: {
          planId_country: {
            planId: planData.id,
            country: price.country,
          },
        },
        update: price,
        create: {
          ...price,
          planId: planData.id,
        },
      });
    }
  }

  // 3. Seed initial trust content
  console.log("Seeding trust content...");
  const trustItems = [
    {
      id: "seed-trust-1",
      type: "testimonial",
      title: "Life Changing Results",
      description: "Lost 12kg in 3 months and I've never felt better. The once-weekly injection is so convenient.",
      metadata: { author: "Ananya R.", loss: "12kg lost", rating: 5 },
      isActive: true,
    },
    {
      id: "seed-trust-2",
      type: "testimonial",
      title: "Finally Found Success",
      description: "Finally something that worked. I had tried every diet under the sun before DrGodly.",
      metadata: { author: "Vikram S.", loss: "15kg lost", rating: 5 },
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

  console.log("Seeding test auth account...");
  const testUser = await prisma.user.upsert({
    where: { email: TEST_ACCOUNT_EMAIL },
    update: {
      name: "Test User",
    },
    create: {
      email: TEST_ACCOUNT_EMAIL,
      name: "Test User",
    },
  });

  const passwordHash = await hashPassword(TEST_ACCOUNT_PASSWORD);
  const existingAccount = await prisma.account.findFirst({
    where: {
      userId: testUser.id,
      providerId: "credential",
    },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: {
        accountId: testUser.id,
        providerId: "credential",
        userId: testUser.id,
        password: passwordHash,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: testUser.id,
        providerId: "credential",
        userId: testUser.id,
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log(`Test account ready: ${TEST_ACCOUNT_EMAIL} / ${TEST_ACCOUNT_PASSWORD}`);

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
