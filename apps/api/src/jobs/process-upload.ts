import { and, eq, isNull } from "drizzle-orm";
import { createDb, schema } from "../db/index.ts";
import { uploadJson } from "../lib/upload-json.ts";
import { publish } from "../realtime/events.ts";

const { upload } = schema;

/**
 * Post-upload processing: streams the file back out of R2 to compute its SHA-256,
 * marks the upload ready, and tells the owner's open clients. This is where you'd
 * generate thumbnails, scan for malware, extract text and so on.
 */
export async function processUpload(env: Env, uploadId: string): Promise<void> {
  const db = createDb(env.DB);
  const row = await db.query.upload.findFirst({ where: eq(upload.id, uploadId) });
  // Deleted before we got to it, or a redelivered message for finished work.
  if (!row || row.processedAt) return;

  const object = await env.UPLOADS.get(row.key);
  if (!object) {
    // Metadata without a file can't be processed or downloaded; drop it.
    await db.delete(upload).where(eq(upload.id, row.id));
    await publish(env, row.userId, { type: "upload.deleted", id: row.id });
    return;
  }

  // Streams, so memory stays flat however large the file is.
  const digest = new crypto.DigestStream("SHA-256");
  await object.body.pipeTo(digest);
  const sha256 = toHex(await digest.digest);

  const [updated] = await db
    .update(upload)
    .set({ sha256, processedAt: new Date() })
    .where(and(eq(upload.id, row.id), isNull(upload.processedAt)))
    .returning();
  if (updated) {
    await publish(env, updated.userId, { type: "upload.processed", upload: uploadJson(updated) });
  }
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
