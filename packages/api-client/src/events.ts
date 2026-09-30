import type { UserEvent } from "@bismillah/api/app";

export type { UploadJson, UserEvent } from "@bismillah/api/app";

export type EventStreamStatus = "connecting" | "open" | "closed";

/** The subset of the WebSocket API this module uses, so tests and native shims fit. */
export interface EventSocket {
  readonly readyState: number;
  onopen: ((event: never) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: never) => void) | null;
  send(data: string): void;
  close(code?: number): void;
}

export interface EventStreamOptions {
  /** Origin of the API Worker, e.g. `https://api.example.com`. */
  baseUrl: string;
  onEvent: (event: UserEvent) => void;
  onStatus?: (status: EventStreamStatus) => void;
  /**
   * Opens the socket. Browsers send the session cookie with the handshake by
   * themselves; native apps pass the cookie as a header, e.g. React Native's
   * `new WebSocket(url, undefined, { headers: { cookie } })`.
   */
  connect?: (url: string) => EventSocket;
}

/** Keepalive interval. The API answers without waking its Durable Object. */
const PING_MS = 45_000;
const MAX_BACKOFF_MS = 30_000;
const OPEN = 1;

/** `ws(s)://…/v1/events` for an API origin. */
export function eventsUrl(baseUrl: string): string {
  const url = new URL("/v1/events", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/**
 * Streams the signed-in user's realtime events from `GET /v1/events`, reconnecting
 * with exponential backoff whenever the connection drops. Returns a function that
 * closes the stream for good.
 *
 * Events are hints, not a log: anything sent while a client was disconnected is
 * gone, so refetch on (re)connect if you need to be exact.
 */
export function subscribeToEvents(options: EventStreamOptions): () => void {
  const url = eventsUrl(options.baseUrl);
  const connect = options.connect ?? ((u: string) => new WebSocket(u) as EventSocket);
  let socket: EventSocket | undefined;
  let retries = 0;
  let reconnect: ReturnType<typeof setTimeout> | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;
  let stopped = false;

  function open() {
    options.onStatus?.("connecting");
    const current = connect(url);
    socket = current;

    current.onopen = () => {
      retries = 0;
      options.onStatus?.("open");
      ping = setInterval(() => {
        if (current.readyState === OPEN) current.send("ping");
      }, PING_MS);
    };
    current.onmessage = ({ data }) => {
      if (typeof data !== "string" || data === "pong") return;
      try {
        options.onEvent(JSON.parse(data) as UserEvent);
      } catch (error) {
        console.error("Ignoring malformed event", error);
      }
    };
    current.onclose = () => {
      clearInterval(ping);
      if (stopped || socket !== current) return;
      options.onStatus?.("closed");
      const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** retries++);
      reconnect = setTimeout(open, delay);
    };
  }

  open();

  return () => {
    stopped = true;
    clearTimeout(reconnect);
    clearInterval(ping);
    socket?.close(1000);
    options.onStatus?.("closed");
  };
}
