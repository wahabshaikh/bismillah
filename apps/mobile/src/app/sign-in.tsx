import { Link } from "expo-router";
import { AuthForm } from "../components/auth-form.tsx";
import { Muted } from "../components/ui.tsx";
import { authClient } from "../lib/auth.ts";
import { queryClient } from "../lib/queries.ts";
import { useColors } from "../theme.ts";

export default function SignIn() {
  const colors = useColors();

  return (
    <AuthForm
      title="Sign in"
      description="Welcome back."
      submitLabel="Sign in"
      footer={
        <Muted>
          No account yet?{" "}
          <Link href="/sign-up" replace style={{ color: colors.primary }}>
            Sign up
          </Link>
        </Muted>
      }
      onSubmit={async ({ email, password }) => {
        queryClient.clear();
        // On success the session updates and the root layout shows the signed-in screens.
        const { error } = await authClient.signIn.email({ email, password });
        return error ? (error.message ?? "Sign in failed") : undefined;
      }}
    />
  );
}
