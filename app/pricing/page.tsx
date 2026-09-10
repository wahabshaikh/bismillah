import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Pricing — Bismillah",
  description: "One-time, fair pricing. Pay once, own it. No subscriptions.",
};

const includes = [
  "Full vinext + Cloudflare Workers template",
  "Agent chat, D1 / R2 / KV demos",
  "Better Auth email/password + Plunk welcome email",
  "Polar checkout + webhook wiring",
  "MIT licensed — fork and ship",
];

const btnPrimary =
  "inline-flex h-11 items-center justify-center rounded-md bg-emerald-700 px-8 text-sm font-medium text-white transition-colors hover:bg-emerald-800";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950">
      <section className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <Link href="/" className="inline-block">
            <Badge>Bismillah · Halal only</Badge>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple, one-time pricing
          </h1>
          <p className="text-lg leading-8 text-slate-700">
            Pay once and own it. No subscriptions, no instalments, no interest —
            just a fair price for a production-shaped starter.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Bismillah Pro template</CardTitle>
            <CardDescription>
              A single fair payment. Lifetime access to the template and updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ul className="flex flex-col gap-2 text-sm text-slate-700">
              {includes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-emerald-700">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <a className={btnPrimary} href="/api/checkout">
              Buy once — go to checkout
            </a>
            <p className="text-xs text-slate-500">
              Checkout is powered by Polar. Prices are set in your Polar
              dashboard; configure <code>POLAR_PRODUCT_ID</code> to enable this
              button.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
