import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuid } from "uuid";
import type {
  AppState,
  Goal,
  Settings,
  Task,
  TaskAnalysis,
  TimeBudget,
} from "../types";
import { analyzeHeuristic, extractDeadline } from "./ai/heuristic";
import { getProvider } from "./ai";
import { buildSample } from "./sample";

const STORAGE_KEY = "focal.state.v1";

/* ---------------- state ---------------- */

const defaultSettings: Settings = {
  aiKey: "",
  aiModel: "llama-3.3-70b-versatile",
  notificationsEnabled: false,
  seeded: false,
};

const emptyState: AppState = {
  goals: [],
  tasks: [],
  budget: "any",
  settings: { ...defaultSettings },
};

function hydrate(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return {
        ...emptyState,
        ...parsed,
        settings: { ...defaultSettings, ...parsed.settings },
      };
    }
  } catch {
    /* corrupted storage → fresh start */
  }
  // First run: seed the story so the product explains itself in 2 seconds.
  const sample = buildSample();
  return {
    ...emptyState,
    goals: sample.goals,
    tasks: sample.tasks,
    settings: { ...defaultSettings, seeded: true },
  };
}

/* ---------------- actions ---------------- */

type Action =
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

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
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

/* ---------------- toasts ---------------- */

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: "ok" | "info" | "warn";
}

/* ---------------- context ---------------- */

interface StoreValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  /** create + analyze a task from raw capture input */
  captureTask: (
    title: string,
    opts?: { deadline?: number | null; estMinutes?: number | null; notes?: string }
  ) => Task;
}

const StoreCtx = createContext<StoreValue | null>(null);

let toastSeq = 1;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, hydrate);
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* persist */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full / private mode — app still works in memory */
    }
  }, [state]);

  const dismissToast = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = toastSeq++;
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast]
  );

  /* sync heuristic capture (instant) */
  const captureTask = useCallback<StoreValue["captureTask"]>(
    (title, opts) => {
      const now = Date.now();
      const parsed = extractDeadline(title, now);
      const deadline = opts?.deadline ?? parsed.deadline;
      const estMinutes =
        opts?.estMinutes != null ? opts.estMinutes : null; // engine estimates when null
      const analysis = analyzeHeuristic(
        { title, notes: opts?.notes, deadline, estMinutes },
        stateRef.current.goals,
        now
      );
      const task: Task = {
        id: uuid(),
        title: title.trim(),
        notes: opts?.notes,
        createdAt: now,
        deadline,
        deadlineAuto: parsed.auto && opts?.deadline == null,
        estMinutes: analysis.estimatedMinutes,
        status: "active",
        blocked: false,
        postponeCount: 0,
        decayCount: 0,
        timeStarved: false,
        analysis,
      };
      dispatch({ type: "ADD_TASK", task });
      return task;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* keep a ref so stable callbacks read fresh state */
  const stateRef = useRef(state);
  stateRef.current = state;

  /* async AI refinement: when a key is configured, upgrade fresh tasks'
     analysis to LLM scores; hard constraints stay in the engine. */
  const inflight = useRef(new Set<string>());
  const failed = useRef(new Set<string>());
  const lastKey = useRef(state.settings.aiKey);

  useEffect(() => {
    const key = state.settings.aiKey.trim();
    if (key !== lastKey.current) {
      lastKey.current = key;
      failed.current.clear(); // new key → give every task another chance
    }
    if (!key) return;
    const provider = getProvider(state.settings);
    const candidates = state.tasks.filter(
      (t) =>
        t.status === "active" &&
        t.analysis.source !== "ai" &&
        !inflight.current.has(t.id) &&
        !failed.current.has(t.id)
    );
    if (candidates.length === 0) return;
    candidates.slice(0, 2).forEach((t) => {
      inflight.current.add(t.id);
      provider
        .analyzeTask(
          { title: t.title, notes: t.notes, deadline: t.deadline, estMinutes: t.estMinutes },
          stateRef.current.goals
        )
        .then((analysis) => {
          if (analysis.source === "ai") {
            dispatch({ type: "UPDATE_ANALYSIS", taskId: t.id, analysis });
          } else {
            failed.current.add(t.id);
          }
        })
        .catch(() => failed.current.add(t.id))
        .finally(() => inflight.current.delete(t.id));
    });
  }, [state.tasks, state.settings]);

  const value = useMemo<StoreValue>(
    () => ({ state, dispatch, toasts, pushToast, dismissToast, captureTask }),
    [state, toasts, pushToast, dismissToast, captureTask]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

/* small shared helpers */
export function makeGoal(title: string, over: Partial<Goal> = {}): Goal {
  return {
    id: uuid(),
    title: title.trim(),
    description: "",
    targetDate: null,
    active: true,
    isPrimary: false,
    createdAt: Date.now(),
    ...over,
  };
}
