import type { Email } from "./send.ts";

// Plain functions returning HTML and text, so there's no template engine in the bundle.
// Keep the HTML simple: inline styles and one table survive every mail client.

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ESCAPES[char] ?? char);
}

interface Layout {
  appName: string;
  heading: string;
  /** Paragraphs of plain text; escaped for the HTML part. */
  body: string[];
  action?: { label: string; url: string };
  footer: string;
}

function render(to: string, subject: string, layout: Layout): Email {
  const { appName, heading, body, action, footer } = layout;
  const paragraphs = body
    .map((p) => `<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(p)}</p>`)
    .join("");
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:10px 18px;border-radius:6px;background:#18181b;color:#fafafa;text-decoration:none;font-weight:600">${escapeHtml(action.label)}</a></p>
<p style="margin:0 0 16px;line-height:1.5;font-size:13px;color:#71717a">Or paste this link into your browser:<br><a href="${escapeHtml(action.url)}" style="color:#71717a;word-break:break-all">${escapeHtml(action.url)}</a></p>`
    : "";
  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px">
<tr><td style="padding:32px">
<p style="margin:0 0 24px;font-weight:600">${escapeHtml(appName)}</p>
<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(heading)}</h1>
${paragraphs}${button}
<p style="margin:24px 0 0;font-size:13px;color:#71717a">${escapeHtml(footer)}</p>
</td></tr></table>
</body></html>`;
  const text = [
    heading,
    ...body,
    ...(action ? [`${action.label}: ${action.url}`] : []),
    footer,
  ].join("\n\n");
  return { to, subject, html, text };
}

interface Recipient {
  email: string;
  name: string;
}

export function verifyEmail(appName: string, user: Recipient, url: string): Email {
  return render(user.email, `Confirm your email for ${appName}`, {
    appName,
    heading: `Welcome, ${user.name}`,
    body: [`Thanks for signing up for ${appName}. Confirm this is your email address.`],
    action: { label: "Confirm email", url },
    footer: "The link expires in 1 hour. If you didn't sign up, you can ignore this email.",
  });
}

export function resetPassword(appName: string, user: Recipient, url: string): Email {
  return render(user.email, `Reset your ${appName} password`, {
    appName,
    heading: "Reset your password",
    body: [`Someone asked to reset the password for your ${appName} account.`],
    action: { label: "Choose a new password", url },
    footer:
      "The link expires in 1 hour. If you didn't ask for this, you can ignore this email; your password won't change.",
  });
}

export function passwordChanged(appName: string, user: Recipient): Email {
  return render(user.email, `Your ${appName} password was changed`, {
    appName,
    heading: "Your password was changed",
    body: [
      `The password for your ${appName} account was just reset, and you were signed out on your other devices.`,
    ],
    footer: "If this wasn't you, reset your password again right away.",
  });
}

export function invitation(
  appName: string,
  invite: { email: string; organization: string; inviter: string; url: string },
): Email {
  return render(invite.email, `${invite.inviter} invited you to ${invite.organization}`, {
    appName,
    heading: `Join ${invite.organization}`,
    body: [
      `${invite.inviter} invited you to join ${invite.organization} on ${appName}.`,
      `Sign in or create an account with ${invite.email} to accept.`,
    ],
    action: { label: "Accept invitation", url: invite.url },
    footer:
      "The invitation expires in 48 hours. If you weren't expecting it, you can ignore this email.",
  });
}
