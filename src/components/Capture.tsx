import { AnimatePresence, motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { CATEGORY_META, scoreTask } from "../lib/engine";
import { useStore } from "../lib/store";
import { IconCalendar, IconPlus, IconTimer } from "./icons";

const DURATIONS = [10, 15, 20, 30, 45, 60, 90, 120];

export function Capture() {
  const { state, captureTask, pushToast } = useStore();
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [est, setEst] = useState<number | "">("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const task = captureTask(t, {
      deadline: deadline ? new Date(deadline).getTime() : null,
      estMinutes: est === "" ? null : est,
    });
    const scored = scoreTask(task, state.goals, state.budget);
    const meta = CATEGORY_META[scored.category];
    pushToast({
      title:
        scored.score >= 65 ? "Captured — it just became #1" : `Captured → ${meta.label}`,
      body: task.deadlineAuto
        ? `Deadline spotted in your text (${new Date(task.deadline!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}). Queue re-ranked.`
        : task.analysis.reason,
      tone: scored.category === "DO_NOW" ? "warn" : "info",
    });
    setTitle("");
    setDeadline("");
    setEst("");
  };

  return (
    <div className="anim-rise" style={{ animationDelay: "60ms" }}>
      <form
        onSubmit={submit}
        className="card relative flex items-center gap-1.5 p-1.5 pl-3 sm:gap-2 sm:p-2 sm:pl-4 transition-all focus-within:border-primary/40 focus-within:shadow-hard-soft"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Dump a task… e.g. "reply to recruiter before 5 pm"'
          aria-label="New task"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-normal text-ink outline-none placeholder:text-placeholder"
        />
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label="Add deadline"
            title="Add deadline"
            aria-pressed={expanded}
            className={`grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border transition-all sm:h-8.5 sm:w-8.5 ${
              expanded || deadline
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-line bg-surface-2/50 text-ink-muted hover:border-ink/30 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <IconCalendar size={15} />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label="Set duration estimate"
            title="Set duration estimate"
            className={`grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border transition-all sm:h-8.5 sm:w-8.5 ${
              est !== ""
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-line bg-surface-2/50 text-ink-muted hover:border-ink/30 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <IconTimer size={15} />
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="btn-ink h-8 shrink-0 rounded-lg px-3 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:h-8.5 sm:px-3.5"
          >
            <IconPlus size={14} />
            <span>Add</span>
          </button>
        </div>
      </form>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="card mt-2 flex flex-wrap items-center gap-2.5 border-line bg-surface-2/30 p-2.5 sm:p-3">
              <label className="flex items-center gap-2">
                <span className="label-mono text-ink-muted">deadline</span>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="field w-auto px-2.5 py-1 text-xs"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="label-mono text-ink-muted">takes about</span>
                <select
                  value={est}
                  onChange={(e) => setEst(e.target.value === "" ? "" : Number(e.target.value))}
                  className="field w-auto cursor-pointer px-2.5 py-1 text-xs"
                >
                  <option value="">guess for me</option>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}` : `${d}m`}
                    </option>
                  ))}
                </select>
              </label>
              <span className="label-mono ml-auto hidden text-ink-faint sm:block">
                both optional — skip them
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="label-mono mt-1.5 text-ink-faint">
        ↵ adds instantly · deadlines in text are auto-detected
      </p>
    </div>
  );
}
