import type { Upload } from "../db/schema.ts";

/** The public shape of an upload, shared by the REST routes and realtime events. */
export function uploadJson(row: Upload) {
  return {
    id: row.id,
    filename: row.filename,
    contentType: row.contentType,
    size: row.size,
    // Filled in by the `upload.process` job shortly after the upload lands.
    status: row.processedAt ? ("ready" as const) : ("processing" as const),
    sha256: row.sha256,
    createdAt: row.createdAt.toISOString(),
  };
}

export type UploadJson = ReturnType<typeof uploadJson>;
