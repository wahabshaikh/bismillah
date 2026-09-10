import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { DOCS, getDoc } from "@/lib/docs";

export function generateStaticParams() {
  return DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return { title: "Not found" };
  return { title: doc.title, description: doc.description };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  // Group consecutive "- " lines into a single <ul>.
  const blocks: Array<{ type: "p"; text: string } | { type: "ul"; items: string[] }> = [];
  for (const line of doc.body) {
    if (line.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") last.items.push(line.slice(2));
      else blocks.push({ type: "ul", items: [line.slice(2)] });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <article className="mx-auto flex max-w-2xl flex-col gap-4">
        <Link href="/docs" className="inline-block">
          <Badge>← Docs</Badge>
        </Link>
        <h1 className="text-3xl font-semibold">{doc.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{doc.description}</p>
        <div className="flex flex-col gap-4 text-slate-700 dark:text-slate-300">
          {blocks.map((block, i) =>
            block.type === "ul" ? (
              <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{block.text}</p>
            )
          )}
        </div>
      </article>
    </main>
  );
}
