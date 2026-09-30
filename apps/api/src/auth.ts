import { invariant } from "@bismillah/core";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createDb, schema } from "./db/index.ts";
import { expoOrigin } from "./lib/expo-origin.ts";
import { kvSecondaryStorage } from "./lib/kv-storage.ts";

export function parseOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function createAuth(env: Env) {
  invariant(env.BETTER_AUTH_SECRET, "BETTER_AUTH_SECRET is not set (see .dev.vars.example)");
  return betterAuth({
    appName: env.APP_NAME,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: parseOrigins(env.TRUSTED_ORIGINS),
    database: drizzleAdapter(createDb(env.DB), { provider: "sqlite", schema }),
    // Sessions are read on every authenticated request, so they live in KV
    // (10M reads/month included) rather than D1.
    secondaryStorage: kvSecondaryStorage(env.KV),
    // Single-use tokens need an atomic read-and-delete, which KV cannot do.
    verification: { storeInDatabase: true },
    // Throttling is done by the AUTH_RATE_LIMITER binding (src/middleware/rate-limit.ts),
    // which is free and atomic; Better Auth's own limiter would cost a KV or D1 write
    // per request.
    rateLimit: { enabled: false },
    emailAndPassword: { enabled: true },
    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    plugins: [expoOrigin()],
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;

// `env` is the same object for every request an isolate serves, so build Better
// Auth once per isolate instead of once per request.
const instances = new WeakMap<Env, Auth>();

export function getAuth(env: Env): Auth {
  let auth = instances.get(env);
  if (!auth) {
    auth = createAuth(env);
    instances.set(env, auth);
  }
  return auth;
}
