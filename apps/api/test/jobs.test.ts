import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import type { Job } from "../src/jobs/index.ts";
import { runScheduled, STALE_UPLOAD_MS } from "../src/jobs/scheduled.ts";
import { request, runJobs, signUp } from "./helpers.ts";

const HELLO_SHA256 = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";

async function upload(cookie: string, body = "hello world") {
  const response = await request("/v1/uploads?filename=hello.txt", {
    method: "POST",
    headers: { cookie, "content-type": "text/plain", "content-length": String(body.length) },
    body,
  });
  return (await response.json()) as { id: string; status: string; sha256: string | null };
}

function uploadRow(id: string) {
  return env.DB.prepare("select sha256, processed_at from upload where id = ?")
    .bind(id)
    .first<{ sha256: string | null; processed_at: number | null }>();
}

describe("upload.process job", () => {
  it("checksums the file and marks the upload ready", async () => {
    const { cookie } = await signUp();
    const created = await upload(cookie);
    expect(created.status).toBe("processing");

    const result = await runJobs([{ type: "upload.process", uploadId: created.id }]);
    expect(result.explicitAcks).toEqual(["0"]);
    expect(result.retryMessages).toEqual([]);

    const row = await uploadRow(created.id);
    expect(row?.sha256).toBe(HELLO_SHA256);
    const json = await request(`/v1/uploads/${created.id}`, { headers: { cookie } });
    expect(await json.json()).toMatchObject({ status: "ready", sha256: HELLO_SHA256 });
  });

  it("acks jobs for uploads that no longer exist", async () => {
    const result = await runJobs([{ type: "upload.process", uploadId: crypto.randomUUID() }]);
    expect(result.explicitAcks).toEqual(["0"]);
  });

  it("drops metadata whose file is missing from R2", async () => {
    const { cookie, body: user } = await signUp();
    const created = await upload(cookie);
    await env.UPLOADS.delete(`users/${user.user.id}/${created.id}`);

    await runJobs([{ type: "upload.process", uploadId: created.id }]);
    expect(await uploadRow(created.id)).toBeNull();
  });

  it("retries a job that throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runJobs([{ type: "nope" } as unknown as Job]);
    expect(result.retryMessages.map((m: { msgId: string }) => m.msgId)).toEqual(["0"]);
    spy.mockRestore();
  });
});

describe("scheduled cleanup", () => {
  it("deletes expired verification tokens and re-enqueues stale uploads", async () => {
    const now = Date.now();
    await env.DB.prepare(
      "insert into verification (id, identifier, value, expires_at) values (?, 'e', 'v', ?), (?, 'e', 'v', ?)",
    )
      .bind("expired", now - 1000, "live", now + 60_000)
      .run();

    const { cookie } = await signUp();
    const stale = await upload(cookie);
    const fresh = await upload(cookie);
    await env.DB.prepare("update upload set created_at = ? where id = ?")
      .bind(now - STALE_UPLOAD_MS - 1000, stale.id)
      .run();

    const sendBatch = vi.fn(async () => ({}) as QueueSendBatchResponse);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await runScheduled({ ...env, JOBS: { ...env.JOBS, sendBatch } } as Env, new Date(now));
    log.mockRestore();

    const ids = await env.DB.prepare(
      "select id from verification where id in ('expired', 'live')",
    ).all<{ id: string }>();
    expect(ids.results.map((r) => r.id)).toEqual(["live"]);

    const sent = sendBatch.mock.calls.flatMap((call) => (call as unknown as [{ body: Job }[]])[0]);
    const uploadIds = sent.map((m) => (m.body as { uploadId: string }).uploadId);
    expect(uploadIds).toContain(stale.id);
    expect(uploadIds).not.toContain(fresh.id);
  });
});
