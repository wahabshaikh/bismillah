import { createAuthClient } from "better-auth/react";
import { API_URL } from "./api.ts";

/**
 * Better Auth runs inside the API Worker; the session is a cookie on the API origin.
 * The web and API origins must share a site (e.g. app.example.com and api.example.com,
 * or two localhost ports) so the browser sends that cookie on credentialed requests.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  basePath: "/api/auth",
  fetchOptions: { credentials: "include" },
});

export const { useSession } = authClient;
