import { defineConfig } from "drizzle-kit";

// `pnpm db:generate` diffs src/db/schema.ts against migrations/ and writes a new
// SQL file there. Wrangler applies them (`pnpm db:migrate:local` / `db:migrate:remote`)
// and the tests apply them to a fresh D1 before every run.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
