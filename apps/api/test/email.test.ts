import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Email, sendEmail } from "../src/email/send.ts";
import { escapeHtml, verifyEmail } from "../src/email/templates.ts";
import type { Job } from "../src/jobs/index.ts";
import { BASE, request, runJobs, signUp } from "./helpers.ts";

/** Captures the jobs the Worker enqueues instead of letting the queue deliver them. */
function captureJobs() {
  const jobs: Job[] = [];
  vi.spyOn(env.JOBS, "sendBatch").mockImplementation(async (messages) => {
    for (const message of messages) jobs.push(message.body as Job);
    return {} as QueueSendBatchResponse;
  });
  return () => jobs.flatMap((job) => (job.type === "email.send" ? [job.email] : []));
}

function linkIn(email: Email): string {
  const url = /https?:\/\/\S+/.exec(email.text)?.[0];
  if (!url) throw new Error(`no link in "${email.subject}"`);
  return url;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("transactional email", () => {
  it("sends a verification email on sign-up, and the link verifies the address", async () => {
    const emails = captureJobs();
    const { email, cookie } = await signUp();

    const [message] = emails();
    expect(message).toMatchObject({ to: email, subject: "Confirm your email for bismillah" });
    const link = linkIn(message as Email);
    expect(link.startsWith(`${BASE}/api/auth/verify-email?token=`)).toBe(true);

    const verified = await request(link.slice(BASE.length), { redirect: "manual" });
    expect(verified.status).toBeLessThan(400);
    const me = await request("/v1/me", { headers: { cookie } });
    expect(((await me.json()) as { user: { emailVerified: boolean } }).user.emailVerified).toBe(
      true,
    );
  });

  it("resets a password from the emailed link and signs out other sessions", async () => {
    const { email, cookie } = await signUp();
    const emails = captureJobs();

    const asked = await request("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "10.1.0.1" },
      body: JSON.stringify({ email, redirectTo: "http://localhost:3000/reset-password" }),
    });
    expect(asked.status).toBe(200);

    const [message] = emails();
    expect(message).toMatchObject({ to: email, subject: "Reset your bismillah password" });
    // The link goes through the API, which checks the token and redirects to the web app.
    const redirect = await request(linkIn(message as Email).slice(BASE.length), {
      redirect: "manual",
    });
    const location = new URL(redirect.headers.get("location") ?? "");
    expect(location.origin + location.pathname).toBe("http://localhost:3000/reset-password");
    const token = location.searchParams.get("token");
    expect(token).toBeTruthy();

    const reset = await request("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "10.1.0.1" },
      body: JSON.stringify({ token, newPassword: "a brand new password" }),
    });
    expect(reset.status).toBe(200);
    expect(emails().map((e) => e.subject)).toContain("Your bismillah password was changed");
    expect((await request("/v1/me", { headers: { cookie } })).status).toBe(401);

    const signIn = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "10.1.0.1" },
      body: JSON.stringify({ email, password: "a brand new password" }),
    });
    expect(signIn.status).toBe(200);
  });

  it("sends nothing for an unknown address, and still answers 200", async () => {
    const emails = captureJobs();
    const asked = await request("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "10.1.0.2" },
      body: JSON.stringify({ email: "nobody@example.com" }),
    });
    expect(asked.status).toBe(200);
    expect(emails()).toEqual([]);
  });

  it("logs instead of sending when EMAIL_FROM is empty", async () => {
    const send = vi.spyOn(env.EMAIL, "send");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await runJobs([
      {
        type: "email.send",
        email: verifyEmail("bismillah", { email: "a@example.com", name: "A" }, "https://x.test"),
      },
    ]);
    expect(result.explicitAcks).toEqual(["0"]);
    expect(send).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "email not sent (EMAIL_FROM is not set)",
      expect.objectContaining({ to: "a@example.com" }),
    );
  });

  it("sends through the EMAIL binding from EMAIL_FROM", async () => {
    const send = vi.fn(async () => ({ messageId: "m1" }));
    const email = verifyEmail("bismillah", { email: "a@example.com", name: "A" }, "https://x.test");
    await sendEmail(
      { ...env, EMAIL_FROM: "noreply@example.com", EMAIL: { send } } as unknown as Env,
      email,
    );
    expect(send).toHaveBeenCalledWith({
      from: { email: "noreply@example.com", name: "bismillah" },
      to: "a@example.com",
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  });

  it("escapes user input in the HTML part", () => {
    const email = verifyEmail(
      "bismillah",
      { email: "a@example.com", name: "<b>x</b>" },
      "https://x",
    );
    expect(email.html).toContain(escapeHtml("<b>x</b>"));
    expect(email.html).not.toContain("<b>x</b>");
  });
});
