import { test, expect } from "@playwright/test";

/**
 * Smoke skeleton. These hit a running dev/prod server at `baseURL`
 * (default http://127.0.0.1:5173). When no server is reachable, each test
 * skips rather than fails — so `npm run test:e2e` is safe in CI without a
 * server and never blocks `npm run build`.
 *
 * The Polar webhook receiver has its own smoke file: `e2e/polar-webhook.spec.ts`
 * (mock `order.paid` + idempotent replay).
 */

async function serverUp(request: import("@playwright/test").APIRequestContext, baseURL?: string) {
  if (!baseURL) return false;
  try {
    const res = await request.get("/", { timeout: 3000 });
    return res.ok();
  } catch {
    return false;
  }
}

test.describe("bismillah smoke", () => {
  test("home page loads with Bismillah branding", async ({ page, request, baseURL }) => {
    test.skip(!(await serverUp(request, baseURL)), "no server at baseURL");
    await page.goto("/");
    await expect(page).toHaveTitle(/Bismillah/i);
  });

  test("login page has an email + password form", async ({ page, request, baseURL }) => {
    test.skip(!(await serverUp(request, baseURL)), "no server at baseURL");
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("settings redirects to /login when unauthenticated", async ({ page, request, baseURL }) => {
    test.skip(!(await serverUp(request, baseURL)), "no server at baseURL");
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("pricing page renders a call to action", async ({ page, request, baseURL }) => {
    test.skip(!(await serverUp(request, baseURL)), "no server at baseURL");
    await page.goto("/pricing");
    await expect(page.getByRole("link", { name: /buy/i }).first()).toBeVisible();
  });
});
