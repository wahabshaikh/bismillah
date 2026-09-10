import Link from "next/link";
import { env } from "cloudflare:workers";
import { requireSession } from "@/lib/session";
import { requireSuperAdmin, getAdminStats, parseAdminEmails } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SignOutButton from "@/components/sign-out-button";
import AdminImpersonateForm from "@/components/admin-impersonate-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await requireSession();
  requireSuperAdmin(env, session);

  const stats = await getAdminStats(env);
  const admins = parseAdminEmails(env);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-block">
            <Badge>← Dashboard</Badge>
          </Link>
          <SignOutButton />
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-semibold">Impersonation grants full account access.</p>
          <p className="mt-1">
            Every impersonation should be audited. This template ships the
            mechanism only — before production add MFA for admins, an audit-log
            row per impersonation, and a notice to the impersonated user. You
            cannot impersonate another admin.
          </p>
        </div>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Stub stats from D1.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Users</dt>
                <dd className="text-2xl font-semibold">{stats.users}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Orders</dt>
                <dd className="text-2xl font-semibold">{stats.orders}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Allowlisted admins: {admins.length ? admins.join(", ") : "none set"}
              {" "}(<code>ADMIN_EMAILS</code>)
            </p>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Impersonate</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Swap your session for a full session as another user. Use
              &ldquo;Stop impersonating&rdquo; to return to your admin account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminImpersonateForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
