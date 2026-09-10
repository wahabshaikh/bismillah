import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Terms of Service",
  description: "The terms for using Bismillah.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <article className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link href="/" className="inline-block">
          <Badge>Bismillah</Badge>
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Placeholder — last updated {new Date().getFullYear()}. Replace with
          your own terms before production. Generate a draft with a reputable
          terms generator or legal counsel, then review.
        </p>

        <h2 className="mt-4 text-lg font-semibold">Use of the service</h2>
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          The Bismillah template code is provided under the MIT license. This
          hosted instance is provided as-is, without warranty. Do not use it for
          unlawful or haram purposes.
        </p>

        <h2 className="mt-4 text-lg font-semibold">Payments</h2>
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          Purchases are one-time, fair-priced payments processed by Polar. There
          are no subscriptions, instalments, or interest. Refunds are handled at
          the site owner&apos;s discretion.
        </p>

        <h2 className="mt-4 text-lg font-semibold">Accounts</h2>
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          You are responsible for keeping your credentials secure. We may
          suspend accounts that abuse the service.
        </p>

        <p className="mt-6 text-sm">
          <Link href="/privacy" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            Read the Privacy Policy →
          </Link>
        </p>
      </article>
    </main>
  );
}
