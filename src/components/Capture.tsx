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
      <form onSubmit={submit} className="card flex items-center gap-2 p-2 pl-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='Dump a task… e.g. "reply to recruiter before 5 pm"'
          aria-label="New task"
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:font-normal placeholder:text-ink/35"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label="Deadline"
          aria-pressed={expanded}
          className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border transition-all ${
            expanded || deadline
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-line text-ink/45 hover:border-ink/40 hover:text-ink"
          }`}
        >
          <IconCalendar size={16} />
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label="Duration"
          className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border transition-all ${
            est !== ""
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-line text-ink/45 hover:border-ink/40 hover:text-ink"
          }`}
        >
          <IconTimer size={16} />
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="btn-ink h-10 shrink-0 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <IconPlus size={16} /> Add
        </button>
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
            <div className="card mt-2 flex flex-wrap items-center gap-2 p-3">
              <label className="flex items-center gap-2">
                <span className="label-mono text-ink/50">deadline</span>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="field w-auto px-2 py-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="label-mono text-ink/50">takes about</span>
                <select
                  value={est}
                  onChange={(e) => setEst(e.target.value === "" ? "" : Number(e.target.value))}
                  className="field w-auto cursor-pointer px-2 py-1.5 text-sm"
                >
                  <option value="">guess for me</option>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}` : `${d}m`}
                    </option>
                  ))}
                </select>
              </label>
              <span className="label-mono ml-auto hidden text-ink/35 sm:block">
                both optional — skip them
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="label-mono mt-2 text-ink/40">
        ↵ adds instantly · deadlines inside the text are auto-detected
      </p>
    </div>
  );
}
