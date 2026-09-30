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

- `createApiClient` targets the `/v1` routes and always sends credentials, since sessions are
  cookies on the API origin. Pass `fetch` (a service binding, a test double) or `headers`
  (a bearer token on mobile) when you need them.
- `unwrap` returns the typed success body, or throws an `ApiError` with the HTTP `status` and
  the API's `{ error }` message.

The types come from `@bismillah/api/app`, declaration files the API emits with `pnpm types`
(Turborepo runs it before type-checking this package), so this package never type-checks the
API's Worker source against its own globals.
