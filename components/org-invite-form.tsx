"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectCls =
  "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900";

export default function OrgInviteForm({ orgId }: { orgId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setEmail("");
        setStatus("Invitation recorded (stub — no email sent).");
      } else {
        setStatus(d.error ?? "Could not create invitation");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-[2] flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            required
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
          Role
          <select
            className={selectCls}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
        </label>
        <Button type="submit" disabled={busy || !email.trim()}>
          {busy ? "Sending…" : "Invite"}
        </Button>
      </div>
      {status ? (
        <p className="text-sm text-slate-600 dark:text-slate-400" role="status">
          {status}
        </p>
      ) : null}
    </form>
  );
}
