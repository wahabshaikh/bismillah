import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bismillah — Start every build in the Name",
  description:
    "Production-ready vinext + Cloudflare Workers template with Agents, D1, R2, and KV. Halal only. MIT.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
