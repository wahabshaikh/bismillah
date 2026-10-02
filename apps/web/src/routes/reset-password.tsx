import { Card, CardDescription, CardHeader, CardTitle } from "@bismillah/ui/components/card";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AuthForm } from "../components/auth-form.tsx";
import { authClient } from "../lib/auth.ts";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string; error?: string } => ({
    ...(typeof search["token"] === "string" ? { token: search["token"] } : {}),
    ...(typeof search["error"] === "string" ? { error: search["error"] } : {}),
  }),
  head: () => ({ meta: [{ title: "Reset password · bismillah" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token } = Route.useSearch();
  const router = useRouter();

  if (!token) {
    return (
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>This link has expired</CardTitle>
          <CardDescription>
            Reset links work once, for 1 hour.{" "}
            <Link to="/forgot-password" className="text-primary hover:underline">
              Send a new one
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <AuthForm
      title="Choose a new password"
      description="You'll be signed out everywhere else."
      submitLabel="Reset password"
      fields={["password"]}
      newPassword
      onSubmit={async ({ password }) => {
        const { error } = await authClient.resetPassword({ newPassword: password, token });
        if (error) return error.message ?? "Could not reset the password";
        await router.navigate({ to: "/sign-in" });
        return undefined;
      }}
    />
  );
}
