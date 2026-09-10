import Link from "next/link";
import { env } from "cloudflare:workers";
import { requireSession } from "@/lib/session";
import { isOrgsEnabled } from "@/lib/orgs";
import { isSuperAdmin } from "@/lib/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SignOutButton from "@/components/sign-out-button";
import OnboardingChecklist from "@/components/onboarding-checklist";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

const baseLinks = [
  { href: "/chat", label: "Agent chat", desc: "Workers AI + ChatAgent DO" },
  { href: "/demos", label: "Edge demos", desc: "D1 / R2 / KV" },
  { href: "/settings", label: "Settings", desc: "Profile + billing" },
  { href: "/pricing", label: "Pricing", desc: "One-time checkout" },
];

export default async function DashboardPage() {
  const { user } = await requireSession();

  const links = [
    ...baseLinks,
    ...(isOrgsEnabled(env)
      ? [{ href: "/orgs", label: "Organizations", desc: "Teams + invites" }]
      : []),
    ...(isSuperAdmin(env, user.email)
      ? [{ href: "/admin", label: "Admin", desc: "Stats + impersonation" }]
      : []),
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-block">
            <Badge>Bismillah</Badge>
          </Link>
          <SignOutButton />
        </div>

        <OnboardingChecklist />

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>
              Assalamu alaikum{user.name ? `, ${user.name}` : ""}
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              You&apos;re signed in as {user.email}. This is your protected
              dashboard stub — build your product here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-lg border border-slate-200 p-4 transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <p className="text-sm font-medium">{l.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {l.desc}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
