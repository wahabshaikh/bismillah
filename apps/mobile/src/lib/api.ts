import { ApiError, createApiClient, type InferResponseType } from "@bismillah/api-client";
import { fetch as expoFetch } from "expo/fetch";
import { Directory, File as FsFile, Paths } from "expo-file-system";
import { sessionHeaders } from "./auth.ts";
import { API_URL } from "./config.ts";

/**
 * Typed client for the API's `/v1` routes, the same one the web app uses. Native apps send the
 * session cookie as a header rather than relying on the platform's cookie jar.
 */
export const api = createApiClient({
  baseUrl: API_URL,
  // Expo's WinterCG fetch: streaming bodies and standard `Response` semantics on native.
  fetch: expoFetch as unknown as typeof fetch,
  credentials: "omit",
  headers: sessionHeaders,
});

export type Upload = InferResponseType<typeof api.uploads.$post, 201>;

/**
 * Uploads a local file. The OS streams it from disk as the raw request body, which the API
 * pipes straight into R2, so the app never holds the whole file in memory.
 */
export async function uploadFile(
  file: { uri: string; name: string; mimeType?: string | undefined },
  onProgress?: (fraction: number) => void,
): Promise<Upload> {
  const url = api.uploads.$url({ query: { filename: file.name } });
  const result = await new FsFile(file.uri).upload(url.toString(), {
    headers: {
      ...(await sessionHeaders()),
      "content-type": file.mimeType || "application/octet-stream",
    },
    ...(onProgress && {
      onProgress: ({ bytesSent, totalBytes }) => onProgress(bytesSent / totalBytes),
    }),
  });
  const data = parseJson(result.body);
  if (result.status !== 201) {
    throw new ApiError(result.status, errorMessage(data) ?? "Upload failed", data);
  }
  return data as Upload;
}

/** Downloads an upload to the cache directory and returns the local file. */
export async function downloadUpload(id: string): Promise<FsFile> {
  const url = api.uploads[":id"].content.$url({ param: { id } });
  const directory = new Directory(Paths.cache, "downloads", id);
  directory.create({ idempotent: true, intermediates: true });
  return FsFile.downloadFileAsync(url.toString(), directory, {
    headers: await sessionHeaders(),
    idempotent: true,
  });
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

function errorMessage(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null && "error" in data) {
    return typeof data.error === "string" ? data.error : undefined;
  }
  return undefined;
}
