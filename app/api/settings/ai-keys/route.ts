import { env } from "cloudflare:workers";
import { getSession } from "@/lib/session";
import {
  saveUserAiKey,
  getUserAiKeyMeta,
  deleteUserAiKey,
  isAiKeyProvider,
} from "@/lib/user-ai-keys";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * GET    /api/settings/ai-keys  → { meta } — provider + last-4 hint only, never the key
 * PUT    /api/settings/ai-keys  → { provider, key } → saves (encrypted at rest)
 * DELETE /api/settings/ai-keys  → removes the stored key
 *
 * Session-gated + lightly rate-limited via `env.KV`. Workers AI stays the
 * default regardless of what is stored here.
 */

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const meta = await getUserAiKeyMeta(env, session.user.id);
  return Response.json({ meta });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(env, clientId(request), {
    key: "ai-keys",
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await request.json().catch(() => ({}))) as {
    provider?: string;
    key?: string;
  };
  const provider = body.provider ?? "";
  if (!isAiKeyProvider(provider)) {
    return Response.json({ error: "unknown provider" }, { status: 400 });
  }
  if (typeof body.key !== "string" || !body.key.trim()) {
    return Response.json({ error: "key is required" }, { status: 400 });
  }

  const result = await saveUserAiKey(env, session.user.id, provider, body.key);
  if (!result.ok) {
    return Response.json({ error: result.error ?? "save failed" }, { status: 400 });
  }
  return Response.json({ meta: result.meta });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(env, clientId(request), {
    key: "ai-keys",
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const result = await deleteUserAiKey(env, session.user.id);
  return Response.json({ ok: result.ok });
}
