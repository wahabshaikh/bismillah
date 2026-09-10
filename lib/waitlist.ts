/**
 * Pre-launch waitlist — one row per email in D1 `waitlist`
 * (`migrations/0007_p2.sql`).
 *
 * Demo-safe: D1 errors are swallowed into `{ ok: false, error }` so a missing
 * migration / unbound DB never crashes `POST /api/waitlist`. On a UNIQUE
 * conflict the helper returns `{ ok: true, already: true }` — the caller must
 * not leak whether the address was new.
 */

export type WaitlistEnv = { DB?: D1Database };

export type JoinWaitlistInput = {
  email: string;
  name?: string | null;
  source?: string | null;
};

export type JoinWaitlistResult =
  | { ok: true; already?: boolean }
  | { ok: false; error: string };

/** Loose email shape check — good enough to reject obvious junk. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function joinWaitlist(
  env: WaitlistEnv,
  input: JoinWaitlistInput
): Promise<JoinWaitlistResult> {
  const email = normalizeEmail(input.email ?? "");
  if (!looksLikeEmail(email)) {
    return { ok: false, error: "invalid email" };
  }
  if (!env.DB) return { ok: false, error: "DB not bound" };

  const name = input.name?.trim() || null;
  const source = input.source?.trim() || null;

  try {
    await env.DB.prepare(
      "INSERT INTO waitlist (id, email, name, source) VALUES (?1, ?2, ?3, ?4)"
    )
      .bind(crypto.randomUUID(), email, name, source)
      .run();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // SQLite UNIQUE violation → already on the list. Do not surface that
    // distinction to the caller's response body.
    if (/UNIQUE|constraint/i.test(message)) {
      return { ok: true, already: true };
    }
    console.error("[waitlist] insert failed", message);
    return { ok: false, error: "could not join waitlist" };
  }
}

export type WaitlistCount = { total: number };

/** Owner-facing count (used by the optional owner ping copy). */
export async function getWaitlistCount(env: WaitlistEnv): Promise<WaitlistCount> {
  if (!env.DB) return { total: 0 };
  try {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM waitlist"
    ).first<{ total: number }>();
    return { total: Number(row?.total ?? 0) };
  } catch (err) {
    console.error("[waitlist] count failed", err);
    return { total: 0 };
  }
}
