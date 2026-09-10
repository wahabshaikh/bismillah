"use client";

import { useState } from "react";
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

const CALLBACK = "/dashboard";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<null | "password" | "magic" | "google">(
    null
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending("password");
    const { error } = await authClient.signIn.email({ email, password });
    setPending(null);
    if (error) {
      setError(error.message || "Sign in failed");
      return;
    }
    window.location.href = CALLBACK;
  }

  async function sendMagicLink() {
    if (!email) {
      setError("Enter your email first to get a magic link.");
      return;
    }
    setError(null);
    setNotice(null);
    setPending("magic");
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: CALLBACK,
    });
    setPending(null);
    if (error) {
      setError(error.message || "Could not send magic link");
      return;
    }
    setNotice("Check your inbox for a one-time sign-in link.");
  }

  async function signInWithGoogle() {
    setError(null);
    setPending("google");
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: CALLBACK,
    });
    if (error) {
      setPending(null);
      setError(
        error.message ||
          "Google sign-in is unavailable (set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)."
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50/80 via-slate-50 to-slate-50 px-6 py-12 text-slate-950 dark:from-emerald-950/30 dark:via-slate-950 dark:to-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 inline-block">
          <Badge>Bismillah</Badge>
        </Link>
        <Card className="dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Welcome back — password, magic link, or Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
                  {notice}
                </p>
              ) : null}
              <Button type="submit" disabled={pending !== null}>
                {pending === "password" ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              or
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending !== null}
                onClick={sendMagicLink}
              >
                {pending === "magic" ? "Sending link…" : "Email me a magic link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending !== null}
                onClick={signInWithGoogle}
              >
                {pending === "google" ? "Redirecting…" : "Continue with Google"}
              </Button>
            </div>

            <div className="mt-4 flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
              <Link
                href="/forgot-password"
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Forgot your password?
              </Link>
              <span>
                New here?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Create an account
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
