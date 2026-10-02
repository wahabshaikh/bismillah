import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Email } from "../src/email/send.ts";
import type { Job } from "../src/jobs/index.ts";
import { BASE, request, signUp } from "./helpers.ts";

/** Calls a Better Auth endpoint as a signed-in user. */
function auth(path: string, cookie: string, body?: unknown) {
  return request(`/api/auth${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie, origin: BASE, "content-type": "application/json" },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
}

async function createOrganization(cookie: string, name = "Acme") {
  const slug = `${name.toLowerCase()}-${crypto.randomUUID()}`;
  const response = await auth("/organization/create", cookie, { name, slug });
  expect(response.status).toBe(200);
  return (await response.json()) as { id: string; slug: string };
}

function activeOrganization(cookie: string) {
  return request("/v1/organization", { headers: { cookie } });
}

function captureEmails() {
  const emails: Email[] = [];
  vi.spyOn(env.JOBS, "sendBatch").mockImplementation(async (messages) => {
    for (const { body } of messages) {
      const job = body as Job;
      if (job.type === "email.send") emails.push(job.email);
    }
    return {} as QueueSendBatchResponse;
  });
  return emails;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("organizations", () => {
  it("rejects org-scoped routes until an organization is active", async () => {
    const { cookie } = await signUp();
    const response = await activeOrganization(cookie);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "No active organization" });
  });

  it("makes the creator the owner and the new organization active", async () => {
    const { cookie } = await signUp();
    const org = await createOrganization(cookie);

    const response = await activeOrganization(cookie);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      organization: { id: org.id, name: "Acme", slug: org.slug },
      roles: ["owner"],
    });
  });

  it("invites by email, and the invitee joins as a member", async () => {
    const owner = await signUp();
    const org = await createOrganization(owner.cookie, "Initech");
    const emails = captureEmails();
    const inviteeEmail = `invitee-${crypto.randomUUID()}@example.com`;

    const invited = await auth("/organization/invite-member", owner.cookie, {
      email: inviteeEmail,
      role: "member",
    });
    expect(invited.status).toBe(200);
    const { id } = (await invited.json()) as { id: string };

    const message = emails.find((email) => email.to === inviteeEmail);
    expect(message?.subject).toBe("Test User invited you to Initech");
    expect(message?.text).toContain(`${env.WEB_URL}/accept-invitation/${id}`);

    vi.restoreAllMocks();
    const invitee = await signUp({ email: inviteeEmail });
    const accepted = await auth("/organization/accept-invitation", invitee.cookie, {
      invitationId: id,
    });
    expect(accepted.status).toBe(200);

    const response = await activeOrganization(invitee.cookie);
    expect(await response.json()).toMatchObject({
      organization: { id: org.id },
      roles: ["member"],
    });
  });

  it("only lets the invited address accept an invitation", async () => {
    const owner = await signUp();
    await createOrganization(owner.cookie);
    captureEmails();
    const invited = await auth("/organization/invite-member", owner.cookie, {
      email: `someone-${crypto.randomUUID()}@example.com`,
      role: "admin",
    });
    const { id } = (await invited.json()) as { id: string };

    const stranger = await signUp();
    const accepted = await auth("/organization/accept-invitation", stranger.cookie, {
      invitationId: id,
    });
    expect(accepted.status).toBe(403);
    expect((await activeOrganization(stranger.cookie)).status).toBe(403);
  });

  it("signs you back in to your first organization", async () => {
    const { email, cookie } = await signUp();
    const org = await createOrganization(cookie);

    const signIn = await request("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "10.2.0.1" },
      body: JSON.stringify({ email, password: "correct horse battery" }),
    });
    expect(signIn.status).toBe(200);
    const fresh = signIn.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");

    const me = await request("/v1/me", { headers: { cookie: fresh } });
    const body = (await me.json()) as { session: { activeOrganizationId: string | null } };
    expect(body.session.activeOrganizationId).toBe(org.id);
  });

  it("locks out removed members straight away", async () => {
    const owner = await signUp();
    const org = await createOrganization(owner.cookie);
    captureEmails();
    const memberEmail = `member-${crypto.randomUUID()}@example.com`;
    const invited = await auth("/organization/invite-member", owner.cookie, {
      email: memberEmail,
      role: "member",
    });
    const { id } = (await invited.json()) as { id: string };
    vi.restoreAllMocks();
    const member = await signUp({ email: memberEmail });
    await auth("/organization/accept-invitation", member.cookie, { invitationId: id });
    expect((await activeOrganization(member.cookie)).status).toBe(200);

    const removed = await auth("/organization/remove-member", owner.cookie, {
      memberIdOrEmail: memberEmail,
      organizationId: org.id,
    });
    expect(removed.status).toBe(200);
    expect((await activeOrganization(member.cookie)).status).toBe(403);
  });
});
