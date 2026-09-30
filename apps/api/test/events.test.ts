import { describe, expect, it } from "vitest";
import type { UserEvent } from "../src/realtime/events.ts";
import { request, runJobs, signUp } from "./helpers.ts";

async function connect(cookie: string, origin = "http://localhost:3000") {
  const response = await request("/v1/events", {
    headers: { cookie, origin, upgrade: "websocket" },
  });
  expect(response.status).toBe(101);
  const socket = response.webSocket;
  if (!socket) throw new Error("No WebSocket on the response");
  socket.accept();

  const received: UserEvent[] = [];
  const waiters: (() => void)[] = [];
  socket.addEventListener("message", (event) => {
    if (typeof event.data !== "string" || event.data === "pong") return;
    received.push(JSON.parse(event.data) as UserEvent);
    for (const wake of waiters.splice(0)) wake();
  });

  /** Resolves with the first received event of `type`. */
  async function next<T extends UserEvent["type"]>(type: T) {
    for (;;) {
      const found = received.find((e) => e.type === type);
      if (found) return found as Extract<UserEvent, { type: T }>;
      await new Promise<void>((resolve, reject) => {
        waiters.push(resolve);
        setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 5000);
      });
    }
  }

  return { socket, next };
}

async function upload(cookie: string) {
  const response = await request("/v1/uploads?filename=live.txt", {
    method: "POST",
    headers: { cookie, "content-type": "text/plain", "content-length": "4" },
    body: "live",
  });
  return (await response.json()) as { id: string };
}

describe("GET /v1/events", () => {
  it("requires a session and a WebSocket upgrade", async () => {
    expect((await request("/v1/events", { headers: { upgrade: "websocket" } })).status).toBe(401);
    const { cookie } = await signUp();
    expect((await request("/v1/events", { headers: { cookie } })).status).toBe(426);
  });

  it("rejects origins that aren't trusted", async () => {
    const { cookie } = await signUp();
    const response = await request("/v1/events", {
      headers: { cookie, origin: "https://evil.example", upgrade: "websocket" },
    });
    expect(response.status).toBe(403);
  });

  it("pushes upload events to every socket the user has open", async () => {
    const { cookie } = await signUp();
    const first = await connect(cookie);
    const second = await connect(cookie);
    const tabs = [first, second];

    const created = await upload(cookie);
    for (const tab of tabs) {
      expect((await tab.next("upload.created")).upload).toMatchObject({
        id: created.id,
        status: "processing",
      });
    }

    await runJobs([{ type: "upload.process", uploadId: created.id }]);
    const processed = await first.next("upload.processed");
    expect(processed.upload).toMatchObject({ id: created.id, status: "ready" });

    await request(`/v1/uploads/${created.id}`, { method: "DELETE", headers: { cookie } });
    expect(await second.next("upload.deleted")).toEqual({
      type: "upload.deleted",
      id: created.id,
    });

    for (const tab of tabs) tab.socket.close();
  });

  it("keeps users' streams separate", async () => {
    const alice = await signUp();
    const bob = await signUp();
    const bobSocket = await connect(bob.cookie);
    await upload(alice.cookie);
    const mine = await upload(bob.cookie);
    expect((await bobSocket.next("upload.created")).upload.id).toBe(mine.id);
    bobSocket.socket.close();
  });

  it("answers keepalive pings", async () => {
    const { cookie } = await signUp();
    const { socket } = await connect(cookie);
    const pong = new Promise<string>((resolve) =>
      socket.addEventListener("message", (event) => resolve(event.data as string)),
    );
    socket.send("ping");
    expect(await pong).toBe("pong");
    socket.close();
  });
});
