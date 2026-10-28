import type {
  AppState,
  Goal,
  Settings,
  Task,
  TaskAnalysis,
  TimeBudget,
} from "../types.ts";
import { buildSample } from "./sample.ts";

/* ---------------- multi-user isolation storage keys ---------------- */

export const BASE_STORAGE_KEY = "focal.state.v1";
export const ACTIVE_USER_KEY = "focal.active_user.v1";
export const DEFAULT_USER_ID = "default";

export function sanitizeUserId(userId?: string | null): string {
  if (!userId) return DEFAULT_USER_ID;
  const cleaned = userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return cleaned || DEFAULT_USER_ID;
}

export function getScopedStorageKey(
  baseKey: string = BASE_STORAGE_KEY,
  userId: string = DEFAULT_USER_ID
): string {
  const safeUser = sanitizeUserId(userId);
  return `${baseKey}:${safeUser}`;
}

export function migrateLegacyStateIfNeeded(): void {
  try {
    if (typeof localStorage === "undefined") return;
    const legacy = localStorage.getItem(BASE_STORAGE_KEY);
    const defaultScopedKey = getScopedStorageKey(BASE_STORAGE_KEY, DEFAULT_USER_ID);
    if (legacy && !localStorage.getItem(defaultScopedKey)) {
      localStorage.setItem(defaultScopedKey, legacy);
    }
  } catch {
    /* ignore storage errors */
  }
}

export function getActiveUserId(): string {
  try {
    if (typeof localStorage === "undefined") return DEFAULT_USER_ID;
    return sanitizeUserId(localStorage.getItem(ACTIVE_USER_KEY) || DEFAULT_USER_ID);
  } catch {
    return DEFAULT_USER_ID;
  }
}

/* ---------------- state ---------------- */

export const defaultSettings: Settings = {
  aiKey: "",
  aiModel: "openai/gpt-oss-120b",
  notificationsEnabled: false,
  seeded: false,
  theme: "light",
};

export const emptyState: AppState = {
  goals: [],
  tasks: [],
  budget: "any",
  settings: { ...defaultSettings },
};

export function hydrateForUser(userId: string = DEFAULT_USER_ID): AppState {
  migrateLegacyStateIfNeeded();
  const safeId = sanitizeUserId(userId);
  const key = getScopedStorageKey(BASE_STORAGE_KEY, safeId);
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as AppState;
        return {
          ...emptyState,
          ...parsed,
          settings: { ...defaultSettings, ...parsed.settings },
        };
      }
    }
  } catch {
    /* corrupted storage → fresh start */
  }

  // First run: seed sample so the product explains itself immediately
  const sample = buildSample();
  return {
    ...emptyState,
    goals: sample.goals,
    tasks: sample.tasks,
    settings: { ...defaultSettings, seeded: true },
  };
}

/* ---------------- actions ---------------- */

export type Action =
  | { type: "RESET_STATE"; state: AppState }
  | { type: "ADD_TASK"; task: Task }
  | { type: "PATCH_TASK"; taskId: string; patch: Partial<Task> }
  | { type: "UPDATE_ANALYSIS"; taskId: string; analysis: TaskAnalysis }
  | { type: "COMPLETE_TASK"; taskId: string; at: number }
  | { type: "ADD_GOAL"; goal: Goal }
  | { type: "PATCH_GOAL"; goalId: string; patch: Partial<Goal> }
  | { type: "DELETE_GOAL"; goalId: string }
  | { type: "SET_PRIMARY_GOAL"; goalId: string }
  | { type: "SET_BUDGET"; budget: TimeBudget }
  | { type: "PATCH_SETTINGS"; patch: Partial<Settings> }
  | { type: "ADD_TASKS"; tasks: Task[] }
  | { type: "LOAD_SAMPLE" }
  | { type: "CLEAR_ALL" };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "RESET_STATE":
      return action.state;
    case "ADD_TASK":
      return { ...state, tasks: [action.task, ...state.tasks] };
    case "ADD_TASKS":
      return { ...state, tasks: [...action.tasks, ...state.tasks] };
    case "PATCH_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId ? { ...t, ...action.patch } : t
        ),
      };
    case "UPDATE_ANALYSIS":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId ? { ...t, analysis: action.analysis } : t
        ),
      };
    case "COMPLETE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? { ...t, status: "done", completedAt: action.at, blocked: false }
            : t
        ),
      };
    case "ADD_GOAL":
      return { ...state, goals: [...state.goals, action.goal] };
    case "PATCH_GOAL":
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId ? { ...g, ...action.patch } : g
        ),
      };
    case "DELETE_GOAL":
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.goalId),
        tasks: state.tasks.map((t) =>
          t.analysis.goalId === action.goalId
            ? { ...t, analysis: { ...t.analysis, goalId: null } }
            : t
        ),
      };
    case "SET_PRIMARY_GOAL":
      return {
        ...state,
        goals: state.goals.map((g) => ({ ...g, isPrimary: g.id === action.goalId })),
      };
    case "SET_BUDGET":
      return { ...state, budget: action.budget };
    case "PATCH_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "LOAD_SAMPLE": {
      const sample = buildSample();
      return {
        ...state,
        goals: sample.goals,
        tasks: sample.tasks,
        settings: { ...state.settings, seeded: true },
      };
    }
    case "CLEAR_ALL":
      return { ...emptyState, settings: { ...state.settings, seeded: true } };
    default:
      return state;
  }
}
