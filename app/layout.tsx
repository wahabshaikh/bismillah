import type { Metadata } from "next";
import { env } from "cloudflare:workers";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

/** Runs before paint to apply the saved theme (no flash of wrong theme). */
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const site = getSiteUrl(env);
const title = "Bismillah — Start every build in the Name";
const description =
  "Production-ready vinext + Cloudflare Workers template: Workers AI agents, D1, R2, KV, Better Auth, Plunk email, and Polar payments. Halal only. MIT.";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: title,
    template: "%s — Bismillah",
  },
  description,
  applicationName: "Bismillah",
  keywords: [
    "cloudflare",
    "workers",
    "vinext",
    "ai agents",
    "d1",
    "r2",
    "kv",
    "better auth",
    "polar",
    "plunk",
    "saas template",
    "halal",
  ],
  authors: [{ name: "wahabshaikh" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Bismillah",
    url: site,
    title,
    description,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
