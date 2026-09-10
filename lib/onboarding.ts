/**
 * Onboarding checklist state — one row per user in D1 `user_onboarding`.
 *
 * Demo-safe: every helper swallows D1 errors and returns a sane default so a
 * missing migration / unbound DB never crashes the dashboard.
 */

export type OnboardingEnv = { DB?: D1Database };

/** Default checklist. Order here is the order shown in the UI. */
export const ONBOARDING_STEPS = [
  {
    id: "profile",
    title: "Confirm your profile",
    description: "Check your name and email in settings.",
    href: "/settings",
  },
  {
    id: "ai_key",
    title: "Add an AI provider key (optional)",
    description: "Bring your own key, or keep the Workers AI default.",
    href: "/settings",
  },
  {
    id: "chat",
    title: "Try the agent chat",
    description: "Say salam to the Workers AI ChatAgent.",
    href: "/chat",
  },
  {
    id: "billing",
    title: "Review pricing",
    description: "One-time halal price — buy when you're ready.",
    href: "/pricing",
  },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export const ONBOARDING_STEP_IDS = ONBOARDING_STEPS.map((s) => s.id) as OnboardingStepId[];

export type OnboardingState = {
  steps: Record<string, string>; // stepId -> ISO timestamp
  completedAt: string | null;
  dismissedAt: string | null;
  /** true when every step is done, or the user dismissed the checklist */
  hidden: boolean;
};

const EMPTY: OnboardingState = {
  steps: {},
  completedAt: null,
  dismissedAt: null,
  hidden: false,
};

function isStepId(id: string): id is OnboardingStepId {
  return (ONBOARDING_STEP_IDS as string[]).includes(id);
}

function parseSteps(raw: unknown): Record<string, string> {
  if (typeof raw !== "string" || !raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (isStepId(k) && typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function allDone(steps: Record<string, string>): boolean {
  return ONBOARDING_STEP_IDS.every((id) => Boolean(steps[id]));
}

function toState(row: {
  steps_json?: string | null;
  completed_at?: string | null;
  dismissed_at?: string | null;
} | null): OnboardingState {
  if (!row) return EMPTY;
  const steps = parseSteps(row.steps_json);
  const completedAt = row.completed_at ?? (allDone(steps) ? new Date().toISOString() : null);
  const dismissedAt = row.dismissed_at ?? null;
  return {
    steps,
    completedAt,
    dismissedAt,
    hidden: Boolean(dismissedAt) || Boolean(completedAt),
  };
}

export async function getOnboarding(
  env: OnboardingEnv,
  userId: string
): Promise<OnboardingState> {
  if (!env.DB) return EMPTY;
  try {
    const row = await env.DB.prepare(
      "SELECT steps_json, completed_at, dismissed_at FROM user_onboarding WHERE user_id = ?"
    )
      .bind(userId)
      .first<{
        steps_json: string | null;
        completed_at: string | null;
        dismissed_at: string | null;
      }>();
    return toState(row);
  } catch (err) {
    console.error("[onboarding] read failed", err);
    return EMPTY;
  }
}

/** Mark one checklist step complete; completes the whole checklist when all are done. */
export async function markStep(
  env: OnboardingEnv,
  userId: string,
  stepId: string
): Promise<OnboardingState> {
  if (!env.DB) return EMPTY;
  if (!isStepId(stepId)) return getOnboarding(env, userId);

  const current = await getOnboarding(env, userId);
  if (current.steps[stepId]) return current;

  const now = new Date().toISOString();
  const steps = { ...current.steps, [stepId]: now };
  const completedAt = allDone(steps) ? now : null;

  try {
    await env.DB.prepare(
      `INSERT INTO user_onboarding (user_id, steps_json, completed_at, updated_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(user_id) DO UPDATE SET
         steps_json = ?2,
         completed_at = COALESCE(user_onboarding.completed_at, ?3),
         updated_at = ?4`
    )
      .bind(userId, JSON.stringify(steps), completedAt, now)
      .run();
  } catch (err) {
    console.error("[onboarding] markStep failed", err);
  }

  return {
    steps,
    completedAt: current.completedAt ?? completedAt,
    dismissedAt: current.dismissedAt,
    hidden: Boolean(current.dismissedAt) || Boolean(current.completedAt ?? completedAt),
  };
}

export async function dismissOnboarding(
  env: OnboardingEnv,
  userId: string
): Promise<OnboardingState> {
  if (!env.DB) return { ...EMPTY, dismissedAt: new Date().toISOString(), hidden: true };
  const now = new Date().toISOString();
  const current = await getOnboarding(env, userId);
  try {
    await env.DB.prepare(
      `INSERT INTO user_onboarding (user_id, steps_json, dismissed_at, updated_at)
       VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(user_id) DO UPDATE SET dismissed_at = ?3, updated_at = ?4`
    )
      .bind(userId, JSON.stringify(current.steps), now, now)
      .run();
  } catch (err) {
    console.error("[onboarding] dismiss failed", err);
  }
  return { ...current, dismissedAt: now, hidden: true };
}
