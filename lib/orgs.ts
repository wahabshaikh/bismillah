/**
 * Organizations — flag-gated (`ENABLE_ORGS="true"`).
 *
 * `migrations/0005_orgs.sql` creates thin `organization` / `organization_member`
 * / `invitation` tables shaped for the Better Auth organization plugin. This
 * module adds the minimum D1 helpers the lite UI needs (`/orgs`). When the flag
 * is off the pages redirect and the API 404s — multi-tenant UX is never forced
 * on a single-user template.
 *
 * Every helper is demo-safe: D1 errors are swallowed and a sane default is
 * returned so a missing migration never crashes a page.
 */

type OrgsEnv = { ENABLE_ORGS?: string; DB?: D1Database };

export function isOrgsEnabled(env: OrgsEnv): boolean {
  return env.ENABLE_ORGS === "true";
}

export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export function isOrgRole(v: string): v is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(v);
}

export type Organization = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type OrgWithRole = Organization & { role: OrgRole };
export type OrgMember = { userId: string; role: OrgRole; email: string | null };
export type OrgInvitation = {
  id: string;
  email: string;
  role: OrgRole;
  status: string;
  createdAt: string;
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function listUserOrgs(
  env: OrgsEnv,
  userId: string
): Promise<OrgWithRole[]> {
  if (!env.DB) return [];
  try {
    const rows = await env.DB.prepare(
      `SELECT o.id, o.name, o.slug, o.createdAt AS createdAt, m.role AS role
         FROM organization o
         JOIN organization_member m ON m.organizationId = o.id
        WHERE m.userId = ?
        ORDER BY o.createdAt DESC`
    )
      .bind(userId)
      .all<OrgWithRole>();
    return (rows.results ?? []).map((r) => ({
      ...r,
      role: isOrgRole(r.role) ? r.role : "member",
    }));
  } catch (err) {
    console.error("[orgs] listUserOrgs failed", err);
    return [];
  }
}

export async function getOrganization(
  env: OrgsEnv,
  id: string
): Promise<Organization | null> {
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare(
      `SELECT id, name, slug, createdAt AS createdAt FROM organization WHERE id = ?`
    )
      .bind(id)
      .first<Organization>();
    return row ?? null;
  } catch (err) {
    console.error("[orgs] getOrganization failed", err);
    return null;
  }
}

export async function getUserOrgRole(
  env: OrgsEnv,
  orgId: string,
  userId: string
): Promise<OrgRole | null> {
  if (!env.DB) return null;
  try {
    const row = await env.DB.prepare(
      `SELECT role FROM organization_member WHERE organizationId = ? AND userId = ?`
    )
      .bind(orgId, userId)
      .first<{ role: string }>();
    if (!row) return null;
    return isOrgRole(row.role) ? row.role : "member";
  } catch (err) {
    console.error("[orgs] getUserOrgRole failed", err);
    return null;
  }
}

export async function createOrganization(
  env: OrgsEnv,
  opts: { name: string; slug?: string; userId: string }
): Promise<{ ok: true; org: Organization } | { ok: false; error: string }> {
  if (!env.DB) return { ok: false, error: "database unavailable" };
  const name = opts.name.trim();
  if (name.length < 2) return { ok: false, error: "name is too short" };
  const slug = slugify(opts.slug?.trim() || name);
  if (!slug) return { ok: false, error: "could not derive a slug" };

  const id = crypto.randomUUID();
  try {
    const existing = await env.DB.prepare(
      `SELECT id FROM organization WHERE slug = ?`
    )
      .bind(slug)
      .first<{ id: string }>();
    if (existing) return { ok: false, error: "that slug is taken" };

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO organization (id, name, slug) VALUES (?, ?, ?)`
      ).bind(id, name, slug),
      env.DB.prepare(
        `INSERT INTO organization_member (id, organizationId, userId, role)
         VALUES (?, ?, ?, 'owner')`
      ).bind(crypto.randomUUID(), id, opts.userId),
    ]);
  } catch (err) {
    console.error("[orgs] createOrganization failed", err);
    return { ok: false, error: "could not create organization" };
  }

  const org = await getOrganization(env, id);
  return org
    ? { ok: true, org }
    : { ok: false, error: "created but could not read back" };
}

export async function listOrgMembers(
  env: OrgsEnv,
  orgId: string
): Promise<OrgMember[]> {
  if (!env.DB) return [];
  try {
    const rows = await env.DB.prepare(
      `SELECT m.userId AS userId, m.role AS role, u.email AS email
         FROM organization_member m
         LEFT JOIN "user" u ON u.id = m.userId
        WHERE m.organizationId = ?
        ORDER BY m.createdAt ASC`
    )
      .bind(orgId)
      .all<OrgMember>();
    return (rows.results ?? []).map((r) => ({
      ...r,
      role: isOrgRole(r.role) ? r.role : "member",
    }));
  } catch (err) {
    console.error("[orgs] listOrgMembers failed", err);
    return [];
  }
}

export async function listOrgInvitations(
  env: OrgsEnv,
  orgId: string
): Promise<OrgInvitation[]> {
  if (!env.DB) return [];
  try {
    const rows = await env.DB.prepare(
      `SELECT id, email, role, status, createdAt AS createdAt
         FROM invitation WHERE organizationId = ?
        ORDER BY createdAt DESC`
    )
      .bind(orgId)
      .all<OrgInvitation>();
    return (rows.results ?? []).map((r) => ({
      ...r,
      role: isOrgRole(r.role) ? r.role : "member",
    }));
  } catch (err) {
    console.error("[orgs] listOrgInvitations failed", err);
    return [];
  }
}

export async function createInvitation(
  env: OrgsEnv,
  opts: { orgId: string; email: string; role: OrgRole; inviterId: string }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!env.DB) return { ok: false, error: "database unavailable" };
  const email = opts.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "invalid email" };
  }
  const role: OrgRole = isOrgRole(opts.role) ? opts.role : "member";
  const id = crypto.randomUUID();
  // 7-day expiry — stub, no email is actually sent in this slice.
  const expiresAt = new Date(Date.now() + 7 * 864e5).toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO invitation (id, organizationId, email, role, status, inviterId, expiresAt)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`
    )
      .bind(id, opts.orgId, email, role, opts.inviterId, expiresAt)
      .run();
  } catch (err) {
    console.error("[orgs] createInvitation failed", err);
    return { ok: false, error: "could not create invitation" };
  }
  return { ok: true, id };
}
