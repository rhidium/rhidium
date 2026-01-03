import path from "node:path";
import { defineConfig, type PrismaConfigInternal } from "prisma/config";

const config: PrismaConfigInternal = defineConfig({
  schema: path.join("prisma"),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  views: {
    path: path.join("prisma", "views"),
  },
  typedSql: {
    path: path.join("prisma", "queries"),
  },
});

export default config;