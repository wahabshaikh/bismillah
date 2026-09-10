/**
 * Daily digest job — sketch for the Workers Cron Trigger wired in
 * `worker/index.ts` (`scheduled`) and `wrangler.jsonc` (`triggers.crons`).
 *
 * Safe demo behaviour:
 *  - reads a few recent rows from D1 (best effort — swallows errors)
 *  - builds a tiny summary string
 *  - "sends" it via `lib/email.ts`, which no-ops without `PLUNK_API_KEY`
 *
 * There is no real recipient list yet; it emails `DIGEST_TO` when set, else
 * just logs. Extend `recipientsFor()` to fan out to real users.
 */
import { sendTransactionalEmail } from "../email";

type DigestEnv = {
  DB?: D1Database;
  PLUNK_API_KEY?: string;
  PLUNK_FROM_EMAIL?: string;
  DIGEST_TO?: string;
};

async function countRecentNotes(env: DigestEnv): Promise<number> {
  if (!env.DB) return 0;
  try {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM notes WHERE created_at >= datetime('now', '-1 day')"
    ).first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

async function countUsers(env: DigestEnv): Promise<number> {
  if (!env.DB) return 0;
  try {
    const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM "user"').first<{
      n: number;
    }>();
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}

function recipientsFor(env: DigestEnv): string[] {
  return env.DIGEST_TO ? env.DIGEST_TO.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

export async function runDailyDigest(env: DigestEnv): Promise<{ ok: boolean; summary: string }> {
  const [notes, users] = await Promise.all([countRecentNotes(env), countUsers(env)]);
  const summary = `Bismillah daily digest — ${users} total users, ${notes} new notes in the last 24h.`;

  const recipients = recipientsFor(env);
  if (recipients.length === 0) {
    console.log("[digest] stub ran —", summary, "(set DIGEST_TO to send)");
    return { ok: true, summary };
  }

  for (const to of recipients) {
    await sendTransactionalEmail(env, {
      to,
      subject: "Your Bismillah daily digest",
      body: `<p>Assalamu alaikum,</p><p>${summary}</p><p style="font-size:12px;color:#64748b">You are receiving this because your address is in DIGEST_TO.</p>`,
    });
  }
  console.log("[digest] sent to", recipients.length, "recipient(s)");
  return { ok: true, summary };
}
