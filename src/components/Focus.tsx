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
import { CategoryBadge, Chip, ScoreBar } from "./ui";
import {
  IconBlock,
  IconCalendar,
  IconCheck,
  IconChevron,
  IconClock,
  IconDots,
  IconReticle,
  IconTarget,
  IconTimer,
} from "./icons";

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

  /* empty queue */
  if (!next && !blockedTop) {
    return (
      <section className="rise-in relative overflow-hidden rounded-xl border border-dashed border-line-strong bg-panel/60 px-6 py-14 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-line bg-well text-ink-faint">
          <IconReticle size={24} />
        </span>
        <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-ink">
          The queue is clear.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
          Dump whatever is on your mind below — Focal weighs it against your goals and
          deadlines, then points at the one thing worth doing next.
        </p>
        {!hasGoals && (
          <button
            onClick={onAddGoal}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-mint-soft transition-all hover:bg-pine-deep active:scale-[0.98]"
          >
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
    <AnimatePresence mode="wait">
      <motion.section
        key={task.id + (isBlockedView ? "-blocked" : "")}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-xl border border-night-line bg-night text-fog shadow-[0_30px_70px_-30px_rgba(13,27,21,0.55)]"
      >
        {/* ambient life: breathing glow + reticle watermark */}
        <div
          aria-hidden
          className="anim-breathe pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(87,199,154,0.16) 0%, rgba(87,199,154,0.04) 45%, transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(211,148,31,0.08) 0%, transparent 65%)",
          }}
        />
        <IconReticle
          aria-hidden
          size={220}
          className="pointer-events-none absolute -right-10 -top-10 text-fog/[0.045]"
        />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-fog-dim">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-mint" />
              {isBlockedView ? "Everything is blocked" : "Your next best action"}
            </p>
            <span className="ml-auto flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fog-dim">
                signal
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 font-mono text-sm font-bold ${
                  r.score >= 65
                    ? "border-mint/40 bg-mint/10 text-mint"
                    : "border-night-line bg-night-2 text-fog-dim"
                }`}
              >
                {r.score}
              </span>
            </span>
          </div>

          <h1 className="mt-4 max-w-2xl font-display text-[1.7rem] font-bold leading-[1.12] tracking-tight sm:text-4xl">
            {task.title}
          </h1>

          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fog-dim">
            <span className="font-semibold text-mint">Why this? </span>
            {isBlockedView
              ? `It's blocked — “${task.blockNote ?? "waiting on something"}”. Unblock it, or handle something else meanwhile.`
              : r.reason}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <CategoryBadge category={r.category} />
            {task.deadline != null && (
              <Chip
                tone={r.overdue ? "warn" : "dark"}
                icon={<IconClock size={12} />}
                title="Deadline"
              >
                {r.overdue ? "overdue · " : "due "}
                {deadlinePhrase(task.deadline, Date.now())}
              </Chip>
            )}
            <Chip tone="dark" icon={<IconTimer size={12} />} title="Estimated duration">
              {minutesLabel(task.estMinutes)}
            </Chip>
            {goal && (
              <Chip tone="dark" icon={<IconTarget size={12} />} title="Matched goal">
                {goal.title}
              </Chip>
            )}
            {task.postponeCount > 0 && (
              <Chip tone="dark" icon={<IconClock size={12} />} title="Postponed this many times">
                postponed ×{task.postponeCount}
              </Chip>
            )}
            {budget !== "any" && !r.fitsWindow && (
              <Chip tone="warn" icon={<IconTimer size={12} />}>
                bigger than your window
              </Chip>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {isBlockedView ? (
              <button
                onClick={() => onUnblock(task.id)}
                className="inline-flex items-center gap-2 rounded-lg bg-mint px-5 py-2.5 text-sm font-bold text-night transition-all hover:brightness-110 active:scale-[0.97]"
              >
                <IconBlock size={16} /> Unblock it
              </button>
            ) : (
              <button
                onClick={(e) => onComplete(task.id, e.currentTarget)}
                className="inline-flex items-center gap-2 rounded-lg bg-mint px-6 py-2.5 text-sm font-bold text-night shadow-[0_8px_24px_-8px_rgba(87,199,154,0.6)] transition-all hover:brightness-110 active:scale-[0.97]"
              >
                <IconCheck size={16} /> Complete
              </button>
            )}
            <button
              onClick={() => onNotNow(task.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-night-line bg-night-2/60 px-5 py-2.5 text-sm font-semibold text-fog transition-colors hover:border-fog-dim/50 hover:bg-night-2"
            >
              Not now
            </button>
            <button
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
              className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-fog-dim transition-colors hover:text-fog"
            >
              why this score
              <IconChevron
                size={13}
                className={`transition-transform duration-300 ${showWhy ? "rotate-90" : ""}`}
              />
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
                <div className="mt-6 space-y-2.5 rounded-lg border border-night-line bg-night-2/50 p-4">
                  <ScoreBar label="Goal fit" value={r.parts.goal} max={WEIGHTS.goal} delay={0} />
                  <ScoreBar label="Impact" value={r.parts.impact} max={WEIGHTS.impact} delay={0.05} />
                  <ScoreBar label="Urgency" value={r.parts.urgency} max={WEIGHTS.urgency} delay={0.1} />
                  <ScoreBar label="Time fit" value={r.parts.time} max={WEIGHTS.time} delay={0.15} />
                  <ScoreBar label="Freshness" value={r.parts.recency} max={WEIGHTS.recency} delay={0.2} />
                  {r.parts.postpone < 0 && (
                    <ScoreBar
                      label="Postponed"
                      value={r.parts.postpone}
                      max={21}
                      negative
                      delay={0.25}
                    />
                  )}
                  {r.parts.blocked < 0 && (
                    <ScoreBar label="Blocked" value={r.parts.blocked} max={70} negative delay={0.3} />
                  )}
                  <p className="pt-1 font-mono text-[10px] leading-relaxed text-fog-dim/70">
                    {meta.label} = goal fit + impact + urgency + time fit − penalties. Language
                    understanding by {task.analysis.source === "ai" ? "Groq LLM" : "built-in heuristics"};
                    the math is always deterministic.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>
    </AnimatePresence>
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
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          Up next
        </h2>
        <span className="font-mono text-[10px] text-ink-faint">ranked by the same score</span>
      </div>
      <ol className="mt-3 overflow-hidden rounded-xl border border-line bg-panel">
        <AnimatePresence initial={false}>
          {items.map((r, i) => (
            <motion.li
              key={r.task.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className={`group flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t border-line" : ""
              }`}
            >
              <span className="w-7 shrink-0 font-mono text-xs font-bold text-ink-faint">
                {String(i + 2).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{r.task.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-ink-faint">
                  <CategoryBadge category={r.category} size="xs" />
                  {r.task.deadline != null && (
                    <span className={r.overdue ? "text-ember" : ""}>
                      {r.overdue ? "overdue" : `due ${deadlinePhrase(r.task.deadline, Date.now())}`}
                    </span>
                  )}
                  <span>{minutesLabel(r.task.estMinutes)}</span>
                </div>
              </div>
              <span className="hidden font-mono text-xs font-bold text-ink-faint sm:block">
                {r.score}
              </span>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                <button
                  aria-label={`Complete ${r.task.title}`}
                  onClick={(e) => onComplete(r.task.id, e.currentTarget)}
                  className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-faint transition-colors hover:border-pine hover:bg-mint-soft hover:text-pine-deep"
                >
                  <IconCheck size={14} />
                </button>
                <button
                  aria-label={`Not now: ${r.task.title}`}
                  onClick={() => onNotNow(r.task.id)}
                  className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-faint transition-colors hover:border-line-strong hover:text-ink"
                >
                  <IconDots size={14} />
                </button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}

/* convenience re-export used by the inbox for consistent date chips */
export { IconCalendar };
