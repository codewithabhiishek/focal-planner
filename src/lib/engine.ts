import { formatDistanceToNowStrict } from "date-fns";
import type { Category, Goal, Task, TimeBudget } from "../types";

/* ------------------------------------------------------------------ */
/* The deterministic core.                                             */
/*                                                                     */
/* priority_score =                                                    */
/*     goal_impact        (relevance × primary boost)     max 32       */
/*   + estimated_impact                                 max 20       */
/*   + urgency / deadline proximity                     max 30       */
/*   + available-time fit                               max 12       */
/*   + recency                                          max  6       */
/*   − blocked penalty                                     −70       */
/*   − excessive-postponement penalty                     −7 × n     */
/*                                                                     */
/* AI only supplies goal_impact / impact estimates and language;       */
/* every hard constraint below is plain, inspectable arithmetic.       */
/* ------------------------------------------------------------------ */

export const WEIGHTS = {
  goal: 32,
  impact: 20,
  urgency: 30,
  time: 12,
  recency: 6,
  blockedPenalty: 70,
  postponePenalty: 7,
} as const;

export interface ScoreParts {
  goal: number;
  impact: number;
  urgency: number;
  time: number;
  recency: number;
  blocked: number;
  postpone: number;
}

export interface Ranked {
  task: Task;
  score: number;
  strategicValue: number;
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

function timeFitOf(task: Task, budget: TimeBudget): { t: number; fits: boolean } {
  if (budget === "any") return { t: 8, fits: true };
  const est = task.estMinutes;
  if (est == null) return { t: 4, fits: true };
  if (est <= budget) {
    // reward a good fill of the window, mildly
    return { t: est >= budget * 0.3 ? WEIGHTS.time : 9, fits: true };
  }
  return { t: -45, fits: false };
}

export function scoreTask(
  task: Task,
  goals: Goal[],
  budget: TimeBudget,
  now = Date.now()
): Ranked {
  const a = task.analysis;
  const goal = a.goalId ? goals.find((g) => g.id === a.goalId) : null;
  // Case 9 handling: if no goals or no goalId match, boost is 0
  const primaryBoost = goal ? (goal.isPrimary ? 1 : 0.85) : 0;

  // Intrinsic strategic importance (pure, uncorrupted by avoidance/postpones)
  const goalScore = (a.goalRelevance || 0) * primaryBoost * WEIGHTS.goal;
  const impactScore = (a.impact || 0) * WEIGHTS.impact;
  const strategicValue = Math.round(goalScore + impactScore);

  const urgency = urgencyOf(task, now);
  const time = timeFitOf(task, budget);
  const ageDays = (now - task.createdAt) / 864e5;

  const postponePenalty = -Math.min(task.postponeCount || 0, 3) * WEIGHTS.postponePenalty;
  const frictionScore = (task.postponeCount || 0) * WEIGHTS.postponePenalty;

  const parts: ScoreParts = {
    goal: goalScore,
    impact: impactScore,
    urgency: urgency.u,
    time: time.t,
    recency: 6 * Math.exp(-ageDays / 6),
    blocked: task.blocked ? -WEIGHTS.blockedPenalty : 0,
    postpone: postponePenalty,
  };

  const raw =
    parts.goal + parts.impact + parts.urgency + parts.time + parts.recency +
    parts.blocked + parts.postpone;
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
  if (budget !== "any" && r.parts.time >= 9)
    frags.push(`it realistically fits the ${budget === 60 ? "1-hour" : `${budget}-minute`} window you have`);
  if (r.task.blocked) frags.push("it's currently blocked — resolve the blocker and it returns to the top");

  const head =
    frags.length > 0
      ? frags.slice(0, 3).join(", and ").replace(/^it's/, "It's").replace(/^it /, "It ")
      : "It's the strongest mix of goal fit, impact, and timing in your queue right now";

  const sentence = head.endsWith(".") ? head : `${head}.`;
  return `${sentence} ${r.task.analysis.reason}`;
}

/** Rank every actionable task; the queue the whole UI reads from. */
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

/** The single recommendation: highest-scoring task that isn't blocked. */
export function pickNext(ranked: Ranked[]): Ranked | null {
  return ranked.find((r) => !r.task.blocked) ?? null;
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
