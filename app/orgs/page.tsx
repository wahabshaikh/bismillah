import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { requireSession } from "@/lib/session";
import { isOrgsEnabled, listUserOrgs } from "@/lib/orgs";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SignOutButton from "@/components/sign-out-button";
import OrgsCreateForm from "@/components/orgs-create-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Organizations" };

export default async function OrgsPage() {
  const { user } = await requireSession();
  if (!isOrgsEnabled(env)) redirect("/dashboard");

  const orgs = await listUserOrgs(env, user.id);

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
            <CardTitle>Your organizations</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Lite multi-tenant stub (roles: owner / admin / member). Invites are
              recorded but no email is sent yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {orgs.length ? (
              <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
                {orgs.map((o) => (
                  <li key={o.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link
                        href={`/orgs/${o.id}`}
                        className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
                      >
                        {o.name}
                      </Link>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        /{o.slug}
                      </p>
                    </div>
                    <Badge>{o.role}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No organizations yet — create one below.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Create an organization</CardTitle>
          </CardHeader>
          <CardContent>
            <OrgsCreateForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
