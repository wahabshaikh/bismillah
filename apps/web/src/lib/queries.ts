import { unwrap } from "@bismillah/api-client";
import { queryOptions } from "@tanstack/react-query";
import { API_URL, api } from "./api.ts";

export const healthQuery = queryOptions({
  queryKey: ["health"],
  queryFn: async () => {
    const response = await fetch(new URL("/health", API_URL));
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    return (await response.json()) as { ok: boolean; app: string };
  },
  retry: false,
});

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: () => unwrap(api.me.$get()),
});

export const uploadsQuery = queryOptions({
  queryKey: ["uploads"],
  queryFn: () => unwrap(api.uploads.$get({ query: {} })),
});

export const billingQuery = queryOptions({
  queryKey: ["billing"],
  queryFn: () => unwrap(api.billing.$get()),
});
