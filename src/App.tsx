import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { v4 as uuid } from "uuid";
import type { SubtaskSuggestion, Task } from "./types";
import { pickNext, rankTasks } from "./lib/engine";
import { analyzeHeuristic } from "./lib/ai/heuristic";
import { getProvider } from "./lib/ai";
import { notify, registerServiceWorker, shouldNudge } from "./lib/notify";
import { StoreProvider, useStore } from "./lib/store";
import { Header } from "./components/Header";
import { BudgetBar, NextAction, UpNext } from "./components/Focus";
import { Capture } from "./components/Capture";
import { Inbox } from "./components/Inbox";
import { EngineCard, GoalsCard } from "./components/Rail";
import {
  AvoidanceModal,
  BreakdownModal,
  GoalsModal,
  NotNowModal,
  SettingsModal,
  type AvoidReason,
  type NotNowReason,
} from "./components/Modals";
import { Toasts } from "./components/ui";
import { IconArrowDoodle, IconPostpone, IconSquiggle, IconStar4 } from "./components/icons";

type ModalState =
  | { type: "notNow"; task: Task }
  | { type: "avoidance"; task: Task }
  | { type: "breakdown"; task: Task }
  | { type: "goals" }
  | null;

const CONFETTI_COLORS = ["#FFE45E", "#FF4B3A", "#0BBF6F", "#2E4CFF", "#9C6BFF", "#FFFDF6"];

