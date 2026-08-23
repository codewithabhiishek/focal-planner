import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import type { Goal, SubtaskSuggestion, Task } from "./types";
import { pickNext, rankTasks } from "./lib/engine";
import { analyzeHeuristic } from "./lib/ai/heuristic";
import { getProvider } from "./lib/ai";
import { notify, registerServiceWorker, shouldNudge } from "./lib/notify";
import { StoreProvider, useStore } from "./lib/store";
import { Header } from "./components/Header";
import { BudgetBar, NextAction, UpNext } from "./components/Focus";
import { Capture } from "./components/Capture";
import { Inbox } from "./components/Inbox";
import { SettingsPage } from "./components/SettingsPage";
import {
  AvoidanceModal,
  BreakdownModal,
  NotNowModal,
  type AvoidReason,
  type NotNowReason,
} from "./components/Modals";
import { Toasts } from "./components/ui";
import { IconPostpone, IconPlus, IconStarFilled } from "./components/icons";

const CONFETTI_LIGHT = ["#0BA36B", "#FF4B3A", "#2E4CFF", "#9C6BFF", "#0FA3BF", "#F7FBF8"];
const CONFETTI_DARK = ["#2FD18A", "#FF6B5A", "#7D95FF", "#B79CFF", "#45C6DC", "#FFC65C"];

/* ---------------- tiny hash router ---------------- */

type Route = "home" | "setup";
function parseRoute(): Route {
  return window.location.hash.startsWith("#/setup") ? "setup" : "home";
}

type ModalState = { type: "notNow" | "avoidance" | "breakdown"; task: Task } | null;

/* ---------------- goal strip (compact, one line) ---------------- */

function GoalStrip({
  goals,
  onPrimary,
  onManage,
}: {
  goals: Goal[];
  onPrimary: (id: string) => void;
  onManage: () => void;
}) {
  const active = goals.filter((g) => g.active);
  return (
    <div className="anim-rise flex flex-wrap items-center gap-1.5" style={{ animationDelay: "30ms" }}>
      <span className="label-mono mr-1 text-ink/45">aiming at</span>
      {active.length === 0 && (
        <button
          onClick={onManage}
          className="chip cursor-pointer border-dashed border-ink/35 bg-paper/60 text-ink/55 transition-colors hover:border-ink hover:text-ink"
        >
          no goal yet — set one <span aria-hidden>→</span>
        </button>
      )}
      {active.map((g) => (
        <button
          key={g.id}
          onClick={() => {
            if (!g.isPrimary) onPrimary(g.id);
          }}
          title={g.isPrimary ? "Primary goal" : "Make primary"}
          className={`inline-flex max-w-[16rem] cursor-pointer items-center gap-1.5 truncate rounded-full border-2 px-2.5 py-1 text-xs font-bold transition-all duration-150 ${
            g.isPrimary
              ? "-rotate-1 border-ink bg-ink text-canvas shadow-[2px_2px_0_rgba(23,37,30,0.3)]"
              : "border-ink/25 bg-paper text-ink/65 hover:-translate-y-0.5 hover:border-ink hover:text-ink"
          }`}
        >
          {g.isPrimary && <IconStarFilled size={11} className="shrink-0 text-canvas" />}
          <span className="truncate">{g.title}</span>
        </button>
      ))}
      <button
        onClick={onManage}
        aria-label="Add a goal"
        title="Add / manage goals"
        className="grid h-6 w-6 cursor-pointer place-items-center rounded-full border-2 border-ink/25 bg-paper text-ink/50 transition-all hover:-translate-y-0.5 hover:border-ink hover:text-ink"
      >
        <IconPlus size={12} />
      </button>
    </div>
  );
}

