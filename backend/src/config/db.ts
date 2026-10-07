import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache on globalThis in EVERY environment (the previous NODE_ENV !==
// "production" guard meant each Vercel production instance built its own
// connection pool). Keeps the dev hot-reload behavior — tsx/vitest module
// reloads reuse the existing client instead of leaking pools.
globalForPrisma.prisma = prisma;
