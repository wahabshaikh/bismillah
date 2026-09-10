import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { env } from "cloudflare:workers";
import { requireSession } from "@/lib/session";
import {
  isOrgsEnabled,
  getOrganization,
  getUserOrgRole,
  listOrgMembers,
  listOrgInvitations,
} from "@/lib/orgs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SignOutButton from "@/components/sign-out-button";
import OrgInviteForm from "@/components/org-invite-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Organization" };

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  if (!isOrgsEnabled(env)) redirect("/dashboard");

  const { id } = await params;
  const role = await getUserOrgRole(env, id, user.id);
  if (!role) notFound();

  const org = await getOrganization(env, id);
  if (!org) notFound();

  const [members, invitations] = await Promise.all([
    listOrgMembers(env, id),
    listOrgInvitations(env, id),
  ]);
  const canInvite = role === "owner" || role === "admin";

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/orgs" className="inline-block">
            <Badge>← Organizations</Badge>
          </Link>
          <SignOutButton />
        </div>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>{org.name}</CardTitle>
            <CardDescription className="dark:text-slate-400">
              /{org.slug} · you are <strong>{role}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between py-2 text-sm">
                  <span>{m.email ?? m.userId}</span>
                  <Badge>{m.role}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
            <CardDescription className="dark:text-slate-400">
              {canInvite
                ? "Add a teammate by email. Stub — recorded in D1, no email sent."
                : "Only owners and admins can invite."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {canInvite ? <OrgInviteForm orgId={org.id} /> : null}
            {invitations.length ? (
              <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{inv.email}</span>
                    <span className="flex items-center gap-2">
                      <Badge>{inv.role}</Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {inv.status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No invitations yet.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
