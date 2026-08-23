import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { TimeBudget } from "../types";
import { useStore } from "../lib/store";
import { enableNotifications, notificationsSupported } from "../lib/notify";
import { Switch } from "./ui";
import { IconBell, IconGear, IconReticle, IconSpark } from "./icons";

const BUDGETS: Array<{ value: TimeBudget; label: string }> = [
  { value: 5, label: "5m" },
  { value: 15, label: "15m" },
  { value: 30, label: "30m" },
  { value: 60, label: "1h+" },
  { value: "any", label: "any" },
];

function BudgetControl() {
  const { state, dispatch } = useStore();
  return (
    <div
      role="radiogroup"
      aria-label="How much time do you have?"
      className="flex items-center gap-0.5 rounded-lg border border-line bg-well p-0.5"
    >
      {BUDGETS.map((b) => {
        const active = state.budget === b.value;
        return (
          <button
            key={String(b.value)}
            role="radio"
            aria-checked={active}
            onClick={() => dispatch({ type: "SET_BUDGET", budget: b.value })}
            className={`relative rounded-md px-2 py-1 font-mono text-[11px] font-medium transition-colors sm:px-2.5 ${
              active ? "text-night" : "text-ink-soft hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId="budget-pill"
                className="absolute inset-0 rounded-md bg-mint shadow-sm"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative z-10">{b.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SettingsPopover({ onClose }: { onClose: () => void }) {
  const { state, dispatch, pushToast } = useStore();
  const [key, setKey] = useState(state.settings.aiKey);
  const [confirmErase, setConfirmErase] = useState(false);
  const [notifState, setNotifState] = useState<
    "idle" | "on" | "denied" | "unsupported"
  >(state.settings.notificationsEnabled ? "on" : "idle");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const saveKey = () => {
    dispatch({ type: "PATCH_SETTINGS", patch: { aiKey: key.trim() } });
    pushToast({
      title: key.trim() ? "Groq connected" : "Back to the built-in engine",
      body: key.trim()
        ? "Open tasks will be re-analyzed with the LLM — hard constraints stay deterministic."
        : "Prioritization runs fully on-device.",
      tone: "info",
    });
    onClose();
  };

  const toggleNotifications = async (want: boolean) => {
    if (!want) {
      dispatch({ type: "PATCH_SETTINGS", patch: { notificationsEnabled: false } });
      setNotifState("idle");
      return;
    }
    const res = await enableNotifications();
    if (res === "granted") {
      dispatch({ type: "PATCH_SETTINGS", patch: { notificationsEnabled: true } });
      setNotifState("on");
      pushToast({
        title: "Notifications on",
        body: "Focal will nudge you about overdue work and repeatedly-avoided tasks.",
        tone: "ok",
      });
    } else {
      setNotifState(res === "denied" ? "denied" : "unsupported");
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.16 }}
      className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-line bg-panel shadow-[0_24px_60px_-18px_rgba(13,27,21,0.3)]"
    >
      <div className="border-b border-line px-4 py-3">
        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          <IconSpark size={12} /> Intelligence
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Optional LLM scoring for meaning, goal fit, and impact. Deadlines, blocks, and
          postponements always stay in the deterministic engine. Key is stored only in this
          browser.
        </p>
        <div className="mt-2.5 flex gap-1.5">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="gsk_… (Groq API key)"
            className="min-w-0 flex-1 rounded-md border border-line bg-well px-2.5 py-1.5 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none"
          />
          <button
            onClick={saveKey}
            className="rounded-md bg-pine px-3 py-1.5 text-xs font-semibold text-mint-soft transition-colors hover:bg-pine-deep"
          >
            Save
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
            Model
          </label>
          <select
            value={state.settings.aiModel}
            onChange={(e) =>
              dispatch({ type: "PATCH_SETTINGS", patch: { aiModel: e.target.value } })
            }
            className="flex-1 rounded-md border border-line bg-well px-2 py-1 font-mono text-[11px] text-ink focus:border-pine focus:outline-none"
          >
            <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
            <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
            <option value="openai/gpt-oss-20b">openai/gpt-oss-20b</option>
          </select>
        </div>
        <p className="mt-2 font-mono text-[10px] text-ink-faint">
          {state.settings.aiKey.trim()
            ? `● connected · ${state.settings.aiModel}`
            : "○ built-in heuristic engine (offline)"}
        </p>
      </div>

      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
              <IconBell size={12} /> Notifications
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              Rule-based nudges: overdue top task, new #1, avoidance patterns. Push-ready via
              the service worker.
            </p>
          </div>
          <Switch
            checked={notifState === "on"}
            onChange={toggleNotifications}
            label="Enable notifications"
          />
        </div>
        {notifState === "denied" && (
          <p className="mt-2 text-[11px] text-rust">
            Blocked in browser settings — allow notifications for this site to enable.
          </p>
        )}
        {notifState === "unsupported" && (
          <p className="mt-2 text-[11px] text-ink-faint">Not supported in this browser.</p>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">Data</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => {
              dispatch({ type: "LOAD_SAMPLE" });
              pushToast({ title: "Sample data loaded", tone: "info" });
              onClose();
            }}
            className="rounded-md border border-line bg-well px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            Load sample
          </button>
          {!confirmErase ? (
            <button
              onClick={() => setConfirmErase(true)}
              className="rounded-md border border-line bg-well px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-rust/40 hover:text-rust"
            >
              Erase everything
            </button>
          ) : (
            <button
              onClick={() => {
                dispatch({ type: "CLEAR_ALL" });
                pushToast({ title: "All data erased", body: "Fresh start.", tone: "warn" });
                setConfirmErase(false);
                onClose();
              }}
              className="rounded-md bg-rust px-3 py-1.5 text-xs font-semibold text-panel transition-colors hover:opacity-90"
            >
              Yes, erase it all
            </button>
          )}
        </div>
        <p className="mt-3 font-mono text-[10px] text-ink-faint">
          Focal v1 · local-first · PWA-ready
        </p>
      </div>
    </motion.div>
  );
}

export function Header({ openGoals }: { openGoals: () => void }) {
  const { state } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openCount = state.tasks.filter((t) => t.status === "active").length;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-night text-mint">
            <IconReticle size={19} />
          </span>
          <div className="leading-none">
            <span className="font-display text-[17px] font-bold tracking-tight text-ink">
              Focal
            </span>
            <span className="mt-0.5 hidden font-mono text-[9px] uppercase tracking-[0.22em] text-ink-faint md:block">
              next best action
            </span>
          </div>
        </div>

        <span className="hidden h-4 w-px bg-line-strong sm:block" />

        <button
          onClick={openGoals}
          className="hidden items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink sm:flex"
        >
          <span className="font-mono text-[11px]">{openCount}</span> open
          <span className="text-line-strong">·</span>
          <span className="font-mono text-[11px]">{state.goals.filter((g) => g.active).length}</span>{" "}
          goals
        </button>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint lg:flex">
            time left
          </div>
          <BudgetControl />
          <div className="relative">
            <button
              aria-label="Settings"
              onClick={() => setSettingsOpen((v) => !v)}
              className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${
                settingsOpen
                  ? "border-pine bg-mint-soft text-pine-deep"
                  : "border-line bg-panel text-ink-soft hover:border-line-strong hover:text-ink"
              }`}
            >
              <IconGear size={16} />
            </button>
            <AnimatePresence>
              {settingsOpen && <SettingsPopover onClose={() => setSettingsOpen(false)} />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
