import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { request, signUp } from "./helpers.ts";

type UploadJson = { id: string; filename: string; contentType: string; size: number };

function upload(cookie: string, body: string, filename = "hello.txt", type = "text/plain") {
  return request(`/v1/uploads?filename=${encodeURIComponent(filename)}`, {
    method: "POST",
    headers: { cookie, "content-type": type, "content-length": String(body.length) },
    body,
  });
}

describe("uploads", () => {
  it("requires a session", async () => {
    const response = await request("/v1/uploads");
    expect(response.status).toBe(401);
  });

  it("stores the file in R2 and its metadata in D1", async () => {
    const { cookie, body: user } = await signUp();
    const response = await upload(cookie, "hello world");
    expect(response.status).toBe(201);
    const created = (await response.json()) as UploadJson;
    expect(created).toMatchObject({ filename: "hello.txt", contentType: "text/plain", size: 11 });

    const object = await env.UPLOADS.get(`users/${user.user.id}/${created.id}`);
    expect(await object?.text()).toBe("hello world");

    const list = await request("/v1/uploads", { headers: { cookie } });
    const page = (await list.json()) as { items: UploadJson[]; nextCursor: number | null };
    expect(page.items.map((i) => i.id)).toEqual([created.id]);
    expect(page.nextCursor).toBeNull();

    const meta = await request(`/v1/uploads/${created.id}`, { headers: { cookie } });
    expect(await meta.json()).toMatchObject({ id: created.id, size: 11 });
  });

  it("downloads as an attachment", async () => {
    const { cookie } = await signUp();
    const created = (await (
      await upload(cookie, "<script>", "x.html", "text/html")
    ).json()) as UploadJson;

    const response = await request(`/v1/uploads/${created.id}/content`, { headers: { cookie } });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<script>");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("paginates newest first", async () => {
    const { cookie } = await signUp();
    for (const name of ["a", "b", "c"]) {
      await upload(cookie, name, `${name}.txt`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const first = (await (
      await request("/v1/uploads?limit=2", { headers: { cookie } })
    ).json()) as {
      items: UploadJson[];
      nextCursor: number;
    };
    expect(first.items.map((i) => i.filename)).toEqual(["c.txt", "b.txt"]);

    const second = (await (
      await request(`/v1/uploads?limit=2&before=${first.nextCursor}`, { headers: { cookie } })
    ).json()) as { items: UploadJson[] };
    expect(second.items.map((i) => i.filename)).toEqual(["a.txt"]);
  });

  it("hides other users' uploads", async () => {
    const owner = await signUp();
    const other = await signUp();
    const created = (await (await upload(owner.cookie, "secret")).json()) as UploadJson;

    for (const path of [`/v1/uploads/${created.id}`, `/v1/uploads/${created.id}/content`]) {
      expect((await request(path, { headers: { cookie: other.cookie } })).status).toBe(404);
    }
    const del = await request(`/v1/uploads/${created.id}`, {
      method: "DELETE",
      headers: { cookie: other.cookie },
    });
    expect(del.status).toBe(404);
  });

  it("deletes from R2 and D1", async () => {
    const { cookie, body: user } = await signUp();
    const created = (await (await upload(cookie, "bye")).json()) as UploadJson;

    const response = await request(`/v1/uploads/${created.id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    expect(response.status).toBe(204);
    expect(await env.UPLOADS.head(`users/${user.user.id}/${created.id}`)).toBeNull();
    expect((await request(`/v1/uploads/${created.id}`, { headers: { cookie } })).status).toBe(404);
  });

  it("rejects oversized and invalid uploads", async () => {
    const { cookie } = await signUp();
    const tooBig = await request("/v1/uploads?filename=big.bin", {
      method: "POST",
      headers: { cookie, "content-length": String(Number(env.MAX_UPLOAD_BYTES) + 1) },
      body: "x",
    });
    expect(tooBig.status).toBe(413);

    const noName = await request("/v1/uploads", {
      method: "POST",
      headers: { cookie, "content-length": "1" },
      body: "x",
    });
    expect(noName.status).toBe(400);

    const badId = await request("/v1/uploads/not-a-uuid", { headers: { cookie } });
    expect(badId.status).toBe(400);
  });
});
