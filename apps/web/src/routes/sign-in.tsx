import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AuthForm } from "../components/auth-form.tsx";
import { authClient } from "../lib/auth.ts";
import { redirectSearch, safeRedirect } from "../lib/redirect.ts";

export const Route = createFileRoute("/sign-in")({
  validateSearch: redirectSearch,
  head: () => ({ meta: [{ title: "Sign in · bismillah" }] }),
  component: SignIn,
});

function SignIn() {
  const search = Route.useSearch();
  const router = useRouter();

  return (
    <AuthForm
      title="Sign in"
      description="Welcome back."
      submitLabel="Sign in"
      footer={
        <>
          No account yet?{" "}
          <Link to="/sign-up" search={search} className="text-primary hover:underline">
            Sign up
          </Link>
          {" · "}
          <Link to="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </>
      }
      onSubmit={async ({ email, password }) => {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) return error.message ?? "Sign in failed";
        await router.navigate({ to: safeRedirect(search.redirect) });
        return undefined;
      }}
    />
  );
}
