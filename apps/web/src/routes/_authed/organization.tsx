import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Input,
  Label,
  Select,
} from "@bismillah/ui";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import {
  authClient,
  useActiveMember,
  useActiveOrganization,
  useListOrganizations,
} from "../../lib/auth.ts";
import { slugify } from "../../lib/slug.ts";

export const Route = createFileRoute("/_authed/organization")({
  head: () => ({ meta: [{ title: "Organization · bismillah" }] }),
  component: OrganizationPage,
});

type Role = "owner" | "admin" | "member";
type FullOrganization = NonNullable<ReturnType<typeof useActiveOrganization>["data"]>;

/** Better Auth client calls resolve to `{ data, error }`; this throws the error instead. */
async function must<T>(call: Promise<{ data: T; error: null } | { data: null; error: unknown }>) {
  const { data, error } = await call;
  if (error) {
    const message = (error as { message?: string }).message;
    throw new Error(message || "Something went wrong");
  }
  return data as T;
}

function teamsQuery(organizationId: string) {
  return queryOptions({
    queryKey: ["teams", organizationId],
    queryFn: async () =>
      (await must(authClient.organization.listTeams({ query: { organizationId } }))) ?? [],
  });
}

/** Runs an action and tracks its pending and error state. */
function useAction() {
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();
  async function run(key: string, action: () => Promise<unknown>) {
    setPending(key);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(undefined);
    }
  }
  return { pending, error, run };
}

function OrganizationPage() {
  const { data: organization, isPending } = useActiveOrganization();
  const { data: member } = useActiveMember();
  const roles = (member?.role.split(",") ?? []) as Role[];
  const canManage = roles.includes("owner") || roles.includes("admin");

  if (isPending) return null;

  return (
    <div className="flex flex-col gap-6">
      {organization ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
            <p className="text-sm text-muted-foreground">
              Your role: <span className="capitalize">{roles.join(", ") || "member"}</span>
            </p>
          </div>
          <Members organization={organization} canManage={canManage} />
          {canManage && <Invite organization={organization} />}
          <Teams organization={organization} canManage={canManage} />
          <DangerZone organization={organization} isOwner={roles.includes("owner")} />
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            Create one to invite your team, or accept an invitation from your email.
          </p>
        </div>
      )}
      <CreateOrganization />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      {children}
    </Card>
  );
}

