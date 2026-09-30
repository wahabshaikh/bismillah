import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AuthForm } from "../components/auth-form.tsx";
import { authClient } from "../lib/auth.ts";
import { redirectSearch, safeRedirect } from "../lib/redirect.ts";

export const Route = createFileRoute("/sign-up")({
  validateSearch: redirectSearch,
  head: () => ({ meta: [{ title: "Sign up · bismillah" }] }),
  component: SignUp,
});

function SignUp() {
  const search = Route.useSearch();
  const router = useRouter();

  return (
    <AuthForm
      title="Create an account"
      description="Email and password, stored in D1 by Better Auth."
      submitLabel="Sign up"
      withName
      footer={
        <>
          Already have an account?{" "}
          <Link to="/sign-in" search={search} className="text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
      onSubmit={async ({ name, email, password }) => {
        const { error } = await authClient.signUp.email({ name, email, password });
        if (error) return error.message ?? "Sign up failed";
        await router.navigate({ to: safeRedirect(search.redirect) });
        return undefined;
      }}
    />
  );
}
