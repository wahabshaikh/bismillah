/**
 * Email adapter — thin wrapper over Plunk (`lib/plunk.ts`) with the
 * transactional templates the SaaS shell needs: welcome, magic-link,
 * password-reset.
 *
 * Every send is demo-safe: when `PLUNK_API_KEY` is unset the underlying
 * `sendTransactionalEmail` logs and no-ops — it never throws, so auth flows
 * keep working locally without email configured.
 */
import { sendTransactionalEmail, type PlunkEnv } from "./plunk";

export { sendTransactionalEmail } from "./plunk";
export type { PlunkEnv, SendEmailOpts } from "./plunk";

export type EmailEnv = PlunkEnv;

const BRAND = "Bismillah";
const wrap = (inner: string) =>
  `<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6;color:#0f172a">${inner}<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/><p style="font-size:12px;color:#64748b">${BRAND} — start every build in the Name.</p></div>`;

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:#047857;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">${label}</a></p><p style="font-size:13px;color:#64748b">Or paste this link into your browser:<br/><a href="${href}">${href}</a></p>`;

export function sendWelcomeEmail(env: EmailEnv, to: string, name?: string) {
  return sendTransactionalEmail(env, {
    to,
    subject: `Welcome to ${BRAND}`,
    body: wrap(
      `<p>Assalamu alaikum ${name || "and welcome"},</p><p>Your ${BRAND} account is ready. Start every build in the Name — jump into the dashboard whenever you're set.</p>`
    ),
  });
}

export function sendMagicLinkEmail(env: EmailEnv, to: string, url: string) {
  return sendTransactionalEmail(env, {
    to,
    subject: `Your ${BRAND} sign-in link`,
    body: wrap(
      `<p>Assalamu alaikum,</p><p>Use the button below to sign in to ${BRAND}. This link expires shortly and can only be used once.</p>${button(
        url,
        "Sign in"
      )}<p style="font-size:13px;color:#64748b">If you didn't request this, you can safely ignore this email.</p>`
    ),
  });
}

export function sendPasswordResetEmail(env: EmailEnv, to: string, url: string) {
  return sendTransactionalEmail(env, {
    to,
    subject: `Reset your ${BRAND} password`,
    body: wrap(
      `<p>Assalamu alaikum,</p><p>We received a request to reset your ${BRAND} password. Use the button below to choose a new one.</p>${button(
        url,
        "Reset password"
      )}<p style="font-size:13px;color:#64748b">If you didn't request this, no action is needed — your password stays unchanged.</p>`
    ),
  });
}
