import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient, unwrap } from "./index.ts";

function stubFetch(response: Response) {
  return vi.fn<typeof fetch>(async () => response);
}

describe("createApiClient", () => {
  it("calls /v1 routes on the API origin with credentials", async () => {
    const fetch = stubFetch(Response.json({ items: [], nextCursor: null }));
    const api = createApiClient({ baseUrl: "https://api.example.com", fetch });

    const body = await unwrap(api.uploads.$get({ query: { limit: "5" } }));

    expect(body).toEqual({ items: [], nextCursor: null });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("https://api.example.com/v1/uploads?limit=5");
    expect(init?.credentials).toBe("include");
  });

  it("sends headers instead of credentials when asked, as the mobile app does", async () => {
    const fetch = stubFetch(Response.json({ user: {}, session: {} }));
    const api = createApiClient({
      baseUrl: "https://api.example.com",
      fetch,
      credentials: "omit",
      headers: async () => ({ cookie: "better-auth.session_token=abc" }),
    });

    await unwrap(api.me.$get());

    const init = fetch.mock.calls[0]?.[1];
    expect(init?.credentials).toBe("omit");
    expect(new Headers(init?.headers).get("cookie")).toBe("better-auth.session_token=abc");
  });

  it("fills path params", async () => {
    const fetch = stubFetch(new Response(null, { status: 204 }));
    const api = createApiClient({ baseUrl: "https://api.example.com/", fetch });
    const id = "00000000-0000-4000-8000-000000000000";

    await api.uploads[":id"].$delete({ param: { id } });

    expect(fetch.mock.calls[0]?.[0]).toBe(`https://api.example.com/v1/uploads/${id}`);
  });
});

describe("unwrap", () => {
  it("throws ApiError with the API's message and status", async () => {
    const fetch = stubFetch(Response.json({ error: "Unauthorized" }, { status: 401 }));
    const api = createApiClient({ baseUrl: "https://api.example.com", fetch });

    const error = await unwrap(api.me.$get()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, message: "Unauthorized" });
  });
});
