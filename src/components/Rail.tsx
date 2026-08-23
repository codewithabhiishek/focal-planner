import { AnimatePresence, motion } from "framer-motion";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { useState, type FormEvent } from "react";
import type { Category, Goal } from "../types";
import { CATEGORY_META, type Ranked } from "../lib/engine";
import { makeGoal, useStore } from "../lib/store";
import { Switch } from "./ui";
import {
  IconPause,
  IconPlay,
  IconPlus,
  IconSpark,
  IconStar,
  IconStarFilled,
  IconTarget,
  IconTrash,
} from "./icons";

function targetChip(g: Goal): { label: string; tone: string } | null {
  if (!g.targetDate) return null;
  try {
    const d = parseISO(g.targetDate);
    const days = differenceInCalendarDays(d, new Date());
    if (days < 0) return { label: `${Math.abs(days)}d past`, tone: "text-ember" };
    if (days === 0) return { label: "today", tone: "text-ember" };
    return {
      label: days <= 7 ? `${days}d left` : format(d, "MMM d"),
      tone: days <= 7 ? "text-honey" : "text-ink-faint",
    };
  } catch {
    return null;
  }
}

export function GoalsCard({ onManage }: { onManage: () => void }) {
  const { state, dispatch, pushToast } = useStore();
  const [title, setTitle] = useState("");

  const addGoal = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const first = state.goals.filter((g) => g.active).length === 0;
    dispatch({ type: "ADD_GOAL", goal: makeGoal(t, { isPrimary: first || state.goals.length === 0 }) });
    pushToast({
      title: first ? "Primary goal set" : "Goal added",
      body: `The engine now weighs every task against “${t}”.`,
      tone: "ok",
    });
    setTitle("");
  };

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          <IconTarget size={14} /> Goals
        </h2>
        <button
          onClick={onManage}
          className="font-mono text-[10px] uppercase tracking-wider text-ink-faint transition-colors hover:text-pine"
        >
          manage
        </button>
      </div>

      {state.goals.length === 0 && (
        <p className="px-4 py-5 text-[13px] leading-relaxed text-ink-soft">
          No goals yet. Focal can still rank by deadlines, but a goal is what turns a task
          into <em>progress</em>.
        </p>
      )}

      <ul>
        {state.goals.map((g) => {
          const chip = targetChip(g);
          return (
            <li
              key={g.id}
              className={`group flex items-center gap-2.5 border-t border-line px-4 py-2.5 first:border-t-0 ${
                g.active ? "" : "opacity-55"
              }`}
            >
              <button
                title={g.isPrimary ? "Primary goal" : "Make primary"}
                onClick={() => {
                  dispatch({ type: "SET_PRIMARY_GOAL", goalId: g.id });
                  pushToast({
                    title: "Primary goal changed",
                    body: `“${g.title}” now gets the heaviest weight.`,
                    tone: "info",
                  });
                }}
                className={`shrink-0 transition-all hover:scale-110 ${
                  g.isPrimary ? "text-honey" : "text-line-strong hover:text-honey"
                }`}
              >
                {g.isPrimary ? <IconStarFilled size={17} /> : <IconStar size={17} />}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-[13px] font-semibold ${
                    g.active ? "text-ink" : "text-ink-soft line-through"
                  }`}
                >
                  {g.title}
                  {g.isPrimary && (
                    <span className="ml-2 font-mono text-[9px] font-medium uppercase tracking-wider text-honey">
                      primary
                    </span>
                  )}
                </p>
                {g.description && (
                  <p className="truncate text-[11px] text-ink-faint">{g.description}</p>
                )}
              </div>
              {chip && <span className={`font-mono text-[10px] ${chip.tone}`}>{chip.label}</span>}
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  title={g.active ? "Pause goal" : "Resume goal"}
                  onClick={() =>
                    dispatch({ type: "PATCH_GOAL", goalId: g.id, patch: { active: !g.active } })
                  }
                  className="grid h-6 w-6 place-items-center rounded text-ink-faint hover:bg-well hover:text-ink"
                >
                  {g.active ? <IconPause size={12} /> : <IconPlay size={12} />}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={addGoal} className="flex items-center gap-2 border-t border-line px-4 py-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a goal…"
          aria-label="Add a goal"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-night text-fog transition-all enabled:hover:bg-night-3 enabled:active:scale-95 disabled:opacity-30"
          aria-label="Add goal"
        >
          <IconPlus size={14} />
        </button>
      </form>
    </section>
  );
}

export function SignalCard({ ranked }: { ranked: Ranked[] }) {
  const { state } = useStore();
  const buckets: Category[] = ["DO_NOW", "SOON", "LATER"];
  const max = Math.max(1, ...buckets.map((b) => ranked.filter((r) => r.category === b).length));

  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          <IconSpark size={14} /> Engine
        </h2>
      </div>
      <div className="space-y-2.5 px-4 py-4">
        {buckets.map((b) => {
          const n = ranked.filter((r) => r.category === b).length;
          const meta = CATEGORY_META[b];
          return (
            <div key={b} className="grid grid-cols-[64px_1fr_18px] items-center gap-2">
              <span className={`font-mono text-[10px] uppercase tracking-wider ${meta.text}`}>
                {meta.label}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-well">
                <motion.div
                  className={`h-full rounded-full ${meta.dot}`}
                  initial={false}
                  animate={{ width: `${(n / max) * 100}%` }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="text-right font-mono text-[10px] text-ink-soft">{n}</span>
            </div>
          );
        })}
        <div className="grid grid-cols-[64px_1fr_18px] items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-rust">Blocked</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-well">
            <motion.div
              className="h-full rounded-full bg-rust"
              initial={false}
              animate={{
                width: `${(ranked.filter((r) => r.task.blocked).length / max) * 100}%`,
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <span className="text-right font-mono text-[10px] text-ink-soft">
            {ranked.filter((r) => r.task.blocked).length}
          </span>
        </div>
      </div>
      <div className="border-t border-line px-4 py-3">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              state.settings.aiKey.trim() ? "bg-pine" : "bg-honey"
            }`}
          />
          {state.settings.aiKey.trim()
            ? `groq · ${state.settings.aiModel}`
            : "heuristic engine · on-device"}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
          {state.settings.aiKey.trim()
            ? "LLM reads meaning and goal fit; deadlines, blocks, and postponements stay hard-coded math."
            : "Add a Groq key in settings for LLM scoring — everything already works without one."}
        </p>
      </div>
    </section>
  );
}

export function AvoidanceBanner({
  task,
  count,
  onOpen,
}: {
  task: string;
  count: number;
  onOpen: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpen}
      className="mt-4 flex w-full items-center gap-3 rounded-xl border border-honey/40 bg-honey/10 px-4 py-3 text-left transition-colors hover:bg-honey/15"
    >
      <IconPause size={16} className="shrink-0 text-honey" />
      <span className="min-w-0 flex-1 text-[13px] leading-snug text-ink">
        <strong>“{task}”</strong> has been postponed{" "}
        <strong>{count} times</strong>. Something's in the way — let's find out what.
      </span>
      <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-honey">
        inspect
      </span>
    </motion.button>
  );
}

export { Switch };
