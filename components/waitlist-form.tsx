"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setDone(true);
        return;
      }
      setError(d.error ?? "Could not join the waitlist. Try again.");
    } catch {
      setError("Could not join the waitlist. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        role="status"
      >
        You&apos;re on the list. We&apos;ll be in touch before launch, in shaa Allah.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        Email
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        Name (optional)
        <Input
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <Button type="submit" disabled={busy || !email.trim()}>
        {busy ? "Joining…" : "Join the waitlist"}
      </Button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
