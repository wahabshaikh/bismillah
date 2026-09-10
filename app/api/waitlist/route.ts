import { env } from "cloudflare:workers";
import {
  joinWaitlist,
  looksLikeEmail,
  normalizeEmail,
  getWaitlistCount,
} from "@/lib/waitlist";
import { sendWaitlistConfirmEmail, sendWaitlistOwnerEmail } from "@/lib/email";
import { rateLimit, clientId, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/waitlist — public pre-launch capture. JSON `{ email, name? }`.
 *
 * Rate-limited via `env.KV` (8/min per IP). The response never reveals whether
 * the address was new. Email sends (joiner confirmation + optional owner ping)
 * are best-effort — a send failure never fails the join.
 */
export async function POST(request: Request) {
  const rl = await rateLimit(env, clientId(request), {
    key: "waitlist",
    limit: 8,
    windowSeconds: 60,
  });
  if (!rl.ok) return tooManyRequests(rl);

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
  };

  const email = normalizeEmail(body.email ?? "");
  if (!looksLikeEmail(email)) {
    return Response.json({ error: "A valid email is required" }, { status: 400 });
  }
  const name = body.name?.trim() || undefined;

  const result = await joinWaitlist(env, { email, name, source: "web" });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }

  // Best-effort notifications — never fail the join on a send error.
  try {
    await sendWaitlistConfirmEmail(env, email, name);
    if (env.WAITLIST_NOTIFY_EMAIL) {
      const { total } = await getWaitlistCount(env);
      await sendWaitlistOwnerEmail(env, env.WAITLIST_NOTIFY_EMAIL, {
        email,
        name,
        total,
      });
    }
  } catch (err) {
    console.error("[waitlist] notify failed (join still recorded)", err);
  }

  return Response.json({ ok: true });
}
