import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import type { SubtaskSuggestion, Task } from "./types";
import { pickNext, rankTasks } from "./lib/engine";
import { analyzeHeuristic } from "./lib/ai/heuristic";
import { notify, registerServiceWorker, shouldNudge } from "./lib/notify";
import { StoreProvider, useStore } from "./lib/store";
import { Header } from "./components/Header";
import { NextAction, UpNext } from "./components/Focus";
import { Capture } from "./components/Capture";
import { Inbox } from "./components/Inbox";
import { AvoidanceBanner, GoalsCard, SignalCard } from "./components/Rail";
import {
  AvoidanceModal,
  BreakdownModal,
  GoalsModal,
  NotNowModal,
  type AvoidReason,
  type NotNowReason,
} from "./components/Modals";
import { ToastStack } from "./components/ui";

type ModalState =
  | { type: "notNow"; task: Task }
  | { type: "avoidance"; task: Task }
  | { type: "breakdown"; task: Task; tiny: boolean }
  | { type: "goals" }
  | null;

function Shell() {
  const { state, dispatch, toasts, dismissToast, pushToast } = useStore();
  const [modal, setModal] = useState<ModalState>(null);
  const [, setTick] = useState(0);

  /* re-rank on every relevant change; tick so "due in 3h" stays honest */
  const ranked = useMemo(
    () => rankTasks(state.tasks, state.goals, state.budget),
    [state.tasks, state.goals, state.budget]
  );
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const next = pickNext(ranked);
  const blockedTop = next === null && ranked.length > 0 ? ranked[0] : null;
  const upNext = ranked
    .filter((r) => !r.task.blocked && r.task.id !== next?.task.id)
    .slice(0, 4);

  /* avoidance banner: postponed 3+ times and never inspected */
  const avoided = ranked.find(
    (r) => r.task.postponeCount >= 3 && !r.task.avoidanceShown && !r.task.blocked
  );

  /* ---------- service worker (PWA + future push) ---------- */
  useEffect(() => {
    registerServiceWorker();
  }, []);

  /* ---------- "/" focuses capture ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
        e.preventDefault();
        document.getElementById("capture-input")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- rule-based nudges (no AI, real notifications) ---------- */
  const stateRef = useRef(state);
  stateRef.current = state;
  const nextRef = useRef(next);
  nextRef.current = next;
  const prevTopId = useRef<string | null>(next?.task.id ?? null);

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = stateRef.current;
      if (!s.settings.notificationsEnabled) return;
      if (typeof document !== "undefined" && !document.hidden) return;
      const top = nextRef.current;

      if (top && top.overdue && shouldNudge(`overdue:${top.task.id}`, 30 * 60_000)) {
        void notify(
          "Your top task is still open",
          `“${top.task.title}” is overdue — it remains your next best action.`,
          "focal-overdue"
        );
      }
      const avoidedTask = s.tasks.find(
        (t) => t.status === "active" && t.postponeCount >= 3 && !t.avoidanceShown
      );
      if (avoidedTask && shouldNudge(`avoid:${avoidedTask.id}`, 6 * 3.6e6)) {
        void notify(
          "A task keeps getting postponed",
          `“${avoidedTask.title}” — ${avoidedTask.postponeCount} postpones. Consider breaking it down or dropping it.`,
          "focal-avoid"
        );
      }
      if (top && top.task.id !== prevTopId.current) {
        prevTopId.current = top.task.id;
        if (shouldNudge("top-change", 10 * 60_000)) {
          void notify(
            "New top priority",
            `“${top.task.title}” just became your next best action.`,
            "focal-top"
          );
        }
      } else if (top) {
        prevTopId.current = top.task.id;
      }
    }, 40_000);
    return () => window.clearInterval(id);
  }, []);

  /* ---------- actions ---------- */

  const fireConfetti = (el?: HTMLElement) => {
    const opts = {
      particleCount: 42,
      spread: 64,
      startVelocity: 24,
      gravity: 1.1,
      scalar: 0.85,
      ticks: 130,
      colors: ["#57C79A", "#17795A", "#D3941F", "#E9F2EC"],
    };
    if (el) {
      const r = el.getBoundingClientRect();
      confetti({
        ...opts,
        origin: {
          x: (r.left + r.width / 2) / window.innerWidth,
          y: (r.top + r.height / 2) / window.innerHeight,
        },
      });
    } else {
      confetti({ ...opts, origin: { x: 0.5, y: 0.35 } });
    }
  };

  const handleComplete = useCallback(
    (taskId: string, el?: HTMLElement) => {
      const t = stateRef.current.tasks.find((x) => x.id === taskId);
      dispatch({ type: "COMPLETE_TASK", taskId, at: Date.now() });
      fireConfetti(el);
      const remaining = rankTasks(stateRef.current.tasks, stateRef.current.goals, stateRef.current.budget)
        .filter((r) => r.task.id !== taskId && !r.task.blocked);
      pushToast({
        title: t ? `Done — “${t.title}”` : "Done",
        body: remaining[0]
          ? `Queue re-ranked. Next: ${remaining[0].task.title}`
          : "Queue clear. Enjoy the headroom.",
        tone: "ok",
      });
    },
    [dispatch, pushToast]
  );

  const postpone = useCallback(
    (task: Task, patch: Partial<Task> = {}) => {
      const count = task.postponeCount + 1;
      dispatch({
        type: "PATCH_TASK",
        taskId: task.id,
        patch: { ...patch, postponeCount: count, lastPostponedAt: Date.now() },
      });
      return count;
    },
    [dispatch]
  );

  const openAvoidanceFor = useCallback(
    (task: Task) => {
      dispatch({ type: "PATCH_TASK", taskId: task.id, patch: { avoidanceShown: true } });
      setModal({ type: "avoidance", task: { ...task, avoidanceShown: true } });
    },
    [dispatch]
  );

  const handleNotNowRequest = useCallback(
    (taskId: string) => {
      const t = stateRef.current.tasks.find((x) => x.id === taskId);
      if (!t) return;
      if (t.postponeCount >= 3 && !t.avoidanceShown) openAvoidanceFor(t);
      else setModal({ type: "notNow", task: t });
    },
    [openAvoidanceFor]
  );

  const handleNotNowChoose = useCallback(
    (task: Task, reason: NotNowReason) => {
      setModal(null);
      switch (reason) {
        case "later": {
          const count = postpone(task);
          pushToast({
            title: "Postponed",
            body:
              count >= 3
                ? "That's a pattern now — let's look at what's in the way."
                : "It stays in the queue, slightly lower for now.",
            tone: count >= 3 ? "warn" : "info",
          });
          if (count >= 3) openAvoidanceFor(task);
          break;
        }
        case "notImportant": {
          postpone(task, { decayCount: task.decayCount + 1 });
          pushToast({
            title: "Lowered its weight",
            body: "Goal fit and impact were reduced — it'll sink unless deadlines disagree.",
            tone: "info",
          });
          break;
        }
        case "delegate":
          dispatch({ type: "PATCH_TASK", taskId: task.id, patch: { status: "delegated" } });
          pushToast({
            title: "Moved to Delegate",
            body: "Out of your queue. Restore it anytime from the inbox.",
            tone: "ok",
          });
          break;
        case "blocked":
          dispatch({
            type: "PATCH_TASK",
            taskId: task.id,
            patch: { blocked: true, blockNote: "Marked blocked by you" },
          });
          pushToast({
            title: "Marked blocked",
            body: "It won't be recommended until you unblock it.",
            tone: "warn",
          });
          break;
        case "noTime": {
          const count = postpone(task, {
            timeStarved: true,
            estMinutes: task.estMinutes ?? 45,
          });
          pushToast({
            title: "Saved for a bigger window",
            body: "Switch your time budget up top when you have real room for it.",
            tone: "info",
          });
          if (count >= 3) openAvoidanceFor(task);
          break;
        }
      }
    },
    [dispatch, postpone, pushToast, openAvoidanceFor]
  );

  const handleAvoidChoose = useCallback(
    (task: Task, reason: AvoidReason) => {
      if (reason === "tooBig" || reason === "noStart") {
        setModal({ type: "breakdown", task, tiny: reason === "noStart" });
        return;
      }
      setModal(null);
      if (reason === "noTime") {
        dispatch({
          type: "PATCH_TASK",
          taskId: task.id,
          patch: {
            timeStarved: true,
            postponeCount: 1,
            estMinutes: task.estMinutes ? Math.max(15, Math.round(task.estMinutes / 2)) : 30,
          },
        });
        pushToast({
          title: "Reshaped for tight schedules",
          body: "It'll only surface when your time window can hold it.",
          tone: "info",
        });
      } else {
        dispatch({ type: "PATCH_TASK", taskId: task.id, patch: { status: "dropped" } });
        pushToast({
          title: "Dropped — honestly, that's a win",
          body: "Your queue now reflects what actually matters.",
          tone: "warn",
        });
      }
    },
    [dispatch, pushToast]
  );

  const handleBreakdownAdd = useCallback(
    (parent: Task, steps: SubtaskSuggestion[]) => {
      const now = Date.now();
      const goals = stateRef.current.goals;
      const children: Task[] = steps.map((s, i) => {
        const a = analyzeHeuristic(
          { title: s.title, deadline: null, estMinutes: s.minutes },
          goals,
          now
        );
        return {
          id: uuid(),
          title: s.title,
          createdAt: now + i,
          deadline: null,
          deadlineAuto: false,
          estMinutes: s.minutes ?? a.estimatedMinutes,
          status: "active",
          blocked: false,
          postponeCount: 0,
          decayCount: 0,
          timeStarved: false,
          originTitle: parent.title,
          analysis: {
            ...a,
            goalId: parent.analysis.goalId ?? a.goalId,
            goalRelevance: Math.max(a.goalRelevance, parent.analysis.goalRelevance * 0.9),
          },
        };
      });
      dispatch({ type: "ADD_TASKS", tasks: children });
      dispatch({
        type: "PATCH_TASK",
        taskId: parent.id,
        patch: {
          status: "done",
          completedAt: now,
          resolution: "broken-down",
          postponeCount: 0,
        },
      });
      setModal(null);
      fireConfetti();
      pushToast({
        title: `Broke it into ${children.length} startable steps`,
        body: `“${parent.title}” is done as a blocker — the steps are ranked in your queue.`,
        tone: "ok",
      });
    },
    [dispatch, pushToast]
  );

  const handleUnblock = useCallback(
    (taskId: string) => {
      dispatch({
        type: "PATCH_TASK",
        taskId,
        patch: { blocked: false, blockNote: undefined },
      });
      pushToast({
        title: "Unblocked — re-entering the ranking",
        body: "Deadlines waited; it may jump straight to the top.",
        tone: "ok",
      });
    },
    [dispatch, pushToast]
  );

  const hasGoals = state.goals.some((g) => g.active);
  const modalTask = modal && "task" in modal ? modal.task : null;

  return (
    <div className="relative min-h-screen">
      {/* ambient layers */}
      <div aria-hidden className="ambient-wash pointer-events-none fixed inset-0 -z-10" />
      <div aria-hidden className="ambient-dots pointer-events-none fixed inset-0 -z-10" />

      <Header openGoals={() => setModal({ type: "goals" })} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6">
        <AnimatePresence>
          {avoided && (
            <motion.div
              key="avoid-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <AvoidanceBanner
                task={avoided.task.title}
                count={avoided.task.postponeCount}
                onOpen={() => openAvoidanceFor(avoided.task)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          {/* ---- focus column ---- */}
          <div className="min-w-0">
            <NextAction
              next={next}
              blockedTop={blockedTop}
              budget={state.budget}
              goals={state.goals}
              hasGoals={hasGoals}
              onComplete={handleComplete}
              onNotNow={handleNotNowRequest}
              onUnblock={handleUnblock}
              onAddGoal={() => setModal({ type: "goals" })}
            />

            <div className="mt-4">
              <Capture />
              <p className="mt-1.5 hidden px-1 font-mono text-[10px] text-ink-faint sm:block">
                press <kbd className="rounded border border-line bg-panel px-1">/</kbd> to capture
                from anywhere · deadlines like “before 5 pm” are picked up automatically
              </p>
            </div>

            <UpNext items={upNext} onComplete={handleComplete} onNotNow={handleNotNowRequest} />

            <Inbox ranked={ranked} onComplete={handleComplete} onNotNow={handleNotNowRequest} />
          </div>

          {/* ---- rail ---- */}
          <aside className="space-y-4 lg:sticky lg:top-16">
            <GoalsCard onManage={() => setModal({ type: "goals" })} />
            <SignalCard ranked={ranked} />
          </aside>
        </div>
      </main>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <NotNowModal
        task={modalTask}
        open={modal?.type === "notNow"}
        onClose={() => setModal(null)}
        onChoose={handleNotNowChoose}
      />
      <AvoidanceModal
        task={modalTask}
        open={modal?.type === "avoidance"}
        onClose={() => setModal(null)}
        onChoose={handleAvoidChoose}
      />
      <BreakdownModal
        task={modal?.type === "breakdown" ? modal.task : null}
        open={modal?.type === "breakdown"}
        onClose={() => setModal(null)}
        onAdd={handleBreakdownAdd}
        firstStepTiny={modal?.type === "breakdown" ? modal.tiny : false}
      />
      <GoalsModal open={modal?.type === "goals"} onClose={() => setModal(null)} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
