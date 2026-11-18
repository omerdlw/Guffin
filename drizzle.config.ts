import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  schemaFilter: ["public"],
  migrations: { schema: "drizzle", table: "migrations" },
});
