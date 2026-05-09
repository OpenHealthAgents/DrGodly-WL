import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not defined in the environment variables.");
}

// Create a new pool with SSL enabled for production (Neon)
const pool = new pg.Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10, // Limit connections for serverless environments
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
