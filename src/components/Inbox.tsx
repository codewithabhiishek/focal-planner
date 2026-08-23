import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Category, Task } from "../types";
import { deadlinePhrase, minutesLabel, type Ranked } from "../lib/engine";
import { useStore } from "../lib/store";
import { CategoryBadge } from "./ui";
import {
  IconBlock,
  IconCheck,
  IconInbox,
  IconPostpone,
  IconSpark,
  IconSplit,
  IconTrash,
  IconUndo,
} from "./icons";

type Filter = "all" | Category | "blocked";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "DO_NOW", label: "Do now" },
  { id: "SOON", label: "Soon" },
  { id: "LATER", label: "Later" },
  { id: "DELEGATE", label: "Delegate" },
  { id: "DROP", label: "Drop" },
  { id: "blocked", label: "Blocked" },
];

export function Inbox({
  ranked,
  onComplete,
  onNotNow,
}: {
  ranked: Ranked[];
  onComplete: (taskId: string, el?: HTMLElement) => void;
  onNotNow: (taskId: string) => void;
}) {
  const { state, dispatch, pushToast } = useStore();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: ranked.length, blocked: 0 };
    for (const r of ranked) {
      c[r.category] = (c[r.category] ?? 0) + 1;
      if (r.task.blocked) c.blocked++;
    }
    return c;
  }, [ranked]);

  const visible = ranked.filter((r) => {
    if (filter === "all") return true;
    if (filter === "blocked") return r.task.blocked;
    return r.category === filter;
  });

  const closed = state.tasks.filter((t) => t.status === "delegated" || t.status === "dropped");
  const showClosed = filter === "DELEGATE" || filter === "DROP" || filter === "all";

  const restore = (t: Task) => {
    dispatch({ type: "PATCH_TASK", taskId: t.id, patch: { status: "active" } });
    pushToast({ title: "Back in the queue", body: t.title, tone: "info" });
  };

  const drop = (t: Task) => {
    dispatch({ type: "PATCH_TASK", taskId: t.id, patch: { status: "dropped" } });
    pushToast({ title: "Dropped — queue re-ranked without it", body: t.title, tone: "warn" });
  };

  return (
    <section className="mt-10">
      {/* Cohesive toolbar: title + filter pills */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-ink">
          <IconInbox size={18} className="text-primary" /> Task inbox
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const n = counts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase transition-all duration-150 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-hard-faint"
                    : n === 0
                      ? "border-line bg-surface-2 text-ink-muted/80 hover:border-ink/30 hover:text-ink"
                      : "border-line bg-surface text-ink hover:-translate-y-0.5 hover:border-ink/40"
                }`}
              >
                {f.label} {n > 0 ? n : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List Container */}
      <div className="card mt-3 overflow-hidden">
        {visible.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-ink-muted">
            Nothing here — the queue is quiet.
          </p>
        )}
        <AnimatePresence initial={false}>
          {visible.map((r, i) => (
            <motion.div
              key={r.task.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.25 }}
              className={`group flex items-center justify-between gap-4 px-4 py-3 sm:px-5 ${
                i > 0 ? "border-t border-line" : ""
              } ${r.task.blocked ? "bg-warning/[0.04]" : "hover:bg-surface-2/40"} transition-colors`}
            >
              {/* Left Column: Title + Badges (Row 1), Metadata Baseline (Row 2) */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm font-bold tracking-tight text-ink ${
                      r.task.blocked ? "text-ink-secondary line-through decoration-line decoration-2" : ""
                    }`}
                  >
                    {r.task.title}
                  </span>
                  <CategoryBadge category={r.category} size="xs" />
                  {r.task.blocked && (
                    <span className="chip border-warning/35 bg-warning/10 text-warning">
                      <IconBlock size={10} /> blocked
                    </span>
                  )}
                  {r.task.originTitle && (
                    <span className="chip border-later/35 bg-later/10 text-later">
                      <IconSplit size={10} /> step of “{r.task.originTitle}”
                    </span>
                  )}
                </div>

                {/* Metadata Order: Due → Duration → Optional repeat / blocked / AI context */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-ink-muted">
                  {r.task.deadline != null && (
                    <span className={r.overdue ? "font-bold text-coral" : ""}>
                      {r.overdue
                        ? `Overdue · ${deadlinePhrase(r.task.deadline, Date.now())}`
                        : `Due ${deadlinePhrase(r.task.deadline, Date.now())}`}
                    </span>
                  )}
                  {r.task.deadline != null && <span className="text-ink-faint">·</span>}

                  <span>{minutesLabel(r.task.estMinutes)}</span>

                  {r.task.postponeCount > 0 && (
                    <>
                      <span className="text-ink-faint">·</span>
                      <span className="inline-flex items-center gap-1 font-bold text-honey">
                        <IconPostpone size={11} /> Repeat ×{r.task.postponeCount}
                      </span>
                    </>
                  )}

                  {r.task.blocked && r.task.blockNote && (
                    <>
                      <span className="text-ink-faint">·</span>
                      <span className="italic text-ink-secondary truncate max-w-[280px]" title={r.task.blockNote}>
                        “{r.task.blockNote}”
                      </span>
                    </>
                  )}

                  {r.task.analysis.source === "ai" && (
                    <>
                      <span className="text-ink-faint">·</span>
                      <span className="inline-flex items-center gap-1 text-later">
                        <IconSpark size={10} /> AI-scored
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Score Slot + Fixed-Width Actions Slot */}
              <div className="flex shrink-0 items-center gap-3">
                <span className="chip w-10 justify-center border-line bg-surface-2 font-mono text-[11px] font-bold text-ink-secondary">
                  {r.score}
                </span>

                <div className="flex w-[88px] items-center justify-end gap-1.5 transition-opacity duration-150 max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100">
                  {r.task.blocked ? (
                    <button
                      title="Unblock"
                      aria-label="Unblock task"
                      onClick={() => {
                        dispatch({
                          type: "PATCH_TASK",
                          taskId: r.task.id,
                          patch: { blocked: false, blockNote: undefined },
                        });
                        pushToast({ title: "Unblocked — back in ranking", body: r.task.title, tone: "ok" });
                      }}
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-ink-muted transition-all hover:border-success hover:bg-success/10 hover:text-success"
                    >
                      <IconUndo size={13} />
                    </button>
                  ) : (
                    <button
                      title="Complete"
                      aria-label="Complete task"
                      onClick={(e) => onComplete(r.task.id, e.currentTarget)}
                      className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-ink-muted transition-all hover:border-success hover:bg-success/10 hover:text-success"
                    >
                      <IconCheck size={13} />
                    </button>
                  )}
                  <button
                    title="Not now"
                    aria-label="Snooze / not now"
                    onClick={() => onNotNow(r.task.id)}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-ink-muted transition-all hover:border-ink/40 hover:text-ink"
                  >
                    <IconPostpone size={13} />
                  </button>
                  <button
                    title="Drop"
                    aria-label="Drop task"
                    onClick={() => drop(r.task)}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-ink-muted transition-all hover:border-danger hover:bg-danger/10 hover:text-danger"
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Closed / Dropped / Delegated Tasks */}
        {showClosed && closed.length > 0 && (
          <div className="border-t border-line bg-surface-2/30">
            {closed.map((t, idx) => (
              <div
                key={t.id}
                className={`group flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5 ${
                  idx > 0 ? "border-t border-line" : ""
                }`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink-muted line-through decoration-line decoration-2">
                      {t.title}
                    </span>
                    <CategoryBadge category={t.status === "delegated" ? "DELEGATE" : "DROP"} size="xs" />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="w-10" />
                  <div className="flex w-[88px] items-center justify-end">
                    <button
                      onClick={() => restore(t)}
                      aria-label={`Restore ${t.title}`}
                      className="chip cursor-pointer border-line bg-surface text-ink-muted transition-all hover:border-ink/40 hover:bg-surface-2 hover:text-ink max-lg:opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    >
                      <IconUndo size={11} /> restore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <p className="label-mono mt-2 text-right text-ink-faint">hover a row for actions</p>
      )}
    </section>
  );
}
