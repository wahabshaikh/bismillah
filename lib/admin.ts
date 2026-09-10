/**
 * Thin super-admin layer (Makerkit-lite).
 *
 * Who is a super-admin is an **email allowlist** — `ADMIN_EMAILS`, comma
 * separated, compared case-insensitively after trimming. There is no per-user
 * role UI; the Better Auth `admin` plugin's `role` column exists only so its
 * impersonation endpoints can do their own bookkeeping (`migrations/0006`).
 *
 * ⚠️ Impersonation grants FULL access to the target account. In production you
 * should additionally: require MFA for admins, write an audit-log row per
 * impersonation, and alert the impersonated user. This template ships the
 * mechanism, not those controls.
 */
import { redirect } from "next/navigation";

type AdminEnv = { ADMIN_EMAILS?: string; DB?: D1Database };
type SessionLike = { user?: { id?: string; email?: string | null } } | null;

export function parseAdminEmails(env: AdminEnv): string[] {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdmin(env: AdminEnv, email?: string | null): boolean {
  if (!email) return false;
  return parseAdminEmails(env).includes(email.trim().toLowerCase());
}

/** RSC guard — redirects non-admins to `/dashboard`. Returns the admin user. */
export function requireSuperAdmin(
  env: AdminEnv,
  session: SessionLike
): { id: string; email: string } {
  const email = session?.user?.email ?? null;
  const id = session?.user?.id ?? null;
  if (!id || !isSuperAdmin(env, email)) redirect("/dashboard");
  return { id: id as string, email: email as string };
}

/** Resolve the allowlisted emails to user ids that actually exist in D1. */
export async function resolveAdminUserIds(env: AdminEnv): Promise<string[]> {
  const emails = parseAdminEmails(env);
  if (!emails.length || !env.DB) return [];
  try {
    const placeholders = emails.map(() => "?").join(", ");
    const rows = await env.DB.prepare(
      `SELECT id FROM "user" WHERE lower(email) IN (${placeholders})`
    )
      .bind(...emails)
      .all<{ id: string }>();
    return (rows.results ?? []).map((r) => r.id);
  } catch (err) {
    console.error("[admin] resolveAdminUserIds failed", err);
    return [];
  }
}

/**
 * Make sure the caller's `user.role` contains `admin` so Better Auth's
 * `impersonateUser` permission check passes. Only ever called after the
 * `ADMIN_EMAILS` allowlist check has already succeeded.
 */
export async function ensureAdminRole(
  env: AdminEnv,
  userId: string
): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      `UPDATE "user" SET role = 'admin' WHERE id = ? AND (role IS NULL OR role = '')`
    )
      .bind(userId)
      .run();
  } catch (err) {
    console.error("[admin] ensureAdminRole failed", err);
  }
}

export type AdminStats = { users: number; orders: number };

export async function getAdminStats(env: AdminEnv): Promise<AdminStats> {
  const out: AdminStats = { users: 0, orders: 0 };
  if (!env.DB) return out;
  try {
    const u = await env.DB.prepare(`SELECT COUNT(*) AS n FROM "user"`).first<{
      n: number;
    }>();
    out.users = u?.n ?? 0;
  } catch {
    /* table may not exist yet */
  }
  try {
    const o = await env.DB.prepare(`SELECT COUNT(*) AS n FROM orders`).first<{
      n: number;
    }>();
    out.orders = o?.n ?? 0;
  } catch {
    /* ignore */
  }
  return out;
}

/** Look up a target user by id or email for the impersonation form. */
export async function findTargetUser(
  env: AdminEnv,
  idOrEmail: string
): Promise<{ id: string; email: string; role: string | null } | null> {
  if (!env.DB) return null;
  const needle = idOrEmail.trim();
  if (!needle) return null;
  try {
    const row = await env.DB.prepare(
      `SELECT id, email, role FROM "user" WHERE id = ?1 OR lower(email) = lower(?1)`
    )
      .bind(needle)
      .first<{ id: string; email: string; role: string | null }>();
    return row ?? null;
  } catch (err) {
    console.error("[admin] findTargetUser failed", err);
    return null;
  }
}
