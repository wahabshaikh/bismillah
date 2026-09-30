import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "../lib/auth.ts";

/**
 * Layout for signed-in pages. The session cookie belongs to the API origin, so the
 * web Worker can't read it during SSR: these pages render in the browser instead.
 */
export const Route = createFileRoute("/_authed")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await authClient.getSession();
    if (!data) {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: Outlet,
});
