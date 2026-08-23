import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Category, Task } from "../types";
import { CATEGORY_META, deadlinePhrase, minutesLabel, type Ranked } from "../lib/engine";
import { useStore } from "../lib/store";
import { CategoryBadge } from "./ui";
import {
  IconBlock,
  IconCheck,
  IconInbox,
  IconPostpone,
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

  const closed = state.tasks.filter(
    (t) => t.status === "delegated" || t.status === "dropped"
  );
  const showClosed = filter === "DELEGATE" || filter === "DROP" || filter === "all";

  const restore = (t: Task) => {
    dispatch({ type: "PATCH_TASK", taskId: t.id, patch: { status: "active" } });
    pushToast({ title: "Back in the queue", body: t.title, tone: "info" });
  };

  const drop = (t: Task) => {
    dispatch({ type: "PATCH_TASK", taskId: t.id, patch: { status: "dropped" } });
    pushToast({ title: "Dropped — the queue re-ranked without it", body: t.title, tone: "warn" });
  };

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
          <IconInbox size={14} /> Task inbox
        </h2>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const n = counts[f.id] ?? 0;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  active
                    ? "border-night bg-night text-fog"
                    : n === 0
                      ? "border-line text-ink-faint/50"
                      : "border-line bg-panel text-ink-soft hover:border-line-strong hover:text-ink"
                }`}
              >
                {f.label} {n > 0 && <span className={active ? "text-mint" : ""}>{n}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-panel">
        {visible.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-faint">
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
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className={`group flex items-center gap-3 px-4 py-3 ${
                i > 0 ? "border-t border-line" : ""
              } ${r.task.blocked ? "bg-well/60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-sm font-medium ${
                      r.task.blocked ? "text-ink-soft line-through decoration-line-strong" : "text-ink"
                    }`}
                  >
                    {r.task.title}
                  </p>
                  <CategoryBadge category={r.category} size="xs" />
                  {r.task.blocked && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rust/30 bg-rust/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-rust">
                      <IconBlock size={10} /> blocked
                    </span>
                  )}
                  {r.task.originTitle && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-lagoon/30 bg-lagoon/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-lagoon">
                      <IconSplit size={10} /> step of “{r.task.originTitle}”
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-ink-faint">
                  {r.task.deadline != null && (
                    <span className={r.overdue ? "font-medium text-ember" : ""}>
                      {r.overdue
                        ? `overdue · ${deadlinePhrase(r.task.deadline, Date.now())}`
                        : `due ${deadlinePhrase(r.task.deadline, Date.now())}`}
                    </span>
                  )}
                  <span>{minutesLabel(r.task.estMinutes)}</span>
                  {r.task.postponeCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-honey">
                      <IconPostpone size={11} /> postponed ×{r.task.postponeCount}
                    </span>
                  )}
                  {r.task.analysis.source === "ai" && (
                    <span className="text-pine">scored by LLM</span>
                  )}
                  {r.task.blocked && r.task.blockNote && (
                    <span className="normal-case italic text-ink-faint">“{r.task.blockNote}”</span>
                  )}
                </div>
              </div>

              <span className="hidden shrink-0 font-mono text-xs font-bold text-ink-faint sm:block">
                {r.score}
              </span>

              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                {r.task.blocked ? (
                  <button
                    title="Unblock"
                    onClick={() => {
                      dispatch({
                        type: "PATCH_TASK",
                        taskId: r.task.id,
                        patch: { blocked: false, blockNote: undefined },
                      });
                      pushToast({
                        title: "Unblocked — back in ranking",
                        body: r.task.title,
                        tone: "ok",
                      });
                    }}
                    className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-faint transition-colors hover:border-pine hover:bg-mint-soft hover:text-pine-deep"
                  >
                    <IconUndo size={13} />
                  </button>
                ) : (
                  <button
                    title="Complete"
                    onClick={(e) => onComplete(r.task.id, e.currentTarget)}
                    className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-faint transition-colors hover:border-pine hover:bg-mint-soft hover:text-pine-deep"
                  >
                    <IconCheck size={13} />
                  </button>
                )}
                <button
                  title="Not now"
                  onClick={() => onNotNow(r.task.id)}
                  className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-faint transition-colors hover:border-line-strong hover:text-ink"
                >
                  <IconPostpone size={13} />
                </button>
                <button
                  title="Drop"
                  onClick={() => drop(r.task)}
                  className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink-faint transition-colors hover:border-rust/50 hover:bg-rust/10 hover:text-rust"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* closed loops: delegated + dropped */}
        {showClosed && closed.length > 0 && (
          <div className="border-t border-dashed border-line bg-well/40">
            {closed.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-3 border-t border-line/60 px-4 py-2.5 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink-faint line-through decoration-line-strong">
                    {t.title}
                  </p>
                </div>
                <CategoryBadge category={t.status === "delegated" ? "DELEGATE" : "DROP"} size="xs" />
                <button
                  onClick={() => restore(t)}
                  className="inline-flex items-center gap-1 rounded-md border border-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint opacity-0 transition-all hover:border-line hover:bg-panel hover:text-ink group-hover:opacity-100"
                >
                  <IconUndo size={11} /> restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {visible.length > 0 && filter === "all" && (
        <p className="mt-2 text-right font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          hover a row for actions
        </p>
      )}
    </section>
  );
}
