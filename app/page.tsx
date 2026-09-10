import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
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
const btnOutline = `${btn} border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800`;
const btnSecondary = `${btn} bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700`;

const navLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/chat", label: "Chat" },
  { href: "/demos", label: "Demos" },
  { href: "/docs", label: "Docs" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/waitlist", label: "Waitlist" },
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Signup" },
];

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
    title: "Auth included",
    description:
      "Better Auth: email/password, magic link, Google OAuth, reset flows.",
    href: "/signup",
    cta: "Create account",
  },
  {
    title: "Email + payments",
    description:
      "Plunk transactional email and Polar one-time checkout, wired end-to-end.",
    href: "/pricing",
    cta: "See pricing",
  },
];

const pricingIncludes = [
  "Full vinext + Cloudflare Workers template",
  "Agent chat, D1 / R2 / KV demos",
  "Better Auth — email/password, magic link, Google OAuth",
  "Plunk welcome / magic-link / reset emails",
  "Polar checkout + idempotent webhook + customer portal",
  "SEO metadata, sitemap, robots, legal stubs",
  "MIT licensed — fork and ship",
];

const faqs = [
  {
    q: "Is this really halal-only?",
    a: "Yes. One-time fair pricing through Polar — no interest, no BNPL/instalments, no riba framing anywhere. No gambling, adult, or haram-oriented demos.",
  },
  {
    q: "Why Cloudflare instead of Vercel + Postgres?",
    a: "Bismillah is Cloudflare-native: vinext on Workers, D1 for SQL, R2 for objects, KV for cache/limits, and Durable Object agents with Workers AI. No external database to provision.",
  },
  {
    q: "Which vendors are locked in?",
    a: "Better Auth for auth, Plunk for email, Polar for payments. Each helper degrades to demo mode when its secret is unset, so the template runs before you configure anything.",
  },
  {
    q: "Can I add subscriptions later?",
    a: "The checkout route already accepts ?type=subscription and reads POLAR_SUBSCRIPTION_PRODUCT_ID as a stub. Wire your recurring product when you need it.",
  },
  {
    q: "Do I need API keys to try it?",
    a: "No. The stock demos use Workers AI, D1, R2, and KV bindings. Auth, email, and payments only need secrets when you want real sends and live checkouts.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-10 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-14">
        <nav className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-block">
            <Badge>Bismillah · Halal only · MIT</Badge>
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-medium hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                {l.label}
              </Link>
            ))}
            <ThemeToggle />
          </div>
        </nav>

        {/* Hero */}
        <header className="flex flex-col gap-5">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Start every build in the Name — ship on Cloudflare.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-700 dark:text-slate-300">
            The public GitHub template for AI agentic Cloudflare apps: vinext +
            Workers AI agents, D1, R2, KV — plus Better Auth, Plunk email, and
            Polar payments. Production-shaped and ready to fork.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className={btnPrimary} href="/signup">
              Get started
            </Link>
            <Link className={btnOutline} href="/chat">
              Launch agent chat
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

        {/* Features */}
        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            Everything a production template needs
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title} className="dark:border-slate-800 dark:bg-slate-900">
                <CardHeader>
                  <CardTitle>{f.title}</CardTitle>
                  <CardDescription className="dark:text-slate-400">
                    {f.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    href={f.href}
                  >
                    {f.cta} →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="flex flex-col gap-5">
          <h2 className="text-2xl font-semibold tracking-tight">
            Simple, one-time pricing
          </h2>
          <Card className="dark:border-slate-800 dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Bismillah Pro template</CardTitle>
              <CardDescription className="dark:text-slate-400">
                Pay once and own it. No subscriptions, no instalments, no
                interest — just a fair price for a production-shaped starter.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-300">
                {pricingIncludes.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span aria-hidden className="mt-0.5 text-emerald-700 dark:text-emerald-400">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link className={btnPrimary} href="/pricing">
                  View pricing
                </Link>
                <a className={btnOutline} href="/api/checkout">
                  Buy once — go to checkout
                </a>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="flex flex-col gap-5">
          <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
          <div className="flex flex-col gap-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Bindings */}
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Bindings (pre-wired)</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Do not merge the two KV namespaces. App data uses{" "}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">KV</code>;
              vinext cache uses{" "}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
                VINEXT_KV_CACHE
              </code>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
                  <th className="py-2 pr-4 font-medium">Binding</th>
                  <th className="py-2 font-medium">Resource</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs sm:text-sm">
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">DB</td>
                  <td>D1 bismillah · 36a267af-1bd7-4da0-af68-95654c6d46c3</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">ARTIFACTS</td>
                  <td>R2 bismillah-artifacts</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">KV</td>
                  <td>2423ae5f6f90406d8a2233680c5d1c26</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-4">VINEXT_KV_CACHE</td>
                  <td>02cf4b23eb084760b4fd0e755bbd6e96</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800">
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

        {/* CTA */}
        <section className="rounded-2xl bg-emerald-700 px-6 py-10 text-center text-white">
          <h2 className="text-2xl font-semibold tracking-tight">
            Fork it and ship this week
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-emerald-50">
            Clone the template, set your secrets, and deploy to Cloudflare
            Workers. Start every build in the Name.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              className={`${btn} bg-white text-emerald-800 hover:bg-emerald-50`}
              href="/signup"
            >
              Create your account
            </Link>
            <a
              className={`${btn} border border-emerald-300 text-white hover:bg-emerald-800`}
              href="https://github.com/wahabshaikh/bismillah"
              target="_blank"
              rel="noreferrer"
            >
              Star on GitHub
            </a>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>Bismillah · MIT · Halal only</span>
          <span className="flex flex-wrap gap-4">
            <Link href="/docs" className="hover:underline">
              Docs
            </Link>
            <Link href="/waitlist" className="hover:underline">
              Waitlist
            </Link>
            <Link href="/blog" className="hover:underline">
              Blog
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
          </span>
        </footer>
      </div>
    </main>
  );
}
