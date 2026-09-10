import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import WaitlistForm from "@/components/waitlist-form";

export const metadata = {
  title: "Waitlist",
  description:
    "Join the Bismillah pre-launch waitlist — Cloudflare-native, halal-only SaaS starter.",
};

export default function WaitlistPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <section className="mx-auto flex max-w-md flex-col gap-6">
        <Link href="/" className="inline-block">
          <Badge>Bismillah</Badge>
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Join the waitlist</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Be first to hear when Bismillah opens up. One email before launch —
            no spam, no interest-based upsells, in shaa Allah.
          </p>
        </div>

        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Pre-launch access</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Drop your email and we&apos;ll reach out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WaitlistForm />
          </CardContent>
        </Card>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Already have an invite?{" "}
          <Link
            href="/signup"
            className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            Sign up
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
