import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import debugFactory from "debug";

export * from '@prisma/client';

const {
  NODE_ENV,
  DATABASE_URL,
} = process.env;

const debug = debugFactory("rhidium:prisma");

const isProduction = NODE_ENV === "production";
const connectionString = DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prismaClient = new PrismaClient({
  adapter,
  errorFormat: "pretty",
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "stdout",
      level: "error",
    },
    {
      emit: "stdout",
      level: "info",
    },
    {
      emit: "stdout",
      level: "warn",
    },
  ],
});

if (!isProduction) {
  prismaClient.$on("query", (e) => {
    debug(
      `[Prisma Query] ${e.timestamp.toLocaleTimeString()} (${e.duration}ms) - ${e.query} - ${e.params}`,
    );
  });
}

// Use globalThis for broader environment compatibility
const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

// Declaration with global memoization
const prisma: PrismaClient = globalForPrisma.prisma ?? prismaClient;

if (NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma as prismaClient, type PrismaClient };

// Note: Bundlers generally have issues with "export * from" syntax when re-exporting from generated code
// so let's use named exports instead.
export {
  $Enums,
} from "@prisma/client";