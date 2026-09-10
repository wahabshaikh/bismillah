/**
 * Plunk transactional email helper (Workers-friendly fetch).
 * Demo-safe: missing PLUNK_API_KEY logs and no-ops — never crashes the site.
 */

export type PlunkEnv = {
  PLUNK_API_KEY?: string;
  PLUNK_FROM_EMAIL?: string;
};

export type SendEmailOpts = {
  to: string;
  subject: string;
  body: string;
  from?: string;
};

export async function sendTransactionalEmail(
  env: PlunkEnv,
  opts: SendEmailOpts
): Promise<{ ok: boolean; demo?: boolean; error?: string }> {
  if (!env.PLUNK_API_KEY) {
    console.log(
      "[plunk] demo mode — PLUNK_API_KEY missing; skip send",
      opts.to,
      opts.subject
    );
    return { ok: false, demo: true, error: "PLUNK_API_KEY not set" };
  }

  const from = opts.from || env.PLUNK_FROM_EMAIL || "hello@example.com";

  try {
    const res = await fetch("https://api.useplunk.com/v1/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PLUNK_API_KEY}`,
      },
      body: JSON.stringify({
        to: opts.to,
        subject: opts.subject,
        body: opts.body,
        from,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[plunk] send failed", res.status, text);
      return { ok: false, error: text || res.statusText };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[plunk] send error", message);
    return { ok: false, error: message };
  }
}
