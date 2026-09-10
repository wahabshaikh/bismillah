import Link from "next/link";
import { env } from "cloudflare:workers";
import { requireSession } from "@/lib/session";
import { getUsageSummary } from "@/lib/usage";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SignOutButton from "@/components/sign-out-button";
import SettingsAiKeys from "@/components/settings-ai-keys";
import SettingsUsage from "@/components/settings-usage";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

const linkCls =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800";

export default async function SettingsPage() {
  const { user } = await requireSession();
  const usage = await getUsageSummary(env, user.id);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="inline-block">
            <Badge>← Dashboard</Badge>
          </Link>
          <SignOutButton />
        </div>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription className="dark:text-slate-400">
              From your Better Auth session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
              <dt className="font-medium text-slate-500 dark:text-slate-400">Name</dt>
              <dd>{user.name || "—"}</dd>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Email</dt>
              <dd>{user.email}</dd>
              <dt className="font-medium text-slate-500 dark:text-slate-400">User ID</dt>
              <dd className="font-mono text-xs">{user.id}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Bring your own AI key</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Optional. When set, the agent chat at <code>/chat</code> uses your
              provider while you&apos;re signed in. Workers AI is the fallback
              for everyone else and whenever your key is missing or rejected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsAiKeys />
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Usage this month</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Display-only stub over local D1 counts — not live Polar billing.
              Prepaid, fair metered credits; never interest or BNPL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsUsage initial={usage} />
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Billing</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Halal one-time payment via Polar. Manage receipts and details in
              the customer portal. If you haven&apos;t bought yet, the portal
              shows a setup message until your first checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a className={linkCls} href="/api/checkout">
              Buy the template
            </a>
            <a className={linkCls} href="/api/portal">
              Open customer portal
            </a>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
