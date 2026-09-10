import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CHANGELOG } from "@/lib/blog";

export const metadata = {
  title: "Changelog",
  description: "What shipped in Bismillah, newest first.",
};

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href="/" className="inline-block">
          <Badge>Bismillah</Badge>
        </Link>
        <h1 className="text-3xl font-semibold">Changelog</h1>
        <ol className="flex flex-col gap-6">
          {CHANGELOG.map((entry) => (
            <li
              key={entry.version}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-semibold">{entry.version}</h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(entry.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
                {entry.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
