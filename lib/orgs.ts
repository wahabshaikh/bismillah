/**
 * Organizations — schema-ready, UI later.
 *
 * `migrations/0005_orgs.sql` creates thin `organization` / `organization_member`
 * / `invitation` tables shaped for the Better Auth organization plugin. No
 * multi-tenant UI or API ships in this slice; this module only exposes the
 * feature flag so callers can branch.
 *
 * Enable by setting `ENABLE_ORGS="true"`.
 */

type OrgsEnv = { ENABLE_ORGS?: string };

export function isOrgsEnabled(env: OrgsEnv): boolean {
  return env.ENABLE_ORGS === "true";
}
