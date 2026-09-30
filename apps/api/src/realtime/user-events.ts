import { DurableObject } from "cloudflare:workers";
import type { UserEvent } from "./events.ts";

/** Clients send this every so often to keep the connection alive through proxies. */
export const PING = "ping";
export const PONG = "pong";

/** Oldest sockets are closed past this many per user (tabs, devices). */
const MAX_SOCKETS = 20;

/**
 * One instance per user (`getByName(userId)`), holding that user's WebSockets.
 *
 * It uses the WebSocket Hibernation API: between events the object is evicted from
 * memory while the sockets stay open, so an idle connection costs no duration.
 * Keepalive pings are answered by the runtime without waking it.
 */
export class UserEvents extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  /** Accepts a WebSocket upgrade. The API has already authenticated the user. */
  override async fetch(): Promise<Response> {
    const existing = this.ctx.getWebSockets();
    for (const socket of existing.slice(0, Math.max(0, existing.length - MAX_SOCKETS + 1))) {
      socket.close(1008, "Too many connections");
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Called over RPC by `publish()`. */
  publish(event: UserEvent): number {
    const data = JSON.stringify(event);
    let delivered = 0;
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(data);
        delivered++;
      } catch {
        // Already closing; the runtime drops it from getWebSockets() shortly.
      }
    }
    return delivered;
  }

  // The stream is server-to-client only. Anything other than a ping is ignored,
  // and each such message wakes the object, so clients should not send any.
  override webSocketMessage(): void {}

  override webSocketClose(socket: WebSocket, code: number, reason: string): void {
    try {
      socket.close(code, reason);
    } catch {
      // Already closed by the runtime.
    }
  }
}
