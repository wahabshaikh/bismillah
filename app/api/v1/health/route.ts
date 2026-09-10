import {
  APP_NAME,
  APP_VERSION,
  corsPreflight,
  jsonWithCors,
} from "@/lib/product-api";

/** GET /api/v1/health — always open, CORS-friendly. */
export function GET() {
  return jsonWithCors({ ok: true, name: APP_NAME, version: APP_VERSION });
}

export function OPTIONS() {
  return corsPreflight();
}
