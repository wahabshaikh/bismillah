import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { schema } from "../db/index.ts";
import type { AuthedEnv, OrgEnv, OrgRole } from "../env.ts";

/**
 * Scopes a route to the session's active organization (set with Better Auth's
 * `organization.setActive`) and puts `{ id, roles }` in `c.var.organization`.
 *
 * Membership is checked against D1 on every request, so removing someone takes effect
 * at once. Pass roles to also require one of them, e.g. `requireOrganization("owner", "admin")`.
 */
export function requireOrganization(...allowed: OrgRole[]) {
  return createMiddleware<AuthedEnv & OrgEnv>(async (c, next) => {
    const organizationId = c.var.session.activeOrganizationId;
    if (!organizationId) {
      throw new HTTPException(403, { message: "No active organization" });
    }
    const [row] = await c.var.db
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, organizationId),
          eq(schema.member.userId, c.var.user.id),
        ),
      )
      .limit(1);
    if (!row) {
      throw new HTTPException(403, { message: "Not a member of this organization" });
    }
    // Better Auth stores several roles as a comma-separated list.
    const roles = row.role.split(",").map((role) => role.trim()) as OrgRole[];
    if (allowed.length > 0 && !roles.some((role) => allowed.includes(role))) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    c.set("organization", { id: organizationId, roles });
    await next();
  });
}
