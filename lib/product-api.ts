/**
 * Shared helpers for the REST product API surface (`/api/v1/*`).
 *
 * This is the agent-facing surface: any agent can call plain REST without an
 * MCP SDK. A Model Context Protocol server can wrap these same routes later —
 * see the "Product API (agents)" section in `AGENTS.md`.
 *
 * Auth: when `PRODUCT_API_KEY` is set, callers must send
 * `Authorization: Bearer <key>`. When it is unset the surface is open (demo).
 */

/** Read from `package.json` — bump both together on release. */
export const APP_NAME = "bismillah";
export const APP_VERSION = "0.1.0";

export type ProductApiEnv = { PRODUCT_API_KEY?: string };

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/** Wrap a JSON body in a `Response` with permissive CORS headers. */
export function jsonWithCors(
  body: unknown,
  init: ResponseInit = {}
): Response {
  return Response.json(body, {
    ...init,
    headers: { ...CORS_HEADERS, ...(init.headers ?? {}) },
  });
}

/** Standard CORS preflight response. Export as `OPTIONS` from each route. */
export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Returns `null` when the request is authorised (key unset = demo-open, or a
 * matching bearer token), otherwise a 401 `Response` ready to return.
 */
export function requireProductApiKey(
  env: ProductApiEnv,
  request: Request
): Response | null {
  const expected = env.PRODUCT_API_KEY?.trim();
  if (!expected) return null; // demo mode — open

  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (token && token === expected) return null;

  return jsonWithCors(
    { error: "unauthorized", hint: "send Authorization: Bearer <PRODUCT_API_KEY>" },
    { status: 401 }
  );
}
