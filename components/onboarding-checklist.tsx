"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

type Step = { id: string; title: string; description: string; href: string };
type State = {
  steps: Record<string, string>;
  completedAt: string | null;
  dismissedAt: string | null;
  hidden: boolean;
};

type Payload = { steps: Step[]; state: State };

export default function OnboardingChecklist() {
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d) setData(d as Payload);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!data || data.state.hidden) return null;

  const { steps, state } = data;
  const done = steps.filter((s) => state.steps[s.id]).length;

  async function completeStep(stepId: string) {
    setBusy(stepId);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "complete_step", stepId }),
      });
      if (res.ok) {
        const d = (await res.json()) as { state: State };
        setData((prev) => (prev ? { ...prev, state: d.state } : prev));
        track("onboarding_step_complete", { step: stepId });
      }
    } finally {
      setBusy(null);
    }
  }

  async function dismiss() {
    setBusy("__dismiss");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? { ...prev, state: { ...prev.state, hidden: true, dismissedAt: new Date().toISOString() } }
            : prev
        );
        track("onboarding_dismissed");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-900/60 dark:bg-slate-900">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Get started</CardTitle>
            <CardDescription className="dark:text-slate-400">
              {done} of {steps.length} done — a few quick steps to set up Bismillah.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy === "__dismiss"}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Dismiss
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2">
          {steps.map((s) => {
            const complete = Boolean(state.steps[s.id]);
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <span
                  aria-hidden
                  className={
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] " +
                    (complete
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-300 text-transparent dark:border-slate-600")
                  }
                >
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      "text-sm font-medium " +
                      (complete ? "text-slate-400 line-through dark:text-slate-500" : "")
                    }
                  >
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {s.description}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={s.href}
                    className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                    onClick={() => track("onboarding_step_open", { step: s.id })}
                  >
                    Open
                  </Link>
                  {!complete && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === s.id}
                      onClick={() => completeStep(s.id)}
                    >
                      {busy === s.id ? "…" : "Mark done"}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
