import { invariant } from "@bismillah/core";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { asc, eq } from "drizzle-orm";
import { createDb, schema } from "./db/index.ts";
import { invitation, passwordChanged, resetPassword, verifyEmail } from "./email/templates.ts";
import { enqueue } from "./jobs/index.ts";
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
  const db = createDb(env.DB);
  return betterAuth({
    appName: env.APP_NAME,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: parseOrigins(env.TRUSTED_ORIGINS),
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    // Sessions are read on every authenticated request, so they live in KV
    // (10M reads/month included) rather than D1.
    secondaryStorage: kvSecondaryStorage(env.KV),
    // Single-use tokens need an atomic read-and-delete, which KV cannot do.
    verification: { storeInDatabase: true },
    // Throttling is done by the AUTH_RATE_LIMITER binding (src/middleware/rate-limit.ts),
    // which is free and atomic; Better Auth's own limiter would cost a KV or D1 write
    // per request.
    rateLimit: { enabled: false },
    // Emails are rendered here and sent by the queue consumer (src/email/send.ts).
    emailAndPassword: {
      enabled: true,
      // Sign-up still signs the user in straight away; set `requireEmailVerification: true`
      // to block sign-in until the link in the verification email is clicked.
      sendResetPassword: async ({ user, url }) => {
        await enqueue(env, { type: "email.send", email: resetPassword(env.APP_NAME, user, url) });
      },
      onPasswordReset: async ({ user }) => {
        await enqueue(env, { type: "email.send", email: passwordChanged(env.APP_NAME, user) });
      },
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await enqueue(env, { type: "email.send", email: verifyEmail(env.APP_NAME, user, url) });
      },
    },
    databaseHooks: {
      session: {
        create: {
          // Sign-in drops you into the first organization you joined, so org-scoped routes
          // work straight away. One indexed D1 read per sign-in, none per request.
          before: async (session) => {
            const [first] = await db
              .select({ organizationId: schema.member.organizationId })
              .from(schema.member)
              .where(eq(schema.member.userId, session.userId))
              .orderBy(asc(schema.member.createdAt))
              .limit(1);
            return { data: { ...session, activeOrganizationId: first?.organizationId ?? null } };
          },
        },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    plugins: [
      expoOrigin(),
      // Organizations (workspaces) with owner/admin/member roles, email invitations and
      // teams. Endpoints live under /api/auth/organization/*; see docs/organizations.md.
      organization({
        teams: { enabled: true },
        // Better Auth doesn't build invitation links: this one opens the web app, which
        // signs you in (or up) first and then accepts the invitation.
        sendInvitationEmail: async ({ id, email, organization, inviter }) => {
          const url = new URL(`/accept-invitation/${id}`, env.WEB_URL).toString();
          await enqueue(env, {
            type: "email.send",
            email: invitation(env.APP_NAME, {
              email,
              organization: organization.name,
              inviter: inviter.user.name,
              url,
            }),
          });
        },
      }),
    ],
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
