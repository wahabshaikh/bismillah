import { env } from "cloudflare:workers";

const KEY = "visits:home";

export async function GET() {
  const current = Number((await env.KV.get(KEY)) ?? "0");
  return Response.json({ key: KEY, count: current });
}

export async function POST() {
  const current = Number((await env.KV.get(KEY)) ?? "0");
  const next = current + 1;
  await env.KV.put(KEY, String(next));
  return Response.json({ key: KEY, count: next });
}
