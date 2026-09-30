import { Link } from "expo-router";
import { AuthForm } from "../components/auth-form.tsx";
import { Muted } from "../components/ui.tsx";
import { authClient } from "../lib/auth.ts";
import { queryClient } from "../lib/queries.ts";
import { useColors } from "../theme.ts";

export default function SignUp() {
  const colors = useColors();

  return (
    <AuthForm
      title="Create an account"
      description="Email and password, stored in D1 by Better Auth."
      submitLabel="Sign up"
      withName
      footer={
        <Muted>
          Already have an account?{" "}
          <Link href="/sign-in" replace style={{ color: colors.primary }}>
            Sign in
          </Link>
        </Muted>
      }
      onSubmit={async ({ name, email, password }) => {
        queryClient.clear();
        const { error } = await authClient.signUp.email({ name, email, password });
        return error ? (error.message ?? "Sign up failed") : undefined;
      }}
    />
  );
}
