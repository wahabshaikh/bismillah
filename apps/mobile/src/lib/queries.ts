import { unwrap } from "@bismillah/api-client";
import { QueryClient, queryOptions } from "@tanstack/react-query";
import { api } from "./api.ts";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

export const uploadsQuery = queryOptions({
  queryKey: ["uploads"],
  queryFn: () => unwrap(api.uploads.$get({ query: {} })),
});
