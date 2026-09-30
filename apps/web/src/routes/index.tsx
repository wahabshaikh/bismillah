import { Card, CardDescription, CardTitle } from "@bismillah/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { API_URL } from "../lib/api.ts";
import { healthQuery } from "../lib/queries.ts";

export const Route = createFileRoute("/")({
  component: Home,
});

const stack = [
  ["Web", "TanStack Start, server-rendered in a Worker"],
  ["API", "Hono on Workers, typed end to end over RPC"],
  ["Data", "D1 + Drizzle, sessions and cache in KV, files in R2"],
  ["Auth", "Better Auth with email and password"],
] as const;

function Home() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">bismillah</h1>
        <p className="text-muted-foreground">
          An open-source, multi-platform starter kit built entirely on Cloudflare, sized for the
          $5/month Workers plan.
        </p>
        <p className="text-sm">
          <Link to="/sign-up" className="font-medium text-primary hover:underline">
            Create an account
          </Link>{" "}
          to try sign-in and file uploads against the API.
        </p>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2">
        {stack.map(([title, description]) => (
          <li key={title}>
            <Card className="h-full p-4">
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </Card>
          </li>
        ))}
      </ul>

      <ApiStatus />
    </div>
  );
}

function ApiStatus() {
  const { data, error, isPending } = useQuery(healthQuery);
  const status = isPending
    ? { dot: "bg-muted-foreground", text: "Checking the API…" }
    : error || !data?.ok
      ? { dot: "bg-danger", text: `API unreachable at ${API_URL}. Is \`pnpm dev\` running?` }
      : { dot: "bg-green-500", text: `API is up at ${API_URL}` };

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`size-2 rounded-full ${status.dot}`} aria-hidden />
      {status.text}
    </p>
  );
}
