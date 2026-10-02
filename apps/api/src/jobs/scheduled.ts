import { and, asc, isNull, lt } from "drizzle-orm";
import { createDb, schema } from "../db/index.ts";
import { enqueue } from "./index.ts";

const { invitation, session, upload, verification } = schema;

/** Uploads still unprocessed after this long are assumed to have lost their job. */
export const STALE_UPLOAD_MS = 15 * 60 * 1000;
/** Re-enqueued per run, so a persistent failure can't flood the queue. */
const SWEEP_LIMIT = 100;

/**
 * Runs on the Cron Trigger in wrangler.jsonc (hourly). Each task is independent:
 * one failing doesn't stop the others, but the run is still reported as failed.
 */
export async function runScheduled(env: Env, now = new Date()): Promise<void> {
  const db = createDb(env.DB);

  const tasks = {
    // Better Auth never deletes expired email-verification and reset tokens.
    async expiredVerifications() {
      const rows = await db
        .delete(verification)
        .where(lt(verification.expiresAt, now))
        .returning({ id: verification.id });
      return rows.length;
    },
    // Better Auth marks invitations accepted, rejected or canceled but never deletes them.
    // Past their expiry they can't be accepted any more, so drop them.
    async expiredInvitations() {
      const rows = await db
        .delete(invitation)
        .where(lt(invitation.expiresAt, now))
        .returning({ id: invitation.id });
      return rows.length;
    },
    // Sessions live in KV, which expires them itself. This only matters if you
    // turn on `session.storeSessionInDatabase` in src/auth.ts.
    async expiredSessions() {
      const rows = await db
        .delete(session)
        .where(lt(session.expiresAt, now))
        .returning({ id: session.id });
      return rows.length;
    },
    // Retries uploads whose job was dropped (queue send failed, or retries ran out).
    async staleUploads() {
      const rows = await db
        .select({ id: upload.id })
        .from(upload)
        .where(
          and(
            isNull(upload.processedAt),
            lt(upload.createdAt, new Date(now.getTime() - STALE_UPLOAD_MS)),
          ),
        )
        .orderBy(asc(upload.createdAt))
        .limit(SWEEP_LIMIT);
      await enqueue(
        env,
        rows.map((row) => ({ type: "upload.process", uploadId: row.id })),
      );
      return rows.length;
    },
  };

  const names = Object.keys(tasks) as (keyof typeof tasks)[];
  const results = await Promise.allSettled(names.map((name) => tasks[name]()));

  let failed = false;
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      console.log(`cron ${names[i]}: ${result.value}`);
    } else {
      failed = true;
      console.error(`cron ${names[i]} failed`, result.reason);
    }
  });
  if (failed) throw new Error("One or more scheduled tasks failed");
}
