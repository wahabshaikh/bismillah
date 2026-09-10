/**
 * Better Auth factory — create per request (the D1 binding is request-scoped).
 * Better Auth 1.5+ auto-detects Cloudflare D1 via `database: env.DB`.
 *
 * Enabled flows:
 *  - email + password (with forgot / reset password via Plunk)
 *  - magic link (better-auth `magicLink` plugin) — delivered via Plunk
 *  - Google OAuth — only registered when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set
 *
 * Every email send is demo-safe: `lib/email.ts` no-ops when PLUNK_API_KEY is unset.
 */
import { betterAuth } from "better-auth";
import { magicLink, admin } from "better-auth/plugins";
import {
  sendWelcomeEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
} from "./email";
import { getSiteUrl } from "./site";

export function createAuth(env: Env, request?: Request) {
  const baseURL = getSiteUrl(env, request);

  const hasGoogle = Boolean(
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
  );

  return betterAuth({
    database: env.DB,
    secret:
      env.BETTER_AUTH_SECRET || "dev-only-change-me-bismillah-32chars!!",
    baseURL,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(env, user.email, url);
      },
    },
    socialProviders: hasGoogle
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          },
        }
      : undefined,
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(env, email, url);
        },
      }),
      // Thin super-admin + impersonation. Authority is the `ADMIN_EMAILS`
      // allowlist (see `lib/admin.ts`); `/api/admin/*` routes call
      // `ensureAdminRole` so this plugin's permission check passes.
      // ⚠️ impersonation = full account access. Add MFA + an audit log before
      // relying on this in production.
      admin({ impersonationSessionDuration: 60 * 60 }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await sendWelcomeEmail(env, user.email, user.name || undefined);
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