function Shell() {
  const { state, dispatch, toasts, dismissToast, pushToast } = useStore();
  const [route, setRoute] = useState<Route>(parseRoute);
  const [modal, setModal] = useState<ModalState>(null);
  const [breakdown, setBreakdown] = useState<{
    suggestions: SubtaskSuggestion[];
    busy: boolean;
    selected: Set<number>;
  }>({ suggestions: [], busy: false, selected: new Set() });
  const [, setTick] = useState(0);

  /* ---------- routing ---------- */
  useEffect(() => {
    const onHash = () => {
      setRoute(parseRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((r: Route) => {
    const target = r === "setup" ? "#/setup" : "#/";
    if (window.location.hash === target) {
      setRoute(r);
      window.scrollTo({ top: 0 });
    } else {
      window.location.hash = target;
    }
  }, []);

  useEffect(() => {
    document.title =
      route === "setup" ? "Focal — Setup" : "Focal — What should I do next?";
  }, [route]);

  /* ---------- ranking ---------- */
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

  /* ---------- appearance: light spearmint / dark pine ---------- */
  const theme = state.settings.theme === "dark" ? "dark" : "light";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0F1A14" : "#D9F0E3");
  }, [theme]);

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
        "Stuck on something? ",
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
        colors: theme === "dark" ? CONFETTI_DARK : CONFETTI_LIGHT,
        scalar: 0.9,
        disableForReducedMotion: true,
      });
      pushToast({
        title: "Done. Queue re-ranked.",
        body: t ? `Next best action is already waiting — “${t.title}” is off your plate.` : undefined,
        tone: "ok",
      });
    },
    [dispatch, pushToast, state.tasks, theme]
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
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || modal || route === "setup") return;
      if (e.key === "/") {
        e.preventDefault();
        (document.querySelector('input[aria-label="New task"]') as HTMLInputElement | null)?.focus();
      }
      if (e.key.toLowerCase() === "c" && next && !next.task.blocked) {
        completeTask(next.task.id);
      }
      if (e.key.toLowerCase() === "g") {
        navigate("setup");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, route, next, completeTask, navigate]);

  return (
    <div className="min-h-dvh">
      {/* ---------- ambient layer: dots + one soft glow, nothing else ---------- */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="bg-dots absolute inset-0 opacity-60" />
        <div
          className="absolute -top-40 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(closest-side, var(--ambient-glow), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10">
        <Header onSettings={() => navigate("setup")} />

        {route === "setup" ? (
          <SettingsPage onBack={() => navigate("home")} />
        ) : (
          <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
            <GoalStrip
              goals={state.goals}
              onPrimary={(id) => dispatch({ type: "SET_PRIMARY_GOAL", goalId: id })}
              onManage={() => navigate("setup")}
            />

            <div className="mt-4">
              <Capture />
            </div>

            <div className="mt-5">
              <BudgetBar
                budget={state.budget}
                onChange={(b) => dispatch({ type: "SET_BUDGET", budget: b })}
              />
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
                onAddGoal={() => navigate("setup")}
              />
            </div>

            <UpNext
              items={upNext}
              onComplete={completeTask}
              onNotNow={(id) => {
                const t = state.tasks.find((x) => x.id === id);
                if (t) setModal({ type: "notNow", task: t });
              }}
            />

            <Inbox
              ranked={ranked}
              onComplete={completeTask}
              onNotNow={(id) => {
                const t = state.tasks.find((x) => x.id === id);
                if (t) setModal({ type: "notNow", task: t });
              }}
            />

            <footer className="mt-12 pb-8 text-center">
              <p className="label-mono text-ink/40">focal — dump tasks, we point at the one thing</p>
              <p className="mt-1 font-mono text-[10px] text-ink/30">
                shortcuts: <kbd className="rounded border border-ink/30 bg-paper px-1">/</kbd> capture ·{" "}
                <kbd className="rounded border border-ink/30 bg-paper px-1">c</kbd> complete #1 ·{" "}
                <kbd className="rounded border border-ink/30 bg-paper px-1">g</kbd> setup
              </p>
              <button
                onClick={() => navigate("setup")}
                className="label-mono mt-3 cursor-pointer text-ink/50 underline decoration-2 decoration-canvas underline-offset-4 transition-colors hover:text-ink"
              >
                goals · AI key · signals · data →
              </button>
            </footer>
          </main>
        )}
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
