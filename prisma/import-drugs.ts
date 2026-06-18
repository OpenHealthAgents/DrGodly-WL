import { readFile } from "fs/promises";
import { join } from "path";
import "dotenv/config";

interface DrugCsvRow {
  name: string;
  activeIngredient: string;
  manufacturer: string;
  description: string;
  formFactor: string;
  country: string;
  currency: string;
  price: string;
  image: string;
}

const COUNTRY_ALIASES: Record<string, string> = {
  india: "IN",
  in: "IN",
  bharat: "IN",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  us: "US",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  germany: "DE",
  de: "DE",
  france: "FR",
  fr: "FR",
  canada: "CA",
  ca: "CA",
  australia: "AU",
  au: "AU",
};

const CURRENCY_ALIASES: Record<string, string> = {
  "₹": "INR",
  rs: "INR",
  inr: "INR",
  rupee: "INR",
  rupees: "INR",
  "$": "USD",
  usd: "USD",
  dollar: "USD",
  dollars: "USD",
  "£": "GBP",
  gbp: "GBP",
  pound: "GBP",
  pounds: "GBP",
  "€": "EUR",
  eur: "EUR",
  euro: "EUR",
  euros: "EUR",
  cad: "CAD",
  aud: "AUD",
};

function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) {
    rows.push(row);
  }

  return rows;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function normalizeFormFactor(value: string) {
  const lower = value.toLowerCase();

  // Normalize free-form CSV labels into the small set the app understands.
  if (lower.includes("tablet")) return "tablet";
  if (lower.includes("capsule")) return "capsule";
  if (lower.includes("pen")) return "pre-filled-pen";
  if (lower.includes("vial")) return "vial";
  if (lower.includes("syringe")) return "syringe";
  if (lower.includes("injection")) return "injection";

  return value.trim() || "other";
}

function parsePrice(value: string) {
  const normalized = value.replace(/[^\d.]/g, "");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Invalid price: ${value}`);
  }

  return amount;
}

function normalizeCountry(value: string, price: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized) {
    // Accept either "India" or "IN"; the database stores the ISO-3166 country code.
    const country = COUNTRY_ALIASES[normalized] || value.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(country)) {
      throw new Error(`Invalid country "${value}". Use ISO codes like IN, US, GB or known country names.`);
    }
    return country;
  }

  if (price.includes("₹")) return "IN";
  if (price.includes("$")) return "US";
  if (price.includes("£")) return "GB";
  if (price.includes("€")) return "DE";

  return "IN";
}

function normalizeCurrency(value: string, price: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized) {
    // Keep currency as ISO-4217 so downstream formatting stays consistent.
    const currency = CURRENCY_ALIASES[normalized] || value.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error(`Invalid currency "${value}". Use ISO codes like INR, USD, GBP or known symbols.`);
    }
    return currency;
  }

  if (price.includes("₹")) return "INR";
  if (price.includes("$")) return "USD";
  if (price.includes("£")) return "GBP";
  if (price.includes("€")) return "EUR";

  return "INR";
}

function getTier(activeIngredient: string, formFactor: string) {
  const lower = activeIngredient.toLowerCase();
  const normalizedFormFactor = formFactor.toLowerCase();

  // The import script infers the tier from the medication family and dosage presentation.
  if (lower.includes("tirzepatide")) return "premium";
  if (lower.includes("semaglutide") && normalizedFormFactor.includes("pen")) return "standard";
  if (lower.includes("semaglutide")) return "affordable";

  return "standard";
}

function toDrugType(activeIngredient: string) {
  const lower = activeIngredient.toLowerCase();

  if (lower.includes("semaglutide")) return "semaglutide";
  if (lower.includes("tirzepatide")) return "tirzepatide";
  if (lower.includes("liraglutide")) return "liraglutide";

  return slugify(activeIngredient) || "other";
}

function toRecords(rows: string[][]): DrugCsvRow[] {
  const [headers, ...dataRows] = rows;
  const normalizedHeaders = headers.map((header) => header.trim());

  return dataRows.map((dataRow) => {
    const record = normalizedHeaders.reduce<Record<string, string>>((result, header, index) => {
      result[header] = dataRow[index]?.trim() || "";
      return result;
    }, {});

    return {
      name: record.name,
      activeIngredient: record.activeIngredient,
      manufacturer: record.manufacturer,
      description: record.description,
      formFactor: record.formFactor,
      country: normalizeCountry(record.country, record.price),
      currency: normalizeCurrency(record.currency, record.price),
      price: record.price,
      image: record.image,
    };
  });
}

async function createPrisma() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to import drugs.");
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

async function main() {
  const filePath = join(process.cwd(), "Indian Weight Loss Drugs.csv");
  const file = await readFile(filePath, "utf8");
  const records = toRecords(parseCsv(file));
  const validRecords = records.filter((record) => record.name && record.activeIngredient && record.price);
  const skipped = records.length - validRecords.length;
  const dryRun = process.argv.includes("--dry-run");

  for (const record of validRecords) {
    parsePrice(record.price);
  }

  if (dryRun) {
    const countries = new Set(validRecords.map((record) => record.country));
    const currencies = new Set(validRecords.map((record) => record.currency));

    console.log(`Validated ${validRecords.length} drug rows from ${filePath}.`);
    console.log(`Countries: ${Array.from(countries).sort().join(", ")}`);
    console.log(`Currencies: ${Array.from(currencies).sort().join(", ")}`);
    if (skipped > 0) {
      console.log(`Skipped ${skipped} incomplete rows.`);
    }
    console.log("No database writes performed.");
    return;
  }

  const { prisma, pool } = await createPrisma();

  let imported = 0;

  try {
    for (const record of records) {
      if (!record.name || !record.activeIngredient || !record.price) {
        // Skip incomplete rows instead of failing the entire import batch.
        console.warn(`Skipping incomplete drug row: ${record.name || "(missing name)"}`);
        continue;
      }

      // Product rows model the catalog item itself; plan rows model the purchasable treatment bundle.
      const productId = `drug-${slugify(record.name)}`;
      const planId = `plan-${slugify(record.name)}`;
      const country = record.country;
      const currency = record.currency;

      await prisma.product.upsert({
        where: { id: productId },
        update: {
          name: record.name,
          activeIngredient: record.activeIngredient,
          manufacturer: record.manufacturer,
          description: record.description,
          formFactor: normalizeFormFactor(record.formFactor),
          image: record.image || null,
          isActive: true,
        },
        create: {
          id: productId,
          name: record.name,
          activeIngredient: record.activeIngredient,
          manufacturer: record.manufacturer,
          description: record.description,
          formFactor: normalizeFormFactor(record.formFactor),
          image: record.image || null,
          isActive: true,
        },
      });

      await prisma.plan.upsert({
        where: { id: planId },
        update: {
          productId,
          drugType: toDrugType(record.activeIngredient),
          tier: getTier(record.activeIngredient, record.formFactor),
          durationMonths: 1,
          isActive: true,
        },
        create: {
          id: planId,
          productId,
          drugType: toDrugType(record.activeIngredient),
          tier: getTier(record.activeIngredient, record.formFactor),
          durationMonths: 1,
          isActive: true,
        },
      });

      await prisma.planPrice.upsert({
        where: {
          planId_country: {
            planId,
            country,
          },
        },
        update: {
          currency,
          amount: parsePrice(record.price),
        },
        create: {
          planId,
          country,
          currency,
          amount: parsePrice(record.price),
        },
      });

      imported += 1;
    }

    console.log(`Imported ${imported} drug products from ${filePath}.`);
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
