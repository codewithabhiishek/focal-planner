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
  IconCheck,
  IconChevron,
  IconClock,
  IconDots,
  IconReticle,
  IconSquiggle,
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
    <div className="anim-rise flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="label-mono text-ink/60">How much time do you have?</span>
      <div className="flex flex-wrap gap-1.5">
        {BUDGETS.map((b) => {
          const active = budget === b.id;
          return (
            <button
              key={String(b.id)}
              onClick={() => onChange(b.id)}
              aria-pressed={active}
              className={`cursor-pointer rounded-full border-2 border-ink px-3.5 py-2 font-mono text-xs font-bold transition-all duration-150 sm:py-1 ${
                active
                  ? "bg-ink text-canvas shadow-hard-soft"
                  : "bg-paper text-ink/60 hover:-translate-y-0.5 hover:text-ink hover:shadow-hard-faint"
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
            className="chip border-mint/50 bg-mint/10 text-mint"
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
      <section className="anim-rise rounded-[20px] border-2 border-dashed border-ink/40 bg-paper/70 px-6 py-14 text-center">
        <span className="sticker anim-wiggle mx-auto grid h-14 w-14 place-items-center bg-canvas">
          <IconReticle size={28} />
        </span>
        <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight">
          Queue's clear. Nice.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink/65">
          Dump whatever's on your mind below — Focal weighs it against your goals and
          deadlines, then points at the one thing worth doing next.
        </p>
        {!hasGoals && (
          <button onClick={onAddGoal} className="btn-ink mt-6 px-5 py-2.5 text-sm">
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="card-dark relative overflow-hidden p-6 sm:p-8"
      >
        {/* ambient life */}
        <div
          aria-hidden
          className="anim-breathe pointer-events-none absolute -top-28 -right-20 h-80 w-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,228,94,0.20) 0%, rgba(255,228,94,0.05) 45%, transparent 70%)",
          }}
        />
        <IconReticle
          aria-hidden
          size={230}
          className="pointer-events-none absolute -top-10 -right-10 text-fog/[0.05]"
        />
        <IconSquiggle
          aria-hidden
          size={90}
          className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-fog/[0.06]"
        />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="sticker -rotate-2 inline-flex items-center gap-2 bg-canvas px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.18em] text-ink uppercase">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-mint" />
              {isBlockedView ? "all blocked" : "do this now"}
            </span>
            <span className="ml-auto flex items-center gap-2">
              <span className="label-mono text-fog-faint">signal</span>
              <span
                className={`rounded-lg border-2 px-2.5 py-0.5 font-mono text-base font-bold ${
                  r.score >= 65
                    ? "border-mint/60 bg-mint/15 text-mint"
                    : "border-fog/25 text-fog-dim"
                }`}
              >
                {r.score}
              </span>
            </span>
          </div>

          <h1 className="mt-5 max-w-2xl font-display text-[clamp(1.75rem,4.6vw,3.1rem)] leading-[1.06] font-extrabold tracking-tight text-balance break-words text-paper">
            {task.title}
          </h1>

          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fog-dim">
            <span className="font-bold text-mint">Why this? </span>
            {isBlockedView
              ? `It's blocked — "${task.blockNote ?? "waiting on something"}". Unblock it, or grab something else meanwhile.`
              : r.reason}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <CategoryBadge category={r.category} />
            {task.deadline != null && (
              <Chip
                tone={r.overdue ? "coral" : "paper"}
                icon={<IconClock size={11} />}
                title="Deadline"
              >
                {r.overdue ? "overdue · " : "due "}
                {deadlinePhrase(task.deadline, Date.now())}
              </Chip>
            )}
            <Chip tone="paper" icon={<IconTimer size={11} />} title="Estimated duration">
              {minutesLabel(task.estMinutes)}
            </Chip>
            {goal && (
              <Chip tone="mint" icon={<IconTarget size={11} />} title="Matched goal">
                {goal.title}
              </Chip>
            )}
            {task.postponeCount > 0 && (
              <Chip tone="paper" icon={<IconClock size={11} />} title="Times postponed">
                postponed ×{task.postponeCount}
              </Chip>
            )}
            {budget !== "any" && !r.fitsWindow && (
              <Chip tone="coral" icon={<IconTimer size={11} />}>
                bigger than your window
              </Chip>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            {isBlockedView ? (
              <button onClick={() => onUnblock(task.id)} className="btn-yellow px-6 py-3 text-[15px] font-bold">
                <IconBlock size={17} /> Unblock it
              </button>
            ) : (
              <button
                onClick={(e) => onComplete(task.id, e.currentTarget)}
                className="btn-yellow px-7 py-3 text-[15px] font-bold"
              >
                <IconCheck size={17} /> Complete
              </button>
            )}
            <button onClick={() => onNotNow(task.id)} className="btn-outline-dark px-5 py-3 text-[15px]">
              Not now
            </button>
            <button
              onClick={() => setShowWhy((v) => !v)}
              aria-expanded={showWhy}
              className="label-mono ml-auto cursor-pointer text-fog-faint transition-colors hover:text-fog"
            >
              <span className="inline-flex items-center gap-1">
                why this score
                <IconChevron
                  size={13}
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
                <div className="mt-6 space-y-2.5 rounded-xl border-2 border-fog/15 bg-ink-2/70 p-4">
                  <ScoreBar label="goal fit" value={r.parts.goal} max={WEIGHTS.goal} color="bg-mint" />
                  <ScoreBar label="impact" value={r.parts.impact} max={WEIGHTS.impact} color="bg-cobalt" delay={0.05} />
                  <ScoreBar label="urgency" value={r.parts.urgency} max={WEIGHTS.urgency} color="bg-coral" delay={0.1} />
                  <ScoreBar label="time fit" value={r.parts.time} max={WEIGHTS.time} color="bg-lilac" delay={0.15} />
                  <ScoreBar label="freshness" value={r.parts.recency} max={WEIGHTS.recency} color="bg-canvas" delay={0.2} />
                  {r.parts.postpone < 0 && (
                    <ScoreBar label="postponed" value={r.parts.postpone} max={21} negative delay={0.25} />
                  )}
                  {r.parts.blocked < 0 && (
                    <ScoreBar label="blocked" value={r.parts.blocked} max={70} negative delay={0.3} />
                  )}
                  <p className="pt-1 font-mono text-[10px] leading-relaxed text-fog-faint">
                    {meta.label} = goal fit + impact + urgency + time fit − penalties. Language
                    reading by {task.analysis.source === "ai" ? "the Groq LLM" : "built-in heuristics"} —
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
    <section className="mt-9">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-extrabold tracking-tight">Up next</h2>
        <span className="label-mono text-ink/45">same score · ranked live</span>
      </div>
      <div className="card mt-3 overflow-hidden">
        <AnimatePresence initial={false}>
          {items.map((r, i) => (
            <motion.div
              key={r.task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -36 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className={`group flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t-2 border-dashed border-line" : ""}`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-ink bg-canvas font-mono text-xs font-bold shadow-hard-xs">
                {i + 2}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{r.task.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] text-ink/50">
                  <CategoryBadge category={r.category} size="xs" />
                  {r.task.deadline != null && (
                    <span className={r.overdue ? "font-bold text-coral" : ""}>
                      {r.overdue ? "overdue" : `due ${deadlinePhrase(r.task.deadline, Date.now())}`}
                    </span>
                  )}
                  <span>{minutesLabel(r.task.estMinutes)}</span>
                </div>
              </div>
              <span className="chip hidden border-ink/20 bg-canvas/60 sm:inline-flex">{r.score}</span>
              <div className="flex shrink-0 items-center gap-1.5 transition-opacity duration-150 max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                <button
                  aria-label={`Complete ${r.task.title}`}
                  onClick={(e) => onComplete(r.task.id, e.currentTarget)}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/50 transition-all hover:border-mint hover:bg-mint/10 hover:text-mint lg:h-7 lg:w-7"
                >
                  <IconCheck size={14} />
                </button>
                <button
                  aria-label={`Not now: ${r.task.title}`}
                  onClick={() => onNotNow(r.task.id)}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/50 transition-all hover:border-ink hover:text-ink lg:h-7 lg:w-7"
                >
                  <IconDots size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
