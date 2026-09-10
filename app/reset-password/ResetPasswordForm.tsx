"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
    if (params.get("error")) {
      setError("This reset link is invalid or has expired. Request a new one.");
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token — open the link from your email again.");
      return;
    }
    setError(null);
    setPending(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (error) {
      setError(error.message || "Could not reset password");
      return;
    }
    setDone(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-block">
          <Badge>Bismillah</Badge>
        </Link>
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Choose a new password</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Pick something at least 8 characters long.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
                Password updated.{" "}
                <Link href="/login" className="font-medium hover:underline">
                  Sign in →
                </Link>
              </p>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  New password
                  <Input
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                {error ? (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Update password"}
                </Button>
              </form>
            )}
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              <Link
                href="/forgot-password"
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Request a new link
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
