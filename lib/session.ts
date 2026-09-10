/**
 * Server-side session helpers for RSC pages / route handlers.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { createAuth } from "./auth";

export async function getSession() {
  return createAuth(env).api.getSession({ headers: await headers() });
}

/** Redirect to /login when there is no session; otherwise return it. */
export async function requireSession(redirectTo = "/login") {
  const session = await getSession();
  if (!session) redirect(redirectTo);
  return session;
}
