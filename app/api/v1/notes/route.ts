import { env } from "cloudflare:workers";
import {
  corsPreflight,
  jsonWithCors,
  requireProductApiKey,
} from "@/lib/product-api";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * REST product API for agents — same shape as `/api/notes`.
 *
 * Auth: `Authorization: Bearer <PRODUCT_API_KEY>` when that secret is set;
 * open (demo) when it is unset. Writes are rate-limited via `env.KV`.
 */

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const denied = requireProductApiKey(env, request);
  if (denied) return denied;

  const { results } = await env.DB.prepare(
    "SELECT id, title, body, created_at FROM notes ORDER BY created_at DESC LIMIT 50"
  ).all();
  return jsonWithCors({ notes: results ?? [] });
}

export async function POST(request: Request) {
  const denied = requireProductApiKey(env, request);
  if (denied) return denied;

  const rl = await rateLimit(env, clientId(request), {
    key: "product-api-notes",
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await request.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
  };
  const title = (body.title ?? "").trim();
  const noteBody = (body.body ?? "").trim();
  if (!title) {
    return jsonWithCors({ error: "title is required" }, { status: 400 });
  }

  const note = await env.DB.prepare(
    "INSERT INTO notes (title, body) VALUES (?, ?) RETURNING id, title, body, created_at"
  )
    .bind(title, noteBody)
    .first();
  return jsonWithCors({ note }, { status: 201 });
}
