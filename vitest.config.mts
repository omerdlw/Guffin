import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    server: { deps: { inline: ["@omerdlw/base-framework"] } },
    include: ["src/**/*.test.ts"],
  },
});
