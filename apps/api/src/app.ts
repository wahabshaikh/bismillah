import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { getAuth, parseOrigins } from "./auth.ts";
import { createDb } from "./db/index.ts";
import type { AppEnv, AuthedEnv } from "./env.ts";
import { loadSession, requireAuth } from "./middleware/auth.ts";
import { rateLimit } from "./middleware/rate-limit.ts";
import { uploads } from "./routes/uploads.ts";

const app = new Hono<AppEnv>();

// "same-site" lets the web app on a sibling subdomain embed downloads (e.g. <img src>).
app.use(requestId(), secureHeaders({ crossOriginResourcePolicy: "same-site" }));

app.use("*", async (c, next) => {
  c.set("db", createDb(c.env.DB));
  c.set("auth", getAuth(c.env));
  await next();
});

app.use(
  "*",
  cors({
    origin: (origin, c) => (parseOrigins(c.env.TRUSTED_ORIGINS).includes(origin) ? origin : null),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 600,
  }),
);

app.get("/health", (c) => c.json({ ok: true, app: c.env.APP_NAME }));

// Better Auth owns everything under /api/auth (sign-up, sign-in, sign-out, session...).
// Writes are throttled per IP before they reach D1.
app.post(
  "/api/auth/*",
  rateLimit((env) => env.AUTH_RATE_LIMITER),
);
app.on(["GET", "POST"], "/api/auth/*", (c) => c.var.auth.handler(c.req.raw));

const v1 = new Hono<AuthedEnv>()
  .use(loadSession, requireAuth)
  .get("/me", (c) => c.json({ user: c.var.user, session: c.var.session }))
  .route("/uploads", uploads);

// Cast is safe: `requireAuth` guarantees the narrowed variables inside `v1`.
app.route("/v1", v1 as unknown as Hono<AppEnv>);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status);
  }
  console.error(error);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
export type AppType = typeof v1;
