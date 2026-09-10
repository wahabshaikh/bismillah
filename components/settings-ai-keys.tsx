"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Meta = { provider: string; hint: string; updatedAt: string } | null;

const PROVIDERS = [
  { value: "workers_ai", label: "Workers AI (default)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
];

const selectCls =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900";

export default function SettingsAiKeys() {
  const [meta, setMeta] = useState<Meta>(null);
  const [provider, setProvider] = useState("openai");
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings/ai-keys")
      .then((r) => (r.ok ? (r.json() as Promise<{ meta?: Meta }>) : null))
      .then((d) => {
        if (d?.meta) {
          setMeta(d.meta);
          if (d.meta.provider) setProvider(d.meta.provider);
        }
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings/ai-keys", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, key }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        meta?: Meta;
        error?: string;
      };
      if (res.ok && d.meta) {
        setMeta(d.meta);
        setKey("");
        setStatus("Saved. Your key is encrypted at rest.");
      } else {
        setStatus(d.error ?? "Could not save key");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/settings/ai-keys", { method: "DELETE" });
      if (res.ok) {
        setMeta(null);
        setKey("");
        setStatus("Key removed. Workers AI remains the default.");
      } else {
        setStatus("Could not remove key");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
          Workers AI (default)
        </span>
        {meta ? (
          <span className="text-slate-600 dark:text-slate-400">
            Stored: <span className="font-medium">{meta.provider}</span> key{" "}
            <span className="font-mono">{meta.hint || "••••"}</span>
          </span>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">
            No custom key — the ChatAgent uses Workers AI.
          </span>
        )}
      </div>

      <form onSubmit={save} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          Provider
          <select
            className={selectCls}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-[2] flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          API key
          <Input
            type="password"
            autoComplete="off"
            placeholder="sk-…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
          />
        </label>
        <Button type="submit" disabled={busy || !key.trim()}>
          {busy ? "Saving…" : "Save key"}
        </Button>
        {meta ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={remove}
          >
            Delete
          </Button>
        ) : null}
      </form>

      {status ? (
        <p className="text-sm text-slate-600 dark:text-slate-400" role="status">
          {status}
        </p>
      ) : null}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Keys are encrypted with AES-GCM before they touch the database and are
        never shown back in full. Wiring a stored key into the agent is a later
        step — Workers AI stays the default.
      </p>
    </div>
  );
}
