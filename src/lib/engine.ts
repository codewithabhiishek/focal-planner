import { formatDistanceToNowStrict } from "date-fns";
import type { Category, Goal, Task, TimeBudget } from "../types";

/* ------------------------------------------------------------------ */
/* The deterministic 2-Layer Scoring Engine.                           */
/*                                                                     */
/* Layer A: STRATEGIC VALUE (Intrinsic, Max 55 pts)                   */
/*   • goalContribution   (goal relevance × primary boost)   max 35   */
/*   • impactContribution (estimated payoff/leverage)         max 20   */
/*                                                                     */
/* Layer B: EXECUTION CONTEXT (Dynamic, Max 45 pts)                   */
/*   • urgencyContribution  (deadline proximity)             max 30   */
/*   • timeFitContribution  (fit with active time budget)    max 15   */
/*   • unprocessedBoost     (temporary raw capture grace)    max  5   */
/*   • energyContext        (neutral stub for future stage)  max  0   */
/*                                                                     */
/* Final Priority (0–100 normalized):                                  */
/*   priority = clamp(strategicValue + executionScore − postpone, 0, 100) */
/*                                                                     */
/* Blocked tasks are non-executable candidates — filtered out of      */
/* the #1 focus pool rather than being penalized with magic numbers.  */
/* ------------------------------------------------------------------ */

export const WEIGHTS = {
  /** Max points for alignment with active goals (Layer A) */
  strategicGoal: 35,
  /** Max points for estimated leverage/payoff (Layer A) */
  strategicImpact: 20,
  /** Max points for imminent/overdue hard deadlines (Layer B) */
  urgency: 30,
  /** Max points for fitting the user's selected time budget (Layer B) */
  timeFit: 15,
  /** Temporary grace boost for freshly added unclassified tasks (Layer B) */
  unprocessedBoost: 5,
  /** Temporary postpone penalty per postponement (capped at 21) */
  postponePenalty: 7,
  maxPostponePenalty: 21,
} as const;

export interface ScoreParts {
  /** Intrinsic Goal contribution (0..35) */
  goal: number;
  /** Intrinsic Impact contribution (0..20) */
  impact: number;
  /** Deadline urgency contribution (0..30) */
  urgency: number;
  /** Time budget window fit (0..15) */
  time: number;
  /** Temporary unclassified boost (0..5) */
  unprocessed: number;
  /** Temporary postponement penalty (-21..0) */
  postpone: number;
}

