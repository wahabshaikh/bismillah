import { Card, CardDescription, CardHeader, CardTitle } from "@bismillah/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthForm } from "../components/auth-form.tsx";
import { authClient } from "../lib/auth.ts";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Forgot password · bismillah" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string>();

  if (sentTo) {
    return (
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If {sentTo} has an account, a link to reset its password is on its way. The link expires
            in 1 hour.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <AuthForm
      title="Forgot your password?"
      description="We'll email you a link to choose a new one."
      submitLabel="Send reset link"
      fields={["email"]}
      footer={
        <Link to="/sign-in" className="text-primary hover:underline">
          Back to sign in
        </Link>
      }
      onSubmit={async ({ email }) => {
        // The emailed link goes through the API, which checks the token and then redirects
        // here with ?token=... (or ?error=INVALID_TOKEN).
        const { error } = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return error.message ?? "Could not send the email";
        setSentTo(email);
        return undefined;
      }}
    />
  );
}
