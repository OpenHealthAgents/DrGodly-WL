import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined. Please add it to your environment variables.");
}

const pool = new pg.Pool({ 
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1") 
    ? false 
    : { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
...
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

