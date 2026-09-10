import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BLOG_POSTS } from "@/lib/blog";

export const metadata = {
  title: "Blog",
  description: "Notes on building Bismillah — Cloudflare-native, halal-only SaaS.",
};

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <Link href="/" className="inline-block">
          <Badge>Bismillah</Badge>
        </Link>
        <h1 className="text-3xl font-semibold">Blog</h1>
        <ul className="flex flex-col gap-4">
          {BLOG_POSTS.map((post) => (
            <li
              key={post.slug}
              className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                <Link
                  href={`/blog/${post.slug}`}
                  className="hover:text-emerald-700 dark:hover:text-emerald-400"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {post.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
