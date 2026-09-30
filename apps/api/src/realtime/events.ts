import type { SubscriptionJson } from "../billing/subscription.ts";
import type { UploadJson } from "../lib/upload-json.ts";

/** Everything the API pushes to a user's open WebSockets on `GET /v1/events`. */
export type UserEvent =
  | { type: "upload.created"; upload: UploadJson }
  | { type: "upload.processed"; upload: UploadJson }
  | { type: "upload.deleted"; id: string }
  | { type: "billing.updated"; subscription: SubscriptionJson };

/**
 * Sends `event` to every WebSocket the user has open. Costs one Durable Object
 * request, whether or not anyone is listening; outgoing messages are free.
 */
export async function publish(env: Env, userId: string, event: UserEvent): Promise<void> {
  await env.USER_EVENTS.getByName(userId).publish(event);
}
