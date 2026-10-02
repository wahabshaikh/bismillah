import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { schema } from "../db/index.ts";
import type { AuthedEnv, OrgEnv } from "../env.ts";
import { requireOrganization } from "../middleware/organization.ts";

/**
 * The active organization and your roles in it. Creating organizations, inviting people
 * and managing members is Better Auth's job (/api/auth/organization/*); this route shows
 * how your own routes scope data to an organization with `requireOrganization`.
 */
export const organization = new Hono<AuthedEnv & OrgEnv>().get(
  "/",
  requireOrganization(),
  async (c) => {
    const [org] = await c.var.db
      .select({
        id: schema.organization.id,
        name: schema.organization.name,
        slug: schema.organization.slug,
        logo: schema.organization.logo,
      })
      .from(schema.organization)
      .where(eq(schema.organization.id, c.var.organization.id))
      .limit(1);
    if (!org) throw new HTTPException(404, { message: "Not found" });
    return c.json({ organization: org, roles: c.var.organization.roles });
  },
);
