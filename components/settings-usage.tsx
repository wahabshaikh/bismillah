"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type UsageSummary = {
  meter: string;
  used: number;
  allowance: number;
  month: string;
};

export default function SettingsUsage({ initial }: { initial: UsageSummary }) {
  const [summary, setSummary] = useState<UsageSummary>(initial);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const pct =
    summary.allowance > 0
      ? Math.min(100, Math.round((summary.used / summary.allowance) * 100))
      : 0;

  async function recordDemoUnit() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/usage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ units: 1 }),
      });
      const d = (await res.json().catch(() => ({}))) as {
        summary?: UsageSummary;
        error?: string;
      };
      if (res.ok && d.summary) {
        setSummary(d.summary);
        setStatus("Recorded 1 demo unit.");
      } else {
        setStatus(d.error ?? "Could not record usage");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">
          {summary.used.toLocaleString()} / {summary.allowance.toLocaleString()} units
        </span>
        <span className="text-slate-500 dark:text-slate-400">{summary.month}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {summary.used === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No metered usage yet — this is a display stub.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={recordDemoUnit}
        >
          {busy ? "Recording…" : "Record demo unit"}
        </Button>
        {status ? (
          <span className="text-sm text-slate-600 dark:text-slate-400" role="status">
            {status}
          </span>
        ) : null}
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Counts come from the local D1 <code>usage_events</code> table. Set{" "}
        <code>POLAR_ACCESS_TOKEN</code> + <code>POLAR_METER_ID</code> to wire the
        documented <code>ingestPolarUsage</code> hook to Polar Events/Meters for
        prepaid metered credits — no interest, no BNPL.
      </p>
    </div>
  );
}
