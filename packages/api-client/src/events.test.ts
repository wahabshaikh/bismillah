import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type EventSocket, eventsUrl, subscribeToEvents, type UserEvent } from "./events.ts";

class FakeSocket implements EventSocket {
  readyState = 0;
  sent: string[] = [];
  onopen: ((event: never) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: never) => void) | null = null;

  open() {
    this.readyState = 1;
    this.onopen?.(undefined as never);
  }
  receive(data: string) {
    this.onmessage?.({ data });
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.(undefined as never);
  }
}

describe("eventsUrl", () => {
  it("switches to the WebSocket scheme", () => {
    expect(eventsUrl("https://api.example.com")).toBe("wss://api.example.com/v1/events");
    expect(eventsUrl("http://localhost:8787/")).toBe("ws://localhost:8787/v1/events");
  });
});

describe("subscribeToEvents", () => {
  let sockets: FakeSocket[];
  const connect = () => {
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  };

  beforeEach(() => {
    sockets = [];
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses events and ignores pongs", () => {
    const events: UserEvent[] = [];
    const stop = subscribeToEvents({
      baseUrl: "http://localhost:8787",
      connect,
      onEvent: (e) => events.push(e),
    });
    const socket = sockets[0] as FakeSocket;
    socket.open();
    socket.receive("pong");
    socket.receive(JSON.stringify({ type: "upload.deleted", id: "x" }));
    expect(events).toEqual([{ type: "upload.deleted", id: "x" }]);
    stop();
  });

  it("pings to keep the connection alive", () => {
    const stop = subscribeToEvents({ baseUrl: "http://a", connect, onEvent: () => {} });
    const socket = sockets[0] as FakeSocket;
    socket.open();
    vi.advanceTimersByTime(45_000);
    expect(socket.sent).toEqual(["ping"]);
    stop();
  });

  it("reconnects with backoff, and stops for good when unsubscribed", () => {
    const statuses: string[] = [];
    const stop = subscribeToEvents({
      baseUrl: "http://a",
      connect,
      onEvent: () => {},
      onStatus: (s) => statuses.push(s),
    });
    (sockets[0] as FakeSocket).close();
    vi.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);

    (sockets[1] as FakeSocket).close();
    vi.advanceTimersByTime(2000);
    expect(sockets).toHaveLength(3);

    stop();
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(3);
    expect(statuses).toEqual([
      "connecting",
      "closed",
      "connecting",
      "closed",
      "connecting",
      "closed",
    ]);
  });
});
