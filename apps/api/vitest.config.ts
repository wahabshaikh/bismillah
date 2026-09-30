import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// Wrangler reads required secrets from .dev.vars or process.env; CI has neither.
process.env["BETTER_AUTH_SECRET"] ??= "test-secret-that-is-at-least-32-characters-long";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          // Applied to the local D1 by test/setup.ts before each test file.
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
        },
      },
    })),
  ],
  test: {
    setupFiles: ["./test/setup.ts"],
  },
});
