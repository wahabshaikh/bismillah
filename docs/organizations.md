# Organizations and teams

Signed-in users can create organizations (workspaces), invite people by email, give them a
role, and group them into teams. It's Better Auth's
[organization plugin](https://www.better-auth.com/docs/plugins/organization), stored in D1 next to
the other auth tables, so there is no extra service to run or pay for.

## What you get

- **Organizations** with a name and a unique slug. Whoever creates one is its `owner`, and a
  user can belong to as many as they like.
- **Roles**: `owner`, `admin` and `member`. Owners and admins invite, remove and change the
  role of members; only owners delete the organization. These are Better Auth's
  [default permissions](https://www.better-auth.com/docs/plugins/organization#roles).
- **Invitations by email**, sent from the queue like every other email. The link opens the web
  app at `/accept-invitation/<id>`, which asks the invitee to sign in or sign up with the invited
  address first. Invitations last 48 hours; the hourly cron deletes expired ones.
- **Teams** inside an organization. Each new organization starts with one team named after
  it, and an invitation can add the invitee to a team.
- **An active organization** on each session. Creating or joining an organization makes it
  active, signing in picks the first one you joined, and the web header and the mobile app
  switch between them.

| Where  | What                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------- |
| API    | `organization()` in `apps/api/src/auth.ts`, tables in `src/db/schema.ts`, `requireOrganization` in `src/middleware/organization.ts` |
| Web    | Switcher in the header, `/organization` (members, invitations, teams), `/accept-invitation/$id`   |
| Mobile | Organization card with a switcher on the home screen                                              |

## Endpoints

Better Auth serves everything under `/api/auth/organization/*`, and both apps call it through
`authClient.organization` (`create`, `setActive`, `inviteMember`, `acceptInvitation`,
`updateMemberRole`, `removeMember`, `createTeam`, ...). See the
[plugin docs](https://www.better-auth.com/docs/plugins/organization) for the full list.

The API adds one route of its own, as an example of scoping your data:

| Route                   | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `GET /v1/organization`  | The active organization and your roles in it (403 without one) |

## Scoping your own routes

`requireOrganization()` reads the session's `activeOrganizationId`, checks in D1 that the user
is still a member, and puts `{ id, roles }` in `c.var.organization`. Pass roles to restrict a
route further:

```ts
import { requireOrganization } from "../middleware/organization.ts";

export const projects = new Hono<AuthedEnv & OrgEnv>()
  .get("/", requireOrganization(), async (c) => {
    const rows = await c.var.db
      .select()
      .from(schema.project)
      .where(eq(schema.project.organizationId, c.var.organization.id));
    return c.json({ items: rows });
  })
  .delete("/:id", requireOrganization("owner", "admin"), async (c) => {
    // ...
  });
```

Give org-owned tables an `organization_id` column that references `organization.id` with
`onDelete: "cascade"`, plus an index on it, so deleting an organization deletes its data.

The membership check is one indexed D1 read per request. That's what makes removing someone
take effect straight away; the session alone would keep pointing at the organization.

## Choices you might change

- **Who can create organizations.** Anyone signed in. Set `allowUserToCreateOrganization` or
  `organizationLimit` in `src/auth.ts` to restrict it, for example to paying users.
- **Teams.** On, with at least one team per organization. Remove `teams` from the server and
  both clients to turn them off, and drop the two tables in a new migration.
- **Billing stays per user.** Whop memberships (docs/payments.md) belong to the user who
  paid. To bill per organization, put `organization_id` in the checkout metadata and on the
  `subscription` row, and check it with `requireOrganization` before `requireSubscription`.
- **Custom roles.** Pass `ac` and `roles` to `organization()` and `organizationClient()` with
  Better Auth's [access control](https://www.better-auth.com/docs/plugins/organization#access-control).

## Cost

| Action                | Workers                                | KV               | D1                       | Queues                   |
| --------------------- | -------------------------------------- | ---------------- | ------------------------ | ------------------------ |
| Create organization   | 1 request                              | 1 read, 1 write  | ~4 rows written          | –                        |
| Invite someone        | 1 request + a share of a queue batch   | 1 read           | a few rows               | 3 operations (+ 1 email) |
| Switch organization   | 1 request                              | 1 read, 1 write  | 1–2 indexed rows         | –                        |
| Org-scoped API call   | 1 request                              | 1 read           | +1 indexed row (membership) | –                    |

Switching rewrites the session in KV, which is why it costs a KV write; everything else stays
inside the numbers in [budget.md](budget.md).
