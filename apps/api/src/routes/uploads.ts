import { and, desc, eq, lt } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { schema } from "../db/index.ts";
import type { AuthedEnv } from "../env.ts";
import { enqueue } from "../jobs/index.ts";
import { uploadJson } from "../lib/upload-json.ts";
import { validate } from "../lib/validation.ts";
import { publish } from "../realtime/events.ts";

const { upload } = schema;

const createQuery = z.object({
  filename: z.string().trim().min(1).max(255),
});

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // Pagination cursor: `createdAt` (ms) of the last item on the previous page.
  before: z.coerce.number().int().positive().optional(),
});

const idParam = z.object({ id: z.uuid() });

/**
 * Files stream straight from the request body into R2, so a Worker never holds a
 * whole upload in memory. Send the bytes as the raw body with Content-Type and
 * Content-Length set: `POST /v1/uploads?filename=cat.png`.
 *
 * The response comes back as soon as the file is stored, with `status: "processing"`.
 * An `upload.process` job then checksums it, and `GET /v1/events` pushes the result.
 */
export const uploads = new Hono<AuthedEnv>()
  .post("/", validate("query", createQuery), async (c) => {
    const { filename } = c.req.valid("query");
    const contentType = c.req.header("content-type") || "application/octet-stream";
    const size = Number(c.req.header("content-length"));
    const body = c.req.raw.body;

    if (!body || !Number.isSafeInteger(size) || size <= 0) {
      throw new HTTPException(411, { message: "A non-empty body with Content-Length is required" });
    }
    if (size > Number(c.env.MAX_UPLOAD_BYTES)) {
      throw new HTTPException(413, {
        message: `Uploads are limited to ${c.env.MAX_UPLOAD_BYTES} bytes`,
      });
    }

    const id = crypto.randomUUID();
    const key = `users/${c.var.user.id}/${id}`;
    await c.env.UPLOADS.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: { userId: c.var.user.id, filename },
    });

    try {
      const [row] = await c.var.db
        .insert(upload)
        .values({ id, userId: c.var.user.id, key, filename, contentType, size })
        .returning();
      if (!row) throw new Error("Insert returned no row");
      const json = uploadJson(row);
      // Neither step should fail the upload: if the job is lost, the hourly sweep
      // in src/jobs/scheduled.ts enqueues it again.
      c.executionCtx.waitUntil(
        Promise.allSettled([
          enqueue(c.env, { type: "upload.process", uploadId: id }),
          publish(c.env, c.var.user.id, { type: "upload.created", upload: json }),
        ]).then(logRejections),
      );
      return c.json(json, 201);
    } catch (error) {
      await c.env.UPLOADS.delete(key);
      throw error;
    }
  })
  .get("/", validate("query", listQuery), async (c) => {
    const { limit, before } = c.req.valid("query");
    const rows = await c.var.db
      .select()
      .from(upload)
      .where(
        and(
          eq(upload.userId, c.var.user.id),
          before ? lt(upload.createdAt, new Date(before)) : undefined,
        ),
      )
      .orderBy(desc(upload.createdAt))
      .limit(limit);
    const last = rows.at(-1);
    return c.json({
      items: rows.map(uploadJson),
      nextCursor: rows.length === limit && last ? last.createdAt.getTime() : null,
    });
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const row = await findOwned(c.var.db, c.req.valid("param").id, c.var.user.id);
    return c.json(uploadJson(row));
  })
  .get("/:id/content", validate("param", idParam), async (c) => {
    const row = await findOwned(c.var.db, c.req.valid("param").id, c.var.user.id);
    const object = await c.env.UPLOADS.get(row.key);
    if (!object) throw new HTTPException(404, { message: "Upload not found" });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("content-length", String(object.size));
    // User content is always downloaded, never rendered on the API origin.
    headers.set(
      "content-disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
    );
    headers.set("x-content-type-options", "nosniff");
    headers.set("cache-control", "private, max-age=0");
    return new Response(object.body, { headers });
  })
  .delete("/:id", validate("param", idParam), async (c) => {
    const row = await findOwned(c.var.db, c.req.valid("param").id, c.var.user.id);
    await c.env.UPLOADS.delete(row.key);
    await c.var.db.delete(upload).where(eq(upload.id, row.id));
    c.executionCtx.waitUntil(
      publish(c.env, c.var.user.id, { type: "upload.deleted", id: row.id }).catch(console.error),
    );
    return c.body(null, 204);
  });

async function findOwned(db: AuthedEnv["Variables"]["db"], id: string, userId: string) {
  const row = await db.query.upload.findFirst({
    where: and(eq(upload.id, id), eq(upload.userId, userId)),
  });
  if (!row) throw new HTTPException(404, { message: "Upload not found" });
  return row;
}

function logRejections(results: PromiseSettledResult<unknown>[]) {
  for (const result of results) {
    if (result.status === "rejected") console.error(result.reason);
  }
}
