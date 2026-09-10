/**
 * Display-only usage metering stub. Local D1 counts in `usage_events`
 * (`migrations/0007_p2.sql`) drive the "Usage this month" card on `/settings`.
 *
 * This is NOT live Polar billing. `ingestPolarUsage(...)` is a documented no-op
 * that shows exactly where to forward events to Polar's Events/Meters API when
 * you wire real metered credits.
 *
 * Halal framing: prepaid / fair metered credits — never interest, BNPL, or
 * subscription pressure. The `allowance` below is a prepaid bucket, not a
 * usage-based invoice.
 *
 * Demo-safe: every helper swallows D1 errors and returns a sane default.
 */

export type UsageEnv = {
  DB?: D1Database;
  POLAR_ACCESS_TOKEN?: string;
  POLAR_METER_ID?: string;
};

/** Meter the UI summarises. Chat token usage records under this name. */
export const DEFAULT_METER = "agent_tokens";

/** Prepaid monthly allowance for the progress bar (fair, one-time style). */
export const MONTHLY_ALLOWANCE = 10_000;

export type RecordUsageInput = {
  userId?: string | null;
  meter?: string;
  units?: number;
};

/**
 * Forward a usage event to Polar's Events/Meters API. Intentionally a
 * logging no-op in this slice — do NOT hit Polar's events endpoint here.
 *
 * To wire it later:
 *   1. Create a Meter in the Polar dashboard, note its id → `POLAR_METER_ID`.
 *   2. POST to `https://api.polar.sh/v1/events/ingest` with the org token:
 *        {
 *          events: [{
 *            name: meter,                       // e.g. "agent_tokens"
 *            external_customer_id: userId,      // = Better Auth user id
 *            metadata: { units },
 *          }]
 *        }
 *   3. Attach the meter to a prepaid credit benefit (no subscription/riba).
 */
export async function ingestPolarUsage(
  env: UsageEnv,
  event: { meter: string; units: number; userId?: string | null }
): Promise<void> {
  if (!env.POLAR_ACCESS_TOKEN || !env.POLAR_METER_ID) return;
  console.log(
    "[usage] ingestPolarUsage stub — would forward to Polar Events/Meters",
    { meter: event.meter, units: event.units, hasUser: Boolean(event.userId) }
  );
}

export async function recordUsage(
  env: UsageEnv,
  input: RecordUsageInput
): Promise<{ ok: boolean }> {
  const meter = (input.meter ?? DEFAULT_METER).trim() || DEFAULT_METER;
  const units =
    Number.isFinite(input.units) && (input.units as number) > 0
      ? Math.floor(input.units as number)
      : 1;
  const userId = input.userId?.trim() || null;

  if (!env.DB) return { ok: false };

  try {
    await env.DB.prepare(
      "INSERT INTO usage_events (id, user_id, meter, units) VALUES (?1, ?2, ?3, ?4)"
    )
      .bind(crypto.randomUUID(), userId, meter, units)
      .run();
    await ingestPolarUsage(env, { meter, units, userId });
    return { ok: true };
  } catch (err) {
    console.error("[usage] recordUsage failed", err);
    return { ok: false };
  }
}

export type UsageSummary = {
  meter: string;
  used: number;
  allowance: number;
  /** ISO month, e.g. "2026-09" */
  month: string;
};

/** Units for `meter` in the current calendar month for one user. */
export async function getUsageSummary(
  env: UsageEnv,
  userId: string,
  meter: string = DEFAULT_METER
): Promise<UsageSummary> {
  const month = new Date().toISOString().slice(0, 7);
  const base: UsageSummary = {
    meter,
    used: 0,
    allowance: MONTHLY_ALLOWANCE,
    month,
  };
  if (!env.DB || !userId) return base;

  try {
    const row = await env.DB.prepare(
      `SELECT COALESCE(SUM(units), 0) AS used
         FROM usage_events
        WHERE user_id = ?1
          AND meter = ?2
          AND strftime('%Y-%m', created_at) = ?3`
    )
      .bind(userId, meter, month)
      .first<{ used: number }>();
    return { ...base, used: Number(row?.used ?? 0) };
  } catch (err) {
    console.error("[usage] getUsageSummary failed", err);
    return base;
  }
}
