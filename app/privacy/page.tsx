import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Privacy Policy",
  description: "How Bismillah handles your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <article className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link href="/" className="inline-block">
          <Badge>Bismillah</Badge>
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Placeholder — last updated {new Date().getFullYear()}. Replace this
          with your own policy before going to production (e.g. generate a draft
          with a reputable policy generator or your legal counsel, then review).
        </p>

        <h2 className="mt-4 text-lg font-semibold">What we collect</h2>
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          Account data you provide (name, email) via Better Auth, stored in
          Cloudflare D1. Authentication cookies for your session. Payment
          records (order id, email, amount, currency) when you buy, via Polar.
        </p>

        <h2 className="mt-4 text-lg font-semibold">Third parties</h2>
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          Cloudflare (hosting, D1/R2/KV, Workers AI), Plunk (transactional
          email), and Polar (payments). Each processes data only to provide
          their service.
        </p>

        <h2 className="mt-4 text-lg font-semibold">Your choices</h2>
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
          Request access or deletion of your account data by contacting the site
          owner. This template does not sell personal data.
        </p>

        <p className="mt-6 text-sm">
          <Link href="/terms" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
            Read the Terms →
          </Link>
        </p>
      </article>
    </main>
  );
}