function Shell() {
  const { state, dispatch, toasts, dismissToast, pushToast } = useStore();
  const [modal, setModal] = useState<ModalState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<{
    suggestions: SubtaskSuggestion[];
    busy: boolean;
    selected: Set<number>;
  }>({ suggestions: [], busy: false, selected: new Set() });
  const [, setTick] = useState(0);

  /* re-rank on every relevant change; tick keeps "due in 3h" honest */
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

  /* avoidance: postponed 3+ times and never inspected */
  const avoided = ranked.find(
    (r) => r.task.postponeCount >= 3 && !r.task.avoidanceShown && !r.task.blocked
  );

  /* ---------- PWA service worker + future push ---------- */
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  /* ---------- rule-based nudges (no AI, throttled) ---------- */
  useEffect(() => {
    if (!state.settings.notificationsEnabled) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (next && next.overdue && shouldNudge(`overdue:${next.task.id}`, 4 * 3600_000)) {
      void notify(
        "This one's overdue",
        `“${next.task.title}” is your top task and its deadline passed.`,
        "focal-overdue"
      );
    }
  }, [next, state.settings.notificationsEnabled]);

  const prevTopId = useRef<string | null>(null);
  useEffect(() => {
    const id = next?.task.id ?? null;
    if (
      id &&
      prevTopId.current &&
      id !== prevTopId.current &&
      state.settings.notificationsEnabled &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      shouldNudge("newtop", 3600_000)
    ) {
      void notify("New #1", `“${next!.task.title}” just became your best next action.`, "focal-newtop");
    }
    prevTopId.current = id;
  }, [next, state.settings.notificationsEnabled]);

  useEffect(() => {
    if (
      avoided &&
      state.settings.notificationsEnabled &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted" &&
      shouldNudge(`avoid:${avoided.task.id}`, 24 * 3600_000)
    ) {
      void notify(
        "Stuck on something?",
        `“${avoided.task.title}” got postponed ${avoided.task.postponeCount} times. Break it down or drop it.`,
        "focal-avoid"
      );
    }
  }, [avoided, state.settings.notificationsEnabled]);

  /* ---------- actions ---------- */

  const completeTask = useCallback(
    (taskId: string, el?: HTMLElement) => {
      const t = state.tasks.find((x) => x.id === taskId);
      dispatch({ type: "COMPLETE_TASK", taskId, at: Date.now() });
      const r = el?.getBoundingClientRect();
      confetti({
        particleCount: 90,
        spread: 75,
        origin: r
          ? { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight }
          : { y: 0.35 },
        colors: CONFETTI_COLORS,
        scalar: 0.9,
        disableForReducedMotion: true,
      });
      pushToast({
        title: "Done. Queue re-ranked.",
        body: t ? `Next best action is already waiting — “${t.title}” is off your plate.` : undefined,
        tone: "ok",
      });
    },
    [dispatch, pushToast, state.tasks]
  );

  const handleNotNow = useCallback(
    (reason: NotNowReason) => {
      if (modal?.type !== "notNow") return;
      const t = modal.task;
      setModal(null);
      const patch: Partial<Task> = {};
      let toast: { title: string; body: string; tone: "ok" | "info" | "warn" } = {
        title: "",
        body: "",
        tone: "info",
      };

      switch (reason) {
        case "later":
          patch.postponeCount = t.postponeCount + 1;
          patch.lastPostponedAt = Date.now();
          toast = { title: "Postponed", body: "It sinks a little and will resurface.", tone: "info" };
          break;
        case "unimportant":
          patch.decayCount = t.decayCount + 1;
          patch.postponeCount = t.postponeCount + 1;
          patch.lastPostponedAt = Date.now();
          toast = { title: "Importance lowered", body: "The score decays — it'll sink.", tone: "info" };
          break;
        case "delegate":
          patch.status = "delegated";
          toast = { title: "Moved to Delegate", body: "Out of your queue until you restore it.", tone: "info" };
          break;
        case "blocked":
          patch.blocked = true;
          patch.blockNote = "waiting on something";
          toast = { title: "Marked blocked", body: "Parked — unblock it when you're ready.", tone: "warn" };
          break;
        case "notime":
          patch.timeStarved = true;
          patch.postponeCount = t.postponeCount + 1;
          patch.lastPostponedAt = Date.now();
          toast = { title: "Saved for a bigger window", body: "We'll stop offering it in 5-minute gaps.", tone: "info" };
          break;
      }
      dispatch({ type: "PATCH_TASK", taskId: t.id, patch });
      pushToast(toast);

      if (patch.postponeCount && patch.postponeCount >= 3 && !t.avoidanceShown && reason !== "blocked") {
        window.setTimeout(() => setModal({ type: "avoidance", task: { ...t, ...patch } }), 450);
      }
    },
    [modal, dispatch, pushToast]
  );

  const startBreakdown = useCallback(
    async (parent: Task) => {
      setBreakdown({ suggestions: [], busy: true, selected: new Set() });
      setModal({ type: "breakdown", task: parent });
      const steps = await getProvider(state.settings).breakDown(parent, state.goals);
      setBreakdown({ suggestions: steps, busy: false, selected: new Set(steps.map((_, i) => i)) });
    },
    [state.settings, state.goals]
  );

  const handleAvoid = useCallback(
    (reason: AvoidReason) => {
      if (modal?.type !== "avoidance") return;
      const t = modal.task;
      setModal(null);
      switch (reason) {
        case "big":
        case "how":
          void startBreakdown(t);
          dispatch({ type: "PATCH_TASK", taskId: t.id, patch: { avoidanceShown: true } });
          break;
        case "time":
          dispatch({
            type: "PATCH_TASK",
            taskId: t.id,
            patch: { timeStarved: true, avoidanceShown: true, postponeCount: 0 },
          });
          pushToast({
            title: "Noted — it needs a real time block",
            body: "It'll surface when your window is bigger.",
            tone: "info",
          });
          break;
        case "notimportant":
          dispatch({ type: "PATCH_TASK", taskId: t.id, patch: { status: "dropped", avoidanceShown: true } });
          pushToast({ title: "Dropped", body: "Queue re-ranked without it.", tone: "warn" });
          break;
      }
    },
    [modal, dispatch, pushToast, startBreakdown]
  );

  const addSteps = useCallback(() => {
    if (modal?.type !== "breakdown") return;
    const parent = modal.task;
    const now = Date.now();
    const chosen = breakdown.suggestions.filter((_, i) => breakdown.selected.has(i));
    if (chosen.length === 0) return;
    const subs: Task[] = chosen.map((s, k) => ({
      id: uuid(),
      title: s.title,
      createdAt: now + k,
      deadline: null,
      deadlineAuto: false,
      estMinutes: s.minutes,
      status: "active",
      blocked: false,
      postponeCount: 0,
      decayCount: 0,
      timeStarved: false,
      originTitle: parent.title,
      analysis: analyzeHeuristic({ title: s.title, deadline: null, estMinutes: s.minutes }, state.goals),
    }));
    dispatch({ type: "ADD_TASKS", tasks: subs });
    dispatch({
      type: "PATCH_TASK",
      taskId: parent.id,
      patch: { status: "done", resolution: "broken-down", completedAt: now, avoidanceShown: true },
    });
    setModal(null);
    pushToast({
      title: `${chosen.length} step${chosen.length === 1 ? "" : "s"} in the queue`,
      body: "Smallest first — momentum beats perfection.",
      tone: "ok",
    });
  }, [modal, breakdown, dispatch, pushToast, state.goals]);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || modal || settingsOpen) return;
      if (e.key === "/") {
        e.preventDefault();
        (document.querySelector('input[aria-label="New task"]') as HTMLInputElement | null)?.focus();
      }
      if (e.key.toLowerCase() === "c" && next && !next.task.blocked) {
        completeTask(next.task.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, settingsOpen, next, completeTask]);

  return (
    <div className="min-h-dvh">
      {/* ---------- ambient layer ---------- */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="bg-dots absolute inset-0 opacity-70" />
        <div
          className="absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(255,253,246,0.75), transparent 70%)" }}
        />
        <IconSquiggle size={170} className="anim-floaty absolute top-28 -left-8 hidden rotate-12 text-ink/12 md:block" />
        <IconStar4 size={54} className="anim-floaty-slow absolute top-44 right-[8%] text-coral/40" style={{ "--fr": "12deg" } as CSSProperties} />
        <IconArrowDoodle size={96} className="anim-floaty absolute bottom-24 left-[6%] hidden text-cobalt/30 md:block" />
        <IconStar4 size={34} className="anim-floaty absolute bottom-40 right-[14%] text-mint/50" style={{ animationDelay: "1.2s" }} />
        <span className="anim-floaty-slow absolute top-[62%] left-[3%] h-3 w-3 rounded-full border-2 border-ink bg-canvas" />
        <span className="anim-floaty absolute top-[18%] left-[42%] h-2.5 w-2.5 rounded-full bg-coral/50" style={{ animationDelay: "0.6s" }} />
        <span className="anim-floaty-slow absolute right-[4%] top-[70%] h-4 w-4 rounded-full border-2 border-ink bg-mint/60" />
      </div>

      <div className="relative z-10">
        <Header onOpenSettings={() => setSettingsOpen(true)} />

        <main className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-6 sm:px-6 md:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ---------- focus column ---------- */}
          <div className="min-w-0">
            <Capture />

            <div className="mt-5">
              <BudgetBar budget={state.budget} onChange={(b) => dispatch({ type: "SET_BUDGET", budget: b })} />
            </div>

            <AnimatePresence>
              {avoided && modal?.type !== "avoidance" && (
                <motion.button
                  key="avoidance-banner"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => setModal({ type: "avoidance", task: avoided.task })}
                  className="card mt-5 flex w-full cursor-pointer items-center gap-3 border-coral bg-coral/10 px-4 py-3 text-left shadow-[5px_5px_0_rgba(255,75,58,0.4)] transition-transform hover:-translate-y-0.5"
                >
                  <span className="sticker grid h-9 w-9 shrink-0 place-items-center bg-coral text-paper">
                    <IconPostpone size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="label-mono block text-coral">avoidance loop detected</span>
                    <span className="block truncate text-sm font-bold">
                      “{avoided.task.title}” — postponed ×{avoided.task.postponeCount}. What's stopping you?
                    </span>
                  </span>
                  <span className="chip ml-auto shrink-0 border-coral bg-coral text-paper">let's talk</span>
                </motion.button>
              )}
            </AnimatePresence>

            <div className="mt-5">
              <NextAction
                next={next}
                blockedTop={blockedTop}
                budget={state.budget}
                goals={state.goals}
                hasGoals={state.goals.length > 0}
                onComplete={completeTask}
                onNotNow={(id) => {
                  const t = state.tasks.find((x) => x.id === id);
                  if (t) setModal({ type: "notNow", task: t });
                }}
                onUnblock={(id) => {
                  dispatch({ type: "PATCH_TASK", taskId: id, patch: { blocked: false, blockNote: undefined } });
                  pushToast({ title: "Unblocked — back in ranking", tone: "ok" });
                }}
                onAddGoal={() => setModal({ type: "goals" })}
              />
            </div>

            <UpNext items={upNext} onComplete={completeTask} onNotNow={(id) => {
              const t = state.tasks.find((x) => x.id === id);
              if (t) setModal({ type: "notNow", task: t });
            }} />

            <Inbox ranked={ranked} onComplete={completeTask} onNotNow={(id) => {
              const t = state.tasks.find((x) => x.id === id);
              if (t) setModal({ type: "notNow", task: t });
            }} />

            <footer className="mt-12 pb-8 text-center">
              <p className="label-mono text-ink/40">
                focal — dump tasks, we point at the one thing
              </p>
              <p className="mt-1 font-mono text-[10px] text-ink/30">
                shortcuts: <kbd className="rounded border border-ink/30 bg-paper px-1">/</kbd> capture ·{" "}
                <kbd className="rounded border border-ink/30 bg-paper px-1">c</kbd> complete #1
              </p>
            </footer>
          </div>

          {/* ---------- rail ---------- */}
          <aside className="grid gap-5 lg:sticky lg:top-28">
            <GoalsCard onOpenGoals={() => setModal({ type: "goals" })} />
            <EngineCard onOpenSettings={() => setSettingsOpen(true)} />
          </aside>
        </main>
      </div>

      {/* ---------- modals ---------- */}
      {modal?.type === "notNow" && (
        <NotNowModal task={modal.task} onReason={handleNotNow} onClose={() => setModal(null)} />
      )}
      {modal?.type === "avoidance" && (
        <AvoidanceModal task={modal.task} onReason={handleAvoid} onClose={() => setModal(null)} />
      )}
      {modal?.type === "breakdown" && (
        <BreakdownModal
          task={modal.task}
          suggestions={breakdown.suggestions}
          busy={breakdown.busy}
          selected={breakdown.selected}
          onToggle={(i) =>
            setBreakdown((b) => {
              const s = new Set(b.selected);
              if (s.has(i)) s.delete(i);
              else s.add(i);
              return { ...b, selected: s };
            })
          }
          onRegenerate={() => void startBreakdown(modal.task)}
          onAdd={addSteps}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "goals" && <GoalsModal onClose={() => setModal(null)} />}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <Toasts toasts={toasts} onDismiss={dismissToast} />
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
