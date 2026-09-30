import type { AppType } from "@bismillah/api/app";
import { type ClientResponse, DetailedError, hc, parseResponse } from "hono/client";

export type { InferRequestType, InferResponseType } from "hono/client";

export interface ApiClientOptions {
  /** Origin of the API Worker, e.g. `https://api.example.com`. */
  baseUrl: string;
  /** Custom fetch, e.g. a service binding's `fetch` or a test double. */
  fetch?: typeof fetch;
  /** Extra headers for every request, e.g. a bearer token on mobile. */
  headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);
}

/**
 * Creates a client for the API's `/v1` routes, typed end to end from the Hono app.
 *
 * Sessions are cookies set by the API origin, so browser requests always send
 * credentials; the calling origin must be listed in the API's `TRUSTED_ORIGINS`.
 */
export function createApiClient(options: ApiClientOptions) {
  return hc<AppType>(new URL("/v1", options.baseUrl).toString(), {
    ...(options.fetch && { fetch: options.fetch }),
    ...(options.headers && { headers: options.headers }),
    init: { credentials: "include" },
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** A non-2xx response, carrying the API's `{ error }` message. */
export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Awaits a client call and returns its parsed, typed success body,
 * or throws an {@link ApiError} for any non-2xx response.
 *
 * @example const { items } = await unwrap(api.uploads.$get({ query: {} }));
 */
export async function unwrap<T extends ClientResponse<unknown>>(response: T | Promise<T>) {
  try {
    return await parseResponse(response);
  } catch (error) {
    if (!(error instanceof DetailedError)) throw error;
    const status = Number(error.statusCode ?? 0);
    const data: unknown = error.detail?.data;
    throw new ApiError(status, errorMessage(data) ?? error.message, data);
  }
}

function errorMessage(data: unknown): string | undefined {
  if (typeof data === "object" && data !== null && "error" in data) {
    return typeof data.error === "string" ? data.error : undefined;
  }
  return typeof data === "string" && data ? data : undefined;
}
