/* ---- Focal domain model ---- */

export type Category = "DO_NOW" | "SOON" | "LATER" | "DELEGATE" | "DROP";

/** Minutes the user has available right now. "any" = no constraint. */
export type TimeBudget = 5 | 15 | 30 | 60 | "any";

export type TaskStatus = "active" | "done" | "dropped" | "delegated";

export type AnalysisSource = "heuristic" | "ai";

export type EnergyLevel = "low" | "medium" | "high";
export type UserEnergyState = "low" | "normal" | "high" | "any";

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
  targetDate?: string | null;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  /** ISO date (yyyy-mm-dd) or null */
  targetDate?: string | null;
  /** epoch ms when goal was started */
  startDate?: number;
  /** 0..1 explicit progress estimate */
  progress?: number;
  /** optional milestones breakdown */
  milestones?: GoalMilestone[];
  active: boolean;
  isPrimary: boolean;
  createdAt: number;
}

/**
 * Structured analysis of a task — produced by either the deterministic
 * heuristic engine or an LLM provider (Groq). Same shape either way.
 */
export interface TaskAnalysis {
  /** 0..1 — how strongly this serves the user's goals */
  goalRelevance: number;
  /** 0..1 — relative impact if done well */
  impact: number;
  /** engine's recommended bucket */
  category: Category;
  /** one human sentence, shown in the UI */
  reason: string;
  /** matched goal, if any */
  goalId: string | null;
  estimatedMinutes: number | null;
  /** 0..1 — urgency implied by language ("asap", "urgent"…) */
  urgencyHint: number;
  source: AnalysisSource;
  analyzedAt: number;
}

export interface SubtaskSuggestion {
  title: string;
  minutes: number | null;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  createdAt: number;

  /** epoch ms or null */
  deadline: number | null;
  /** deadline was parsed out of the title ("before 5 pm") */
  deadlineAuto: boolean;

  estMinutes: number | null;

  status: TaskStatus;
  completedAt?: number;
  /** how the task left the queue */
  resolution?: "broken-down" | null;

  blocked: boolean;
  blockNote?: string;

  /** "Not now" counter — drives avoidance detection */
  postponeCount: number;
  lastPostponedAt?: number;
  /** friction score tracking avoidance friction */
  frictionScore?: number;
  /** state of avoidance flow */
  avoidanceState?: "normal" | "friction" | "resolved";
  /** legacy field preserved for migration */
  decayCount?: number;
  /** user said they lack time — prefer larger windows */
  timeStarved: boolean;
  avoidanceShown?: boolean;

  /** epoch ms until which the task is snoozed from execution */
  snoozedUntil?: number;

  /** optional energy requirement: low, medium, high */
  requiredEnergy?: EnergyLevel;

  /** set on subtasks created by the breakdown flow */
  originTitle?: string;

  analysis: TaskAnalysis;
}

/** Visual identity of the whole app — colors, fonts, shadows, background. */


export interface Settings {
  /** Groq / OpenAI-compatible API key — never hardcoded, user-supplied only */
  aiKey: string;
  aiModel: string;
  notificationsEnabled: boolean;
  /** sample data has been seeded once */
  seeded: boolean;
  /** "light" (spearmint) or "dark" (pine) */
  theme: "light" | "dark";
}

export interface AppState {
  goals: Goal[];
  tasks: Task[];
  budget: TimeBudget;
  userEnergy?: UserEnergyState;
  settings: Settings;
}

/* ---- AI provider contract ---- */

export interface AnalyzeInput {
  title: string;
  notes?: string;
  deadline: number | null;
  estMinutes: number | null;
}

export interface AIProvider {
  id: "heuristic" | "groq";
  label: string;
  analyzeTask(input: AnalyzeInput, goals: Goal[]): Promise<TaskAnalysis>;
  breakDown(task: Task, goals: Goal[]): Promise<SubtaskSuggestion[]>;
}
