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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
          <IconInbox size={19} /> Task inbox
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const n = counts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`cursor-pointer rounded-full border-2 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase transition-all duration-150 ${
                  active
                    ? "border-ink bg-ink text-canvas"
                    : n === 0
                      ? "border-ink/15 text-ink/30"
                      : "border-ink/25 bg-paper text-ink/60 hover:-translate-y-0.5 hover:border-ink hover:text-ink"
                }`}
              >
                {f.label} {n > 0 && n}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card mt-3 overflow-hidden">
        {visible.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-ink/45">
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
              className={`group flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t-2 border-dashed border-line" : ""
              } ${r.task.blocked ? "bg-coral/[0.05]" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-bold ${
                      r.task.blocked ? "text-ink/45 line-through decoration-2" : ""
                    }`}
                  >
                    {r.task.title}
                  </p>
                  <CategoryBadge category={r.category} size="xs" />
                  {r.task.blocked && (
                    <span className="chip border-coral/50 bg-coral/10 text-coral">
                      <IconBlock size={10} /> blocked
                    </span>
                  )}
                  {r.task.originTitle && (
                    <span className="chip border-lilac/45 bg-lilac/10 text-lilac">
                      <IconSplit size={10} /> step of “{r.task.originTitle}”
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-ink/45">
                  {r.task.deadline != null && (
                    <span className={r.overdue ? "font-bold text-coral" : ""}>
                      {r.overdue
                        ? `overdue · ${deadlinePhrase(r.task.deadline, Date.now())}`
                        : `due ${deadlinePhrase(r.task.deadline, Date.now())}`}
                    </span>
                  )}
                  <span>{minutesLabel(r.task.estMinutes)}</span>
                  {r.task.postponeCount > 0 && (
                    <span className="inline-flex items-center gap-1 font-bold text-honey">
                      <IconPostpone size={11} /> ×{r.task.postponeCount}
                    </span>
                  )}
                  {r.task.analysis.source === "ai" && (
                    <span className="inline-flex items-center gap-1 text-lilac">
                      <IconSpark size={10} /> LLM-scored
                    </span>
                  )}
                  {r.task.blocked && r.task.blockNote && (
                    <span className="text-ink/40 italic">“{r.task.blockNote}”</span>
                  )}
                </div>
              </div>

              <span className="chip hidden shrink-0 border-ink/20 bg-canvas/60 sm:inline-flex">
                {r.score}
              </span>

              <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                {r.task.blocked ? (
                  <button
                    title="Unblock"
                    onClick={() => {
                      dispatch({
                        type: "PATCH_TASK",
                        taskId: r.task.id,
                        patch: { blocked: false, blockNote: undefined },
                      });
                      pushToast({ title: "Unblocked — back in ranking", body: r.task.title, tone: "ok" });
                    }}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/50 transition-all hover:border-mint hover:bg-mint/10 hover:text-mint"
                  >
                    <IconUndo size={13} />
                  </button>
                ) : (
                  <button
                    title="Complete"
                    onClick={(e) => onComplete(r.task.id, e.currentTarget)}
                    className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/50 transition-all hover:border-mint hover:bg-mint/10 hover:text-mint"
                  >
                    <IconCheck size={13} />
                  </button>
                )}
                <button
                  title="Not now"
                  onClick={() => onNotNow(r.task.id)}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/50 transition-all hover:border-ink hover:text-ink"
                >
                  <IconPostpone size={13} />
                </button>
                <button
                  title="Drop"
                  onClick={() => drop(r.task)}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/50 transition-all hover:border-coral hover:bg-coral/10 hover:text-coral"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {showClosed && closed.length > 0 && (
          <div className="border-t-2 border-ink bg-canvas/40">
            {closed.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-3 border-t border-dashed border-ink/15 px-4 py-2.5 first:border-t-0"
              >
                <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink/40 line-through decoration-2">
                  {t.title}
                </p>
                <CategoryBadge category={t.status === "delegated" ? "DELEGATE" : "DROP"} size="xs" />
                <button
                  onClick={() => restore(t)}
                  className="label-mono inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-ink/40 opacity-0 transition-all hover:bg-paper hover:text-ink group-hover:opacity-100"
                >
                  <IconUndo size={11} /> restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <p className="label-mono mt-2 text-right text-ink/35">hover a row for actions</p>
      )}
    </section>
  );
}
