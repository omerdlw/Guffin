import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/db/schema.ts",
  out: "./scripts/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  schemaFilter: ["public"],
  migrations: { schema: "drizzle", table: "migrations" },
});
