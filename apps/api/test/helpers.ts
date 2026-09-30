import { exports } from "cloudflare:workers";

export const BASE = "http://localhost:8787";

export function request(path: string, init?: RequestInit) {
  return exports.default.fetch(new Request(`${BASE}${path}`, init));
}

let counter = 0;

/** Signs up a fresh user and returns a Cookie header for their session. */
export async function signUp(overrides: { email?: string; ip?: string } = {}) {
  counter += 1;
  const email = overrides.email ?? `user${counter}-${crypto.randomUUID()}@example.com`;
  const response = await request("/api/auth/sign-up/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": overrides.ip ?? `10.0.0.${counter}`,
    },
    body: JSON.stringify({ email, password: "correct horse battery", name: "Test User" }),
  });
  if (response.status !== 200) {
    throw new Error(`sign-up failed: ${response.status} ${await response.text()}`);
  }
  const cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return { email, cookie, body: (await response.json()) as { user: { id: string } } };
}