export interface Ranked {
  task: Task;
  score: number;
  strategicValue: number;
  executionScore: number;
  frictionScore: number;
  parts: ScoreParts;
  /** final decision bucket shown on badges */
  category: Category;
  /** composed explanation for the Next Best Action panel */
  reason: string;
  overdue: boolean;
  fitsWindow: boolean;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function minutesLabel(m: number | null): string {
  if (m == null) return "est. unknown";
  if (m < 60) return `≈${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function deadlinePhrase(deadline: number, now: number): string {
  const diff = deadline - now;
  const abs = Math.abs(diff);
  const human = formatDistanceToNowStrict(deadline, { addSuffix: false });
  return diff <= 0 ? `${human} overdue` : `in ${human}`;
}

/**
 * Phase 3: Blocked and snoozed tasks are NOT score candidates for the Focus Card.
 * Returns only tasks currently executable.
 */
export function getExecutableTasks(tasks: Task[], now = Date.now()): Task[] {
  return tasks.filter(
    (t) =>
      t.status === "active" &&
      !t.blocked &&
      !(t.snoozedUntil && t.snoozedUntil > now)
  );
}

function urgencyOf(
  task: Task,
  now: number
): { u: number; overdue: boolean; label: string | null } {
  if (task.deadline == null) {
    // language-based urgency ("asap", "urgent") gets a small signal
    return { u: task.analysis.urgencyHint * 9, overdue: false, label: null };
  }
  const left = task.deadline - now;
  const label = deadlinePhrase(task.deadline, now);
  if (left <= 0) return { u: WEIGHTS.urgency, overdue: true, label };
  const h = left / 3.6e6;
  const u = h < 2 ? 27 : h < 12 ? 22 : h < 24 ? 18 : h < 48 ? 13 : h < 168 ? 8 : 3;
  return { u: u + task.analysis.urgencyHint * 2, overdue: false, label };
}

/**
 * Phase 7: Non-destructive Time Budgeting.
 * When a task does not fit the active time budget, it is not penalized with
 * a destructive negative score; it simply receives 0 time bonus and fitsWindow: false.
 */
function timeFitOf(task: Task, budget: TimeBudget): { t: number; fits: boolean } {
  if (budget === "any") return { t: 10, fits: true };
  const est = task.estMinutes;
  if (est == null) return { t: 8, fits: true };
  if (est <= budget) {
    // reward a good fill of the window
    return { t: est >= budget * 0.3 ? WEIGHTS.timeFit : 10, fits: true };
  }
  return { t: 0, fits: false };
}

/**
 * Phase 6: Reduce Recency Bias.
 * Replaces exponential age decay with a small temporary boost (+5) that ONLY
 * applies before classification/analysis is complete. Once classified, boost is 0.
 */
function unprocessedBoostOf(task: Task, now: number): number {
  if (task.analysis.source === "heuristic" && (!task.analysis.analyzedAt || now - task.analysis.analyzedAt < 3000)) {
    const ageSeconds = (now - task.createdAt) / 1000;
    return ageSeconds < 15 ? WEIGHTS.unprocessedBoost : 0;
  }
  return 0;
}

export function scoreTask(
  task: Task,
  goals: Goal[],
  budget: TimeBudget,
  now = Date.now()
): Ranked {
  const a = task.analysis;
  const goal = a.goalId ? goals.find((g) => g.id === a.goalId) : null;
  // Case 9: Graceful fallback when no goals exist in the system
  const primaryBoost = goal ? (goal.isPrimary ? 1 : 0.85) : 0;

  /* ---------------- Layer A: Strategic Value (Max 55) ---------------- */
  const goalScore = (a.goalRelevance || 0) * primaryBoost * WEIGHTS.strategicGoal;
  const impactScore = (a.impact || 0) * WEIGHTS.strategicImpact;
  const strategicValue = Math.round(goalScore + impactScore);

  /* ---------------- Layer B: Execution Context (Max 45) ---------------- */
  const urgency = urgencyOf(task, now);
  const time = timeFitOf(task, budget);
  const unprocessed = unprocessedBoostOf(task, now);
  const executionScore = Math.round(urgency.u + time.t + unprocessed);

  /* ---------------- Penalties & Friction ---------------- */
  const postponePenalty = -Math.min(
    (task.postponeCount || 0) * WEIGHTS.postponePenalty,
    WEIGHTS.maxPostponePenalty
  );
  const frictionScore = (task.postponeCount || 0) * WEIGHTS.postponePenalty;

  const parts: ScoreParts = {
    goal: goalScore,
    impact: impactScore,
    urgency: urgency.u,
    time: time.t,
    unprocessed,
    postpone: postponePenalty,
  };

  const raw = strategicValue + executionScore + postponePenalty;
  const score = Math.round(clamp(raw, 0, 100));

  let category: Category;
  if (task.status === "delegated") category = "DELEGATE";
  else if (task.status === "dropped") category = "DROP";
  else if (score >= 65) category = "DO_NOW";
  else if (score >= 45) category = "SOON";
  else category = "LATER";

  return {
    task,
    score,
    strategicValue,
    executionScore,
    frictionScore,
    parts,
    category,
    reason: "", // filled by buildReason
    overdue: urgency.overdue,
    fitsWindow: time.fits,
  };
}

/** Compose the human explanation from the largest contributing factors. */
export function buildReason(r: Ranked, goals: Goal[], budget: TimeBudget): string {
  const frags: string[] = [];
  const goal = r.task.analysis.goalId
    ? goals.find((g) => g.id === r.task.analysis.goalId)
    : null;

  if (r.overdue) frags.push(`It's overdue — it was due ${deadlinePhrase(r.task.deadline!, Date.now()).replace(" overdue", "")} ago`);
  else if (r.parts.urgency >= 18 && r.task.deadline)
    frags.push(`it's time-sensitive (due ${deadlinePhrase(r.task.deadline, Date.now())})`);

  if (r.parts.goal >= 22 && goal)
    frags.push(
      goal.isPrimary
        ? `it directly supports your primary goal “${goal.title}”`
        : `it supports “${goal.title}”`
    );
  else if (r.parts.goal >= 14 && goal) frags.push(`it contributes to “${goal.title}”`);

  if (r.parts.impact >= 14) frags.push("the payoff is high relative to the effort");
  if (budget !== "any" && r.parts.time >= 10 && r.fitsWindow)
    frags.push(`it realistically fits the ${budget === 60 ? "1-hour" : `${budget}-minute`} window you have`);
  if (r.task.blocked) frags.push("it's currently blocked — resolve the blocker to make it executable");

  const head =
    frags.length > 0
      ? frags.slice(0, 3).join(", and ").replace(/^it's/, "It's").replace(/^it /, "It ")
      : "It's the strongest mix of strategic value, impact, and timing in your queue right now";

  const sentence = head.endsWith(".") ? head : `${head}.`;
  return `${sentence} ${r.task.analysis.reason}`;
}

/** Rank every active task; the queue the whole UI reads from. */
export function rankTasks(
  tasks: Task[],
  goals: Goal[],
  budget: TimeBudget,
  now = Date.now()
): Ranked[] {
  return tasks
    .filter((t) => t.status === "active")
    .map((t) => {
      const r = scoreTask(t, goals, budget, now);
      return { ...r, reason: buildReason(r, goals, budget) };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ad = a.task.deadline ?? Infinity;
      const bd = b.task.deadline ?? Infinity;
      if (ad !== bd) return ad - bd;
      return a.task.createdAt - b.task.createdAt;
    });
}

/**
 * Phase 3 & 7: Focus Card Candidate Selection.
 * Selects the #1 executable task that fits the active time window.
 * Returns null if all high-priority tasks are blocked (triggering unblock state).
 */
export function pickNext(ranked: Ranked[], budget: TimeBudget = "any"): Ranked | null {
  const executable = ranked.filter(
    (r) => !r.task.blocked && !(r.task.snoozedUntil && r.task.snoozedUntil > Date.now())
  );
  if (executable.length === 0) return null;

  if (budget !== "any") {
    const fitting = executable.find((r) => r.fitsWindow);
    if (fitting) return fitting;
  }

  return executable[0] ?? null;
}

/* ---- decision metadata shared by UI ---- */

export const CATEGORY_META: Record<
  Category,
  { label: string; dot: string; text: string; soft: string; ring: string; glyph: string }
> = {
  DO_NOW: {
    label: "Do now",
    dot: "bg-primary",
    text: "text-primary",
    soft: "bg-primary/10 border-primary/30",
    ring: "border-primary/40",
    glyph: "M12 3c3 4.5 7 7.6 7 11.5A7 7 0 0 1 5 14.5C5 10.6 9 7.5 12 3Z",
  },
  SOON: {
    label: "Do soon",
    dot: "bg-info",
    text: "text-info",
    soft: "bg-info/10 border-info/30",
    ring: "border-info/40",
    glyph: "M12 4v4l3 3M12 3a9 9 0 1 0 9 9",
  },
  LATER: {
    label: "Later",
    dot: "bg-later",
    text: "text-later",
    soft: "bg-later/10 border-later/30",
    ring: "border-later/40",
    glyph: "M4 7h16M4 12h16M4 17h10",
  },
  DELEGATE: {
    label: "Delegate",
    dot: "bg-delegate",
    text: "text-delegate",
    soft: "bg-delegate/10 border-delegate/30",
    ring: "border-delegate/40",
    glyph: "M4 12h13m0 0-4-4m4 4-4 4M20 5v14",
  },
  DROP: {
    label: "Drop",
    dot: "bg-rose",
    text: "text-rose",
    soft: "bg-rose/10 border-rose/30",
    ring: "border-rose/40",
    glyph: "M5 7h14M9 7V5h6v2m-8 0 1 12h8l1-12",
  },
};
