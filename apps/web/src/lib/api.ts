import { createApiClient } from "@bismillah/api-client";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

/** Typed client for the API's `/v1` routes. */
export const api = createApiClient({ baseUrl: API_URL });
