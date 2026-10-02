import { Button, buttonClassName } from "@bismillah/ui";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { OrganizationSwitcher } from "../components/organization-switcher.tsx";
import { authClient, useSession } from "../lib/auth.ts";
import styles from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "bismillah" },
      {
        name: "description",
        content: "An open-source, multi-platform starter kit built entirely on Cloudflare.",
      },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootDocument,
  component: RootLayout,
  notFoundComponent: () => <p className="text-muted-foreground">This page does not exist.</p>,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-10 px-4 py-6">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function Header() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();

  async function signOut() {
    await authClient.signOut();
    queryClient.clear();
    await router.navigate({ to: "/" });
  }

  return (
    <header className="flex items-center justify-between gap-4">
      <Link to="/" className="font-semibold tracking-tight">
        bismillah
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        {isPending ? null : session ? (
          <>
            <OrganizationSwitcher />
            <Link to="/dashboard" className="px-2 hover:underline">
              Dashboard
            </Link>
            <Link to="/organization" className="px-2 hover:underline">
              Organization
            </Link>
            <Button variant="secondary" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Link to="/sign-in" className="px-2 hover:underline">
              Sign in
            </Link>
            <Link to="/sign-up" className={buttonClassName({ size: "sm" })}>
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
