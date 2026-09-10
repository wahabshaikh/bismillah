"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminImpersonateForm() {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function impersonate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (res.ok) {
        setStatus("Now impersonating. Reloading as that user…");
        window.location.href = "/dashboard";
        return;
      }
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus(d.error ?? "Could not impersonate");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/stop-impersonate", { method: "POST" });
      if (res.ok) {
        window.location.href = "/admin";
        return;
      }
      setStatus("Not impersonating — sign out instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={impersonate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          Target user (email or id)
          <Input
            autoComplete="off"
            placeholder="person@example.com"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </label>
        <Button type="submit" disabled={busy || !target.trim()}>
          {busy ? "Working…" : "Impersonate"}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={stop}>
          Stop impersonating
        </Button>
      </form>
      {status ? (
        <p className="text-sm text-slate-600 dark:text-slate-400" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
