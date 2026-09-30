import { type Email, sendEmail } from "../email/send.ts";
import { processUpload } from "./process-upload.ts";

/**
 * Every message on the JOBS queue. Add a job by adding a variant here and a case
 * to `run()`. Keep bodies small: each 64 KB is billed as a separate operation.
 */
export type Job =
  | { type: "upload.process"; uploadId: string }
  | { type: "email.send"; email: Email };

export async function enqueue(env: Env, jobs: Job | Job[]): Promise<void> {
  const list = Array.isArray(jobs) ? jobs : [jobs];
  // sendBatch takes at most 100 messages per call.
  for (let i = 0; i < list.length; i += 100) {
    await env.JOBS.sendBatch(list.slice(i, i + 100).map((body) => ({ body })));
  }
}

function run(job: Job, env: Env): Promise<void> {
  switch (job.type) {
    case "upload.process":
      return processUpload(env, job.uploadId);
    case "email.send":
      return sendEmail(env, job.email);
    default:
      // Retried, then dropped: an old deploy's job, or a malformed message.
      throw new Error(`Unknown job type: ${(job as { type: string }).type}`);
  }
}

/**
 * The queue consumer. Messages are acked or retried one by one, so one failing
 * job doesn't redeliver the whole batch. Delivery is at least once: jobs must be
 * safe to run twice.
 */
export async function handleJobs(batch: MessageBatch<Job>, env: Env): Promise<void> {
  await Promise.all(
    batch.messages.map(async (message) => {
      try {
        await run(message.body, env);
        message.ack();
      } catch (error) {
        console.error("job failed", { job: message.body, attempts: message.attempts, error });
        // Back off 30s, 60s, 90s... before the next attempt.
        message.retry({ delaySeconds: 30 * message.attempts });
      }
    }),
  );
}