function Members({
  organization,
  canManage,
}: {
  organization: FullOrganization;
  canManage: boolean;
}) {
  const { data: session } = authClient.useSession();
  const { pending, error, run } = useAction();

  return (
    <Section title="Members" description="Owners and admins can invite, remove and change roles.">
      {error && <Alert>{error}</Alert>}
      <ul className="divide-y divide-border">
        {organization.members.map((member) => {
          const isMe = member.userId === session?.user.id;
          return (
            <li key={member.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.user.name}
                  {isMe && <span className="text-muted-foreground"> (you)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
              </div>
              {canManage && !isMe ? (
                <div className="flex shrink-0 gap-2">
                  <Select
                    aria-label={`Role of ${member.user.name}`}
                    className="h-8"
                    value={member.role}
                    disabled={pending === member.id}
                    onChange={(event) =>
                      run(member.id, () =>
                        must(
                          authClient.organization.updateMemberRole({
                            memberId: member.id,
                            role: event.target.value as Role,
                          }),
                        ),
                      )
                    }
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending === member.id}
                    onClick={() =>
                      run(member.id, () =>
                        must(authClient.organization.removeMember({ memberIdOrEmail: member.id })),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <span className="shrink-0 text-xs capitalize text-muted-foreground">
                  {member.role}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Invite({ organization }: { organization: FullOrganization }) {
  const id = useId();
  const { pending, error, run } = useAction();
  const invitations = organization.invitations.filter((i) => i.status === "pending");
  const { data: teams = [] } = useQuery(teamsQuery(organization.id));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const teamId = String(data.get("teamId") ?? "");
    run("invite", async () => {
      await must(
        authClient.organization.inviteMember({
          email: String(data.get("email")),
          role: String(data.get("role")) as Role,
          ...(teamId && { teamId }),
        }),
      );
      form.reset();
    });
  }

  return (
    <Section
      title="Invite people"
      description="They get an email with a link that signs them in and joins this organization."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={`${id}-email`}>Email</Label>
          <Input id={`${id}-email`} name="email" type="email" required autoComplete="off" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-role`}>Role</Label>
          <Select id={`${id}-role`} name="role" defaultValue="member">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        {teams.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-team`}>Team</Label>
            <Select id={`${id}-team`} name="teamId" defaultValue="">
              <option value="">No team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <Button type="submit" disabled={pending === "invite"}>
          {pending === "invite" ? "Sending…" : "Send invite"}
        </Button>
      </form>
      {error && <Alert>{error}</Alert>}
      {invitations.length > 0 && (
        <ul className="divide-y divide-border">
          {invitations.map((invitation) => (
            <li key={invitation.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{invitation.email}</p>
                <p className="text-xs text-muted-foreground">
                  Invited as {invitation.role} · expires{" "}
                  {new Date(invitation.expiresAt).toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending === invitation.id}
                onClick={() =>
                  run(invitation.id, () =>
                    must(authClient.organization.cancelInvitation({ invitationId: invitation.id })),
                  )
                }
              >
                Cancel
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Teams({
  organization,
  canManage,
}: {
  organization: FullOrganization;
  canManage: boolean;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const { pending, error, run } = useAction();
  const teams = useQuery(teamsQuery(organization.id));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["teams", organization.id] });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name"));
    run("create", async () => {
      await must(authClient.organization.createTeam({ name }));
      await refresh();
      form.reset();
    });
  }

  return (
    <Section
      title="Teams"
      description="Group members inside the organization. Invitations can add people to a team."
    >
      {teams.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teams yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {teams.data?.map((team, _, all) => (
            <li key={team.id} className="flex items-center justify-between gap-4 py-3">
              <p className="truncate text-sm font-medium">{team.name}</p>
              {/* Better Auth keeps at least one team per organization. */}
              {canManage && all.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending === team.id}
                  onClick={() =>
                    run(team.id, async () => {
                      await must(authClient.organization.removeTeam({ teamId: team.id }));
                      await refresh();
                    })
                  }
                >
                  Delete
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <form onSubmit={onSubmit} className="flex items-end gap-3">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor={`${id}-name`}>New team</Label>
            <Input id={`${id}-name`} name="name" required placeholder="Engineering" />
          </div>
          <Button type="submit" variant="secondary" disabled={pending === "create"}>
            Create team
          </Button>
        </form>
      )}
      {error && <Alert>{error}</Alert>}
    </Section>
  );
}

function DangerZone({
  organization,
  isOwner,
}: {
  organization: FullOrganization;
  isOwner: boolean;
}) {
  const queryClient = useQueryClient();
  const { refetch } = useListOrganizations();
  const { pending, error, run } = useAction();

  async function after() {
    await refetch();
    await queryClient.invalidateQueries();
  }

  return (
    <Section
      title={isOwner ? "Delete organization" : "Leave organization"}
      description={
        isOwner
          ? "Deletes the organization, its teams and invitations for everyone."
          : "You'll need a new invitation to come back."
      }
    >
      {error && <Alert>{error}</Alert>}
      <div>
        {isOwner ? (
          <Button
            variant="danger"
            disabled={pending === "delete"}
            onClick={() => {
              if (!window.confirm(`Delete ${organization.name} for everyone?`)) return;
              run("delete", async () => {
                await must(authClient.organization.delete({ organizationId: organization.id }));
                await after();
              });
            }}
          >
            Delete {organization.name}
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled={pending === "leave"}
            onClick={() =>
              run("leave", async () => {
                await must(authClient.organization.leave({ organizationId: organization.id }));
                await after();
              })
            }
          >
            Leave {organization.name}
          </Button>
        )}
      </div>
    </Section>
  );
}

function CreateOrganization() {
  const id = useId();
  const queryClient = useQueryClient();
  const { pending, error, run } = useAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name")).trim();
    run("create", async () => {
      // Creating an organization makes it the active one.
      await must(authClient.organization.create({ name, slug: slugify(name) }));
      await queryClient.invalidateQueries();
      form.reset();
    });
  }

  return (
    <Card id="create" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardTitle>New organization</CardTitle>
        <CardDescription>You'll be its owner, and it becomes your active one.</CardDescription>
      </div>
      <form onSubmit={onSubmit} className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor={`${id}-name`}>Name</Label>
          <Input id={`${id}-name`} name="name" required maxLength={64} placeholder="Acme Inc." />
        </div>
        <Button type="submit" disabled={pending === "create"}>
          {pending === "create" ? "Creating…" : "Create"}
        </Button>
      </form>
      {error && <Alert>{error}</Alert>}
    </Card>
  );
}
