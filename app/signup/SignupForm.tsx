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

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<null | "email" | "google">(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending("email");
    const { error } = await authClient.signUp.email({ name, email, password });
    setPending(null);
    if (error) {
      setError(error.message || "Sign up failed");
      return;
    }
    window.location.href = CALLBACK;
  }

  async function signUpWithGoogle() {
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
            <CardTitle>Create your account</CardTitle>
            <CardDescription className="dark:text-slate-400">
              Start every build in the Name — a welcome email is on its way.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                Name
                <Input
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
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
              <Button type="submit" disabled={pending !== null}>
                {pending === "email" ? "Creating…" : "Create account"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              or
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending !== null}
              onClick={signUpWithGoogle}
            >
              {pending === "google" ? "Redirecting…" : "Continue with Google"}
            </Button>

            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
