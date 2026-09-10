import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const revalidate = 300;

const btn =
  "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors";
const btnPrimary = `${btn} bg-emerald-700 text-white hover:bg-emerald-800`;
const btnOutline = `${btn} border border-slate-300 bg-white hover:bg-slate-50`;
const btnSecondary = `${btn} bg-slate-100 text-slate-900 hover:bg-slate-200`;

const features = [
  {
    title: "Agent chat",
    description: "Workers AI + Durable Object ChatAgent with demo tools.",
    href: "/chat",
    cta: "Open chat",
  },
  {
    title: "Edge demos",
    description: "D1 notes, R2 artifacts, and KV visit counter.",
    href: "/demos",
    cta: "Try demos",
  },
  {
    title: "Ship on Cloudflare",
    description: "vinext App Router → Workers, with typed bindings.",
    href: "https://developers.cloudflare.com/workers/",
    cta: "Workers docs",
    external: true,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950">
      <section className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-5">
          <Badge className="w-fit">Bismillah · Halal only · MIT</Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Start every build in the Name — ship on Cloudflare.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-700">
            Public GitHub template: vinext + Workers AI agents, D1, R2, and KV —
            production-shaped and ready to fork.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className={btnPrimary} href="/chat">
              Launch agent chat
            </Link>
            <Link className={btnOutline} href="/demos">
              Edge demos
            </Link>
            <a
              className={btnSecondary}
              href="https://github.com/wahabshaikh/bismillah"
              target="_blank"
              rel="noreferrer"
            >
              GitHub template
            </a>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <CardTitle>{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {f.external ? (
                  <a
                    className="text-sm font-medium text-emerald-700 hover:underline"
                    href={f.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {f.cta} →
                  </a>
                ) : (
                  <Link
                    className="text-sm font-medium text-emerald-700 hover:underline"
                    href={f.href}
                  >
                    {f.cta} →
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bindings (pre-wired)</CardTitle>
            <CardDescription>
              Do not merge the two KV namespaces. App data uses{" "}
              <code className="rounded bg-slate-100 px-1">KV</code>; vinext cache
              uses{" "}
              <code className="rounded bg-slate-100 px-1">VINEXT_KV_CACHE</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Binding</th>
                  <th className="py-2 font-medium">Resource</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs sm:text-sm">
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4">DB</td>
                  <td>D1 bismillah · 36a267af-1bd7-4da0-af68-95654c6d46c3</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4">ARTIFACTS</td>
                  <td>R2 bismillah-artifacts</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4">KV</td>
                  <td>2423ae5f6f90406d8a2233680c5d1c26</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4">VINEXT_KV_CACHE</td>
                  <td>02cf4b23eb084760b4fd0e755bbd6e96</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4">AI</td>
                  <td>Workers AI</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">ChatAgent</td>
                  <td>Durable Object (SQLite)</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
