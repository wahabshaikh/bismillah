import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DOCS } from "@/lib/docs";

export const metadata = {
  title: "Docs",
  description: "Bismillah help center — getting started, auth, email & payments, agents, bindings.",
};

export default function DocsIndexPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href="/" className="inline-block">
          <Badge>Bismillah</Badge>
        </Link>
        <h1 className="text-3xl font-semibold">Docs</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A short help center for the template. Everything here is hardcoded in{" "}
          <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">lib/docs.ts</code>
          {" "}— edit it directly, no MDX toolchain.
        </p>
        <ul className="flex flex-col gap-4">
          {DOCS.map((doc) => (
            <li
              key={doc.slug}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-lg font-semibold">
                <Link
                  href={`/docs/${doc.slug}`}
                  className="hover:text-emerald-700 dark:hover:text-emerald-400"
                >
                  {doc.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {doc.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
