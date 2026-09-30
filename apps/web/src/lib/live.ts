import {
  type EventStreamStatus,
  subscribeToEvents,
  type UploadJson,
  type UserEvent,
} from "@bismillah/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_URL } from "./api.ts";
import { billingQuery, uploadsQuery } from "./queries.ts";

export interface Activity {
  key: number;
  at: Date;
  event: UserEvent;
}

const MAX_ACTIVITY = 5;

/**
 * Keeps the uploads list in sync with `GET /v1/events`: uploads from other tabs and
 * devices appear, and each one flips from "processing" to "ready" when its
 * background job finishes, without polling. The plan card updates the same way when
 * Whop's webhook reports a payment or cancellation.
 */
export function useLiveUploads() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<EventStreamStatus>("connecting");
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    let opened = false;
    let key = 0;

    return subscribeToEvents({
      baseUrl: API_URL,
      onStatus: (next) => {
        setStatus(next);
        // Events sent while we were disconnected are lost, so refetch after a reconnect.
        if (next === "open" && opened) {
          void queryClient.invalidateQueries({ queryKey: uploadsQuery.queryKey });
          void queryClient.invalidateQueries({ queryKey: billingQuery.queryKey });
        }
        if (next === "open") opened = true;
      },
      onEvent: (event) => {
        if (event.type === "billing.updated") {
          // The event carries the membership that changed, which may not be the one that
          // decides access (say, an old canceled one), so ask the API again.
          void queryClient.invalidateQueries({ queryKey: billingQuery.queryKey });
        } else {
          queryClient.setQueryData(uploadsQuery.queryKey, (data) =>
            data ? { ...data, items: applyEvent(data.items, event) } : data,
          );
        }
        setActivity((list) =>
          [{ key: key++, at: new Date(), event }, ...list].slice(0, MAX_ACTIVITY),
        );
      },
    });
  }, [queryClient]);

  return { status, activity };
}

function applyEvent(
  items: UploadJson[],
  event: Exclude<UserEvent, { type: "billing.updated" }>,
): UploadJson[] {
  switch (event.type) {
    case "upload.created":
      return items.some((item) => item.id === event.upload.id) ? items : [event.upload, ...items];
    case "upload.processed":
      return items.map((item) => (item.id === event.upload.id ? event.upload : item));
    case "upload.deleted":
      return items.filter((item) => item.id !== event.id);
  }
}
