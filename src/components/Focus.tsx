import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { Goal, TimeBudget } from "../types";
import {
  CATEGORY_META,
  WEIGHTS,
  deadlinePhrase,
  minutesLabel,
  type Ranked,
} from "../lib/engine";
import { CategoryBadge, ScoreBar } from "./ui";
import {
  IconBlock,
  IconCheck,
  IconChevron,
  IconClock,
  IconDots,
  IconReticle,
  IconTarget,
  IconTimer,
} from "./icons";

/* ---------------- time budget — always visible, drives the pick ---------------- */

const BUDGETS: Array<{ id: TimeBudget; label: string }> = [
  { id: 5, label: "5m" },
  { id: 15, label: "15m" },
  { id: 30, label: "30m" },
  { id: 60, label: "1h+" },
  { id: "any", label: "any" },
];

export function BudgetBar({
  budget,
  onChange,
}: {
  budget: TimeBudget;
  onChange: (b: TimeBudget) => void;
}) {
  return (
    <div className="anim-rise flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-x-3 sm:gap-y-2">
      <span className="label-mono text-ink-muted">How much time do you have?</span>
      <div className="flex flex-wrap gap-1 sm:gap-1.5">
        {BUDGETS.map((b) => {
          const active = budget === b.id;
          return (
            <button
              key={String(b.id)}
              onClick={() => onChange(b.id)}
              aria-pressed={active}
              className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold transition-all duration-200 sm:px-3.5 sm:py-1 sm:text-xs ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-hard-soft scale-[1.03]"
                  : "border-line bg-surface text-ink-secondary hover:-translate-y-0.5 hover:border-ink/40 hover:text-ink hover:shadow-hard-faint active:scale-95"
              }`}
            >
              {b.label}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {budget !== "any" && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="chip border-primary/30 bg-primary/10 text-primary"
          >
            <IconTimer size={11} /> picks now fit ≤ {budget === 60 ? "60" : budget}m
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Next Best Action ---------------- */

export function NextAction({
  next,
  blockedTop,
  budget,
  goals,
  hasGoals,
  onComplete,
  onNotNow,
  onUnblock,
  onAddGoal,
}: {
  next: Ranked | null;
  blockedTop: Ranked | null;
  budget: TimeBudget;
  goals: Goal[];
  hasGoals: boolean;
  onComplete: (taskId: string, el?: HTMLElement) => void;
  onNotNow: (taskId: string) => void;
  onUnblock: (taskId: string) => void;
  onAddGoal: () => void;
}) {
  const [showWhy, setShowWhy] = useState(false);

  if (!next && !blockedTop) {
    return (
      <section className="anim-rise rounded-[16px] border border-dashed border-line bg-surface/70 px-6 py-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <IconReticle size={24} />
        </span>
        <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink">
          Queue's clear. Nice.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">
          Add whatever tasks are on your mind below — Focal weighs them against your goals and
          deadlines, then points at the one thing worth doing next.
        </p>
        {!hasGoals && (
          <button onClick={onAddGoal} className="btn-primary mt-6 px-5 py-2.5 text-sm">
            <IconTarget size={15} /> Add your first goal
          </button>
        )}
      </section>
    );
  }

  const r = next ?? blockedTop!;
  const task = r.task;
  const meta = CATEGORY_META[r.category];
  const goal = task.analysis.goalId ? goals.find((g) => g.id === task.analysis.goalId) : null;
  const isBlockedView = !next && !!blockedTop;

  return (
    <div>
      <p className="label-mono mb-2 flex items-center gap-2 text-ink-muted">
        <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-primary" />
        {isBlockedView ? "all blocked — everything's parked" : "your next action"}
      </p>
      <AnimatePresence mode="wait">
        <motion.section
          key={task.id + (isBlockedView ? "-blocked" : "")}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="card-hero relative p-3.5 sm:p-5"
        >
          <div className="flex items-center gap-2">
            <CategoryBadge category={r.category} />
            <span
              title="Priority score"
              className={`chip ml-auto ${
                r.score >= 65
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-line bg-surface-2 text-ink-muted"
              }`}
            >
              score {r.score}
            </span>
          </div>

          <h1 className="mt-2 sm:mt-2.5 font-display text-[1.1rem] leading-snug font-extrabold tracking-tight text-balance break-words text-ink sm:text-[1.35rem]">
            {task.title}
          </h1>

          {/* one dense meta line — deadline · estimate · goal · flags */}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 font-mono text-[11px] font-medium text-ink-muted">
            <IconClock size={11} className="shrink-0 text-ink-faint" />
            {task.deadline != null ? (
              <span className={r.overdue ? "font-bold text-coral" : ""}>
                {r.overdue
                  ? `overdue · ${deadlinePhrase(task.deadline, Date.now())}`
                  : `due ${deadlinePhrase(task.deadline, Date.now())}`}
              </span>
            ) : (
              <span>no deadline</span>
            )}
            <span className="text-ink-faint">·</span>
            <span>{minutesLabel(task.estMinutes)}</span>
            {goal && (
              <>
                <span className="text-ink-faint">·</span>
                <span className="inline-flex min-w-0 max-w-[52vw] items-center gap-1 sm:max-w-[300px]">
                  <IconTarget size={11} className="shrink-0 text-primary" />
                  <span className="truncate text-ink-secondary" title={goal.title}>
                    {goal.title}
                  </span>
                </span>
              </>
            )}
            {task.postponeCount > 0 && (
              <>
                <span className="text-ink-faint">·</span>
                <span className="text-honey">postponed ×{task.postponeCount}</span>
              </>
            )}
            {budget !== "any" && !r.fitsWindow && (
              <>
                <span className="text-ink-faint">·</span>
                <span className="font-bold text-coral">bigger than your window</span>
              </>
            )}
          </p>

          <p className="mt-1.5 text-[13px] leading-snug text-ink-secondary line-clamp-2">
            {isBlockedView
              ? `Blocked — "${task.blockNote ?? "waiting on something"}". Unblock it, or grab something else meanwhile.`
              : r.reason}
          </p>

          <div className="mt-2.5 sm:mt-3.5 flex flex-wrap items-center gap-2">
            {isBlockedView ? (
              <button onClick={() => onUnblock(task.id)} className="btn-yellow px-3.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-[13px] font-bold">
                <IconBlock size={14} /> Unblock it
              </button>
            ) : (
              <button
                onClick={(e) => onComplete(task.id, e.currentTarget)}
                className="btn-yellow px-3.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-[13px] font-bold"
              >
                <IconCheck size={14} /> Complete
              </button>
            )}
            <button onClick={() => onNotNow(task.id)} className="btn-outline-dark px-3 py-1.5 text-xs sm:px-3.5 sm:py-2 sm:text-[13px]">
              Not now
            </button>
            <button
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
              className="label-mono ml-auto cursor-pointer text-ink-muted transition-colors hover:text-ink"
            >
              <span className="inline-flex items-center gap-1">
                why this?
                <IconChevron
                  size={12}
                  className={`transition-transform duration-300 ${showWhy ? "rotate-90" : ""}`}
                />
              </span>
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showWhy && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2 rounded-xl border border-line bg-surface-2/60 p-3">
                  <p className="border-b border-line pb-2 text-xs leading-relaxed text-ink-secondary">
                    {isBlockedView
                      ? `Blocked — "${task.blockNote ?? "waiting on something"}". Unblock it, or grab something else meanwhile.`
                      : r.reason}
                  </p>
                  <div className="space-y-1.5 pb-2">
                    {r.structuredScore.explanations.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-ink-secondary">{item.label}</span>
                        <span className={`font-mono font-bold ${item.positive ? "text-primary" : "text-rose"}`}>
                          {item.points > 0 ? `+${item.points}` : item.points}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-line/60 pt-1.5 text-xs font-bold text-ink">
                      <span>Final Priority</span>
                      <span className="font-mono text-sm text-primary">{r.score}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-line/40 pt-2">
                    <ScoreBar label="goal fit" value={r.parts.goal} max={WEIGHTS.strategicGoal} color="bg-primary" />
                    <ScoreBar label="impact" value={r.parts.impact} max={WEIGHTS.strategicImpact} color="bg-info" delay={0.05} />
                    {r.parts.trajectory > 0 && (
                      <ScoreBar label="trajectory pressure" value={r.parts.trajectory} max={WEIGHTS.trajectoryPressure} color="bg-warning" delay={0.08} />
                    )}
                    <ScoreBar label="urgency" value={r.parts.urgency} max={WEIGHTS.urgency} color="bg-warning" delay={0.1} />
                    <ScoreBar label="time fit" value={r.parts.time} max={WEIGHTS.timeFit} color="bg-later" delay={0.15} />
                    {r.parts.energy !== 0 && (
                      <ScoreBar label="energy fit" value={r.parts.energy} max={WEIGHTS.energyFit} negative={r.parts.energy < 0} color="bg-cobalt" delay={0.18} />
                    )}
                    {r.parts.unprocessed > 0 && (
                      <ScoreBar label="new capture" value={r.parts.unprocessed} max={WEIGHTS.unprocessedBoost} color="bg-ink/30" delay={0.2} />
                    )}
                    {r.parts.postpone < 0 && (
                      <ScoreBar label="postponed" value={r.parts.postpone} max={WEIGHTS.maxPostponePenalty} negative delay={0.25} />
                    )}
                  </div>
                  <p className="pt-1 font-mono text-[10px] leading-relaxed text-ink-faint">
                    Deterministic score derived directly from inspectable weights. Single source of truth.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Up Next ---------------- */

export function UpNext({
  items,
  onComplete,
  onNotNow,
}: {
  items: Ranked[];
  onComplete: (taskId: string, el?: HTMLElement) => void;
  onNotNow: (taskId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-4 sm:mt-7">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-base sm:text-lg font-extrabold tracking-tight text-ink">Up next</h2>
        <span className="label-mono text-ink-muted">same score · ranked live</span>
      </div>
      <div className="card mt-2 sm:mt-2.5 overflow-hidden">
        <AnimatePresence initial={false}>
          {items.map((r, i) => (
            <motion.div
              key={r.task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -36 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className={`group flex items-center justify-between gap-3 sm:gap-4 px-3.5 py-2.5 sm:px-5 sm:py-3 ${
                i > 0 ? "border-t border-line" : ""
              } hover:bg-surface-2/40 transition-colors`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line bg-surface-2 font-mono text-[11px] font-bold text-ink-secondary">
                  {i + 2}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-bold tracking-tight text-ink">
                      {r.task.title}
                    </span>
                    <CategoryBadge category={r.category} size="xs" />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-ink-muted">
                    {r.task.deadline != null && (
                      <span className={r.overdue ? "font-bold text-coral" : ""}>
                        {r.overdue ? "overdue" : `due ${deadlinePhrase(r.task.deadline, Date.now())}`}
                      </span>
                    )}
                    {r.task.deadline != null && <span className="text-ink-faint">·</span>}
                    <span>{minutesLabel(r.task.estMinutes)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Score + Action slot */}
              <div className="flex shrink-0 items-center gap-3">
                <span className="chip w-10 justify-center border-line bg-surface-2 font-mono text-[11px] font-bold text-ink-secondary">
                  {r.score}
                </span>
                <div className="flex w-[60px] items-center justify-end gap-1.5 transition-opacity duration-150 max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                  <button
                    aria-label={`Complete ${r.task.title}`}
                    title="Complete"
                    onClick={(e) => onComplete(r.task.id, e.currentTarget)}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-ink-muted transition-all duration-150 hover:scale-110 hover:border-success hover:bg-success/10 hover:text-success active:scale-90"
                  >
                    <IconCheck size={13} />
                  </button>
                  <button
                    aria-label={`Not now: ${r.task.title}`}
                    title="Not now"
                    onClick={() => onNotNow(r.task.id)}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-ink-muted transition-all duration-150 hover:scale-110 hover:border-ink/40 hover:text-ink active:scale-90"
                  >
                    <IconDots size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
