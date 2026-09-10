"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OrgsCreateForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, slug: slug || undefined }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        org?: { id: string };
        error?: string;
      };
      if (res.ok && d.org) {
        window.location.href = `/orgs/${d.org.id}`;
        return;
      }
      setStatus(d.error ?? "Could not create organization");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        Name
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme"
          required
        />
      </label>
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
        Slug (optional)
        <Input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="acme"
        />
      </label>
      <Button type="submit" disabled={busy || !name.trim()}>
        {busy ? "Creating…" : "Create"}
      </Button>
      {status ? (
        <p className="w-full text-sm text-slate-600 dark:text-slate-400" role="status">
          {status}
        </p>
      ) : null}
    </form>
  );
}
