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
  Task,
  TimeBudget,
} from "../types";
import { analyzeHeuristic, extractDeadline } from "./ai/heuristic";
import { getProvider } from "./ai";
import { haptics } from "./haptics";
import {
  BASE_STORAGE_KEY,
  ACTIVE_USER_KEY,
  DEFAULT_USER_ID,
  sanitizeUserId,
  getScopedStorageKey,
  getActiveUserId,
  defaultSettings,
  emptyState,
  hydrateForUser,
  reducer,
  type Action,
} from "./storage";

// Re-export storage constants and functions
export {
  BASE_STORAGE_KEY,
  ACTIVE_USER_KEY,
  DEFAULT_USER_ID,
  sanitizeUserId,
  getScopedStorageKey,
  getActiveUserId,
  defaultSettings,
  emptyState,
  hydrateForUser,
  reducer,
  type Action,
};

/* ---------------- toasts ---------------- */

export interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: "ok" | "info" | "warn";
}

/* ---------------- context ---------------- */

export interface StoreValue {
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
  activeUserId: string;
  switchUser: (userId: string) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

let toastSeq = 1;

export function StoreProvider({
  children,
  initialUserId,
}: {
  children: ReactNode;
  initialUserId?: string;
}) {
  const [activeUserId, setActiveUserId] = useState<string>(() =>
    initialUserId ? sanitizeUserId(initialUserId) : getActiveUserId()
  );

  const [state, dispatch] = useReducer(reducer, activeUserId, hydrateForUser);
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* persist scoped to activeUserId */
  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const key = getScopedStorageKey(BASE_STORAGE_KEY, activeUserId);
        localStorage.setItem(key, JSON.stringify(state));
        localStorage.setItem(ACTIVE_USER_KEY, activeUserId);
      }
    } catch {
      /* storage full / private mode — app still works in memory */
    }
  }, [state, activeUserId]);

  const dismissToast = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = toastSeq++;
      // Haptic feedback triggered on toast notifications
      if (t.tone === "warn") {
        haptics.error();
      } else {
        haptics.tap();
      }
      setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast]
  );

  const switchUser = useCallback((newUserId: string) => {
    const cleanId = sanitizeUserId(newUserId);
    setActiveUserId(cleanId);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(ACTIVE_USER_KEY, cleanId);
      }
    } catch {
      /* ignore */
    }
    const nextState = hydrateForUser(cleanId);
    dispatch({ type: "RESET_STATE", state: nextState });
  }, []);

  /* keep a ref so stable callbacks read fresh state */
  const stateRef = useRef(state);
  stateRef.current = state;

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
    []
  );

  /* async AI refinement */
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
    () => ({
      state,
      dispatch,
      toasts,
      pushToast,
      dismissToast,
      captureTask,
      activeUserId,
      switchUser,
    }),
    [state, toasts, pushToast, dismissToast, captureTask, activeUserId, switchUser]
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
