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
    /* report the engine's final verdict, not the raw analysis */
    const bucket = scoreTask(task, state.goals, state.budget).category;
    const meta = CATEGORY_META[bucket];
    const becameTop = scoreTask(task, state.goals, state.budget).score >= 65;
    pushToast({
      title: becameTop ? `Captured → it's now your #1` : `Captured → ${meta.label}`,
      body: task.deadlineAuto
        ? `Deadline detected in the text (${new Date(task.deadline!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}). Queue re-ranked.`
        : task.analysis.reason,
      tone: bucket === "DO_NOW" ? "warn" : "info",
    });
    setTitle("");
    setDeadline("");
    setEst("");
    setExpanded(false);
  };

  return (
    <form
      onSubmit={submit}
      className="group rounded-xl border border-line bg-panel shadow-[0_10px_30px_-18px_rgba(13,27,21,0.25)] transition-all focus-within:border-pine focus-within:shadow-[0_14px_36px_-16px_rgba(23,121,90,0.35)]"
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="text-ink-faint transition-colors group-focus-within:text-pine">
          <IconPlus size={18} />
        </span>
        <input
          id="capture-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Dump a task… e.g. “Reply to recruiter before 5 PM”'
          aria-label="New task"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-faint"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={`hidden rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors sm:block ${
            expanded
              ? "border-pine bg-mint-soft text-pine-deep"
              : "border-line text-ink-faint hover:border-line-strong hover:text-ink"
          }`}
        >
          details
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="rounded-lg bg-night px-4 py-2 text-[13px] font-semibold text-fog transition-all enabled:hover:bg-night-3 enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Add
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3">
              <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                <IconCalendar size={13} />
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="rounded-md border border-line bg-well px-2 py-1.5 font-mono text-[11px] normal-case text-ink focus:border-pine focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                <IconTimer size={13} />
                <select
                  value={est}
                  onChange={(e) => setEst(e.target.value === "" ? "" : Number(e.target.value))}
                  className="rounded-md border border-line bg-well px-2 py-1.5 font-mono text-[11px] normal-case text-ink focus:border-pine focus:outline-none"
                >
                  <option value="">duration?</option>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}` : `${d} min`}
                    </option>
                  ))}
                </select>
              </label>
              <span className="ml-auto font-mono text-[10px] text-ink-faint">
                both optional — Focal estimates the rest
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
