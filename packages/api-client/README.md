# @bismillah/api-client

A typed client for the [API Worker](../../apps/api), built on
[Hono RPC](https://hono.dev/docs/guides/rpc). Route paths, params, query strings and response
bodies are all inferred from the API's source, so a breaking API change fails `pnpm typecheck`
in every app that uses it.

```ts
import { createApiClient, unwrap } from "@bismillah/api-client";

const api = createApiClient({ baseUrl: "http://localhost:8787" });

const { user } = await unwrap(api.me.$get());
const { items, nextCursor } = await unwrap(api.uploads.$get({ query: { limit: "10" } }));
await unwrap(api.uploads[":id"].$delete({ param: { id } }));
```

- `createApiClient` targets the `/v1` routes and sends credentials by default, since sessions
  are cookies on the API origin. Pass `fetch` (a service binding, a test double, `expo/fetch`)
  or `headers` when you need them. The mobile app passes `credentials: "omit"` and sends the
  session cookie it keeps in secure storage as a header (see
  [`apps/mobile/src/lib/api.ts`](../../apps/mobile/src/lib/api.ts)).
- `unwrap` returns the typed success body, or throws an `ApiError` with the HTTP `status` and
  the API's `{ error }` message.

## Realtime events

`subscribeToEvents` streams the signed-in user's events from `GET /v1/events` (upload created,
processed, deleted), with keepalive pings and exponential-backoff reconnects:

```ts
import { subscribeToEvents } from "@bismillah/api-client";

const stop = subscribeToEvents({
  baseUrl: "http://localhost:8787",
  onEvent: (event) => console.log(event.type),
  onStatus: (status) => console.log(status), // "connecting" | "open" | "closed"
});
```

Browsers send the session cookie with the handshake. On native, pass `connect` to open the
socket with the cookie as a header: `(url) => new WebSocket(url, undefined, { headers: { cookie } })`.
The web app's [`useLiveUploads`](../../apps/web/src/lib/live.ts) shows how to apply events to a
TanStack Query cache.

The types come from `@bismillah/api/app`, declaration files the API emits with `pnpm types`
(Turborepo runs it before type-checking this package), so this package never type-checks the
API's Worker source against its own globals.
