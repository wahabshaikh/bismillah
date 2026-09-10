/**
 * Error monitoring — Sentry-compatible, dependency-free.
 *
 * When `SENTRY_DSN` is set, `captureException` / `captureMessage` POST a minimal
 * envelope to the Sentry ingest API using `fetch` (Workers-safe, no `@sentry/*`
 * package, no Node APIs). When the DSN is unset it falls back to a single
 * structured `console.error` so failures are still visible in `wrangler tail`.
 *
 * Never pass secrets in `ctx` — it is serialized into the event.
 */

type MonitoringEnv = {
  SENTRY_DSN?: string;
  SENTRY_ENVIRONMENT?: string;
};

type Ctx = Record<string, unknown>;

// Parse `https://<publicKey>@<host>/<projectId>` into an ingest URL + auth header.
function parseDsn(dsn: string): { url: string; publicKey: string } | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+/, "");
    if (!projectId || !u.username) return null;
    return {
      url: `${u.protocol}//${u.host}/api/${projectId}/store/`,
      publicKey: u.username,
    };
  } catch {
    return null;
  }
}

async function send(
  env: MonitoringEnv,
  level: "error" | "info",
  message: string,
  ctx?: Ctx,
  err?: unknown
): Promise<void> {
  const dsn = env.SENTRY_DSN ? parseDsn(env.SENTRY_DSN) : null;

  if (!dsn) {
    // Demo mode: structured console so it still shows up in logs.
    console.error("[monitoring]", JSON.stringify({ level, message, ctx }));
    if (err instanceof Error && err.stack) console.error(err.stack);
    return;
  }

  const payload = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level,
    environment: env.SENTRY_ENVIRONMENT ?? "production",
    message: { formatted: message },
    exception:
      err instanceof Error
        ? {
            values: [
              {
                type: err.name,
                value: err.message,
                stacktrace: err.stack ? { frames: [] } : undefined,
              },
            ],
          }
        : undefined,
    extra: ctx,
  };

  try {
    await fetch(dsn.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=bismillah/1, sentry_key=${dsn.publicKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (sendErr) {
    console.error("[monitoring] failed to report", sendErr);
  }
}

export function captureException(env: MonitoringEnv, err: unknown, ctx?: Ctx): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  return send(env, "error", message, ctx, err);
}

export function captureMessage(env: MonitoringEnv, message: string, ctx?: Ctx): Promise<void> {
  return send(env, "info", message, ctx);
}
