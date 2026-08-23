import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import type { Goal, SubtaskSuggestion, Task } from "../types";
import { analyzeHeuristic } from "../lib/ai/heuristic";
import { getProvider } from "../lib/ai";
import { useStore } from "../lib/store";
import { Modal, ModalHeader, Switch } from "./ui";
import {
  IconBlock,
  IconCheck,
  IconClock,
  IconPause,
  IconPostpone,
  IconSend,
  IconSpark,
  IconSplit,
  IconStar,
  IconStarFilled,
  IconTimer,
  IconTrash,
  IconUndo,
} from "./icons";

/* ------------------------------------------------------------------ */
/* Not now — lightweight feedback that feeds the engine                */
/* ------------------------------------------------------------------ */

const NOT_NOW_OPTIONS = [
  {
    id: "later",
    label: "I'll do it later",
    hint: "Postpones it — repeated postpones are noticed",
    icon: IconPostpone,
  },
  {
    id: "notImportant",
    label: "Not important anymore",
    hint: "Lowers its goal fit and impact permanently",
    icon: IconUndo,
  },
  {
    id: "delegate",
    label: "Someone else can do it",
    hint: "Moves it out of your queue entirely",
    icon: IconSend,
  },
  {
    id: "blocked",
    label: "I'm blocked",
    hint: "Hidden from recommendations until unblocked",
    icon: IconBlock,
  },
  {
    id: "noTime",
    label: "I don't have enough time",
    hint: "Saved for a bigger time window",
    icon: IconTimer,
  },
] as const;

export type NotNowReason = (typeof NOT_NOW_OPTIONS)[number]["id"];

export function NotNowModal({
  task,
  open,
  onClose,
  onChoose,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onChoose: (task: Task, reason: NotNowReason) => void;
}) {
  return (
    <Modal open={open && !!task} onClose={onClose}>
      <ModalHeader eyebrow="Feedback" title={task ? `“${task.title}”` : ""} onClose={onClose} />
      <div className="px-5 py-4">
        <p className="text-sm text-ink-soft">Why not now? Your answer trains the ranking.</p>
        <div className="mt-3 space-y-1.5">
          {NOT_NOW_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => task && onChoose(task, o.id)}
              className="group flex w-full items-center gap-3 rounded-lg border border-line bg-panel px-3.5 py-2.5 text-left transition-all hover:border-pine/50 hover:bg-mint-soft/40 active:scale-[0.99]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-well text-ink-soft transition-colors group-hover:border-pine/40 group-hover:text-pine-deep">
                <o.icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{o.label}</span>
                <span className="block text-[11px] text-ink-faint">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Avoidance — the pattern is recognized, not nagged                   */
/* ------------------------------------------------------------------ */

const AVOID_OPTIONS = [
  {
    id: "tooBig",
    label: "The task is too big",
    hint: "Break it into steps you can actually start",
    icon: IconSplit,
  },
  {
    id: "noStart",
    label: "I don't know how to start",
    hint: "Get a tiny first step suggested",
    icon: IconSpark,
  },
  {
    id: "noTime",
    label: "I don't have time",
    hint: "We'll only surface it in bigger windows",
    icon: IconClock,
  },
  {
    id: "notImportant",
    label: "It's not actually important",
    hint: "Drop it and free your queue",
    icon: IconTrash,
  },
] as const;

export type AvoidReason = (typeof AVOID_OPTIONS)[number]["id"];

export function AvoidanceModal({
  task,
  open,
  onClose,
  onChoose,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onChoose: (task: Task, reason: AvoidReason) => void;
}) {
  return (
    <Modal open={open && !!task} onClose={onClose}>
      <ModalHeader
        eyebrow={`Postponed ${task?.postponeCount ?? 0}×`}
        title="What's stopping you?"
        onClose={onClose}
      />
      <div className="px-5 py-4">
        {task && (
          <p className="text-sm leading-relaxed text-ink-soft">
            You've postponed <strong className="text-ink">“{task.title}”</strong> several times.
            No nagging — let's fix the real problem.
          </p>
        )}
        <div className="mt-3 space-y-1.5">
          {AVOID_OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => task && onChoose(task, o.id)}
              className="group flex w-full items-center gap-3 rounded-lg border border-line bg-panel px-3.5 py-2.5 text-left transition-all hover:border-honey/60 hover:bg-honey/10 active:scale-[0.99]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line bg-well text-ink-soft transition-colors group-hover:border-honey/50 group-hover:text-honey">
                <o.icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{o.label}</span>
                <span className="block text-[11px] text-ink-faint">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Breakdown — big/avoided task → small doable steps                   */
/* ------------------------------------------------------------------ */

export function BreakdownModal({
  task,
  open,
  onClose,
  onAdd,
  firstStepTiny,
}: {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onAdd: (task: Task, steps: SubtaskSuggestion[]) => void;
  firstStepTiny: boolean;
}) {
  const { state } = useStore();
  const [steps, setSteps] = useState<SubtaskSuggestion[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !task) return;
    let alive = true;
    setLoading(true);
    const provider = getProvider(state.settings);
    provider.breakDown(task, state.goals).then((s) => {
      if (!alive) return;
      // when the blocker is "don't know how to start", lead with a 5-min step
      const ordered =
        firstStepTiny && s.length > 0 && (s[0].minutes ?? 99) > 10
          ? [{ title: "Open the file / tab and name the first action", minutes: 5 }, ...s]
          : s;
      setSteps(ordered);
      setChecked(ordered.map(() => true));
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id, firstStepTiny]);

  const selected = steps.filter((_, i) => checked[i]);

  return (
    <Modal open={open && !!task} onClose={onClose} width="max-w-lg">
      <ModalHeader
        eyebrow="Break it down"
        title={task ? `“${task.title}”` : ""}
        onClose={onClose}
      />
      <div className="px-5 py-4">
        {loading ? (
          <div className="space-y-2">
            {[64, 80, 52].map((w, i) => (
              <div
                key={i}
                className="shimmer h-11 rounded-lg border border-night-line bg-night-2/40"
                style={{ width: `${w}%` }}
              />
            ))}
            <p className="pt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              splitting it into startable steps…
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              Small enough to start today. Uncheck anything that doesn't apply.
            </p>
            <div className="mt-3 space-y-1.5">
              {steps.map((s, i) => (
                <motion.label
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
                    checked[i]
                      ? "border-pine/40 bg-mint-soft/30"
                      : "border-line bg-panel opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked[i]}
                    onChange={() =>
                      setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
                    }
                    className="sr-only"
                  />
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
                      checked[i] ? "border-pine bg-pine text-mint-soft" : "border-line-strong"
                    }`}
                  >
                    {checked[i] && <IconCheck size={12} />}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                    {i + 1}. {s.title}
                  </span>
                  {s.minutes != null && (
                    <span className="shrink-0 font-mono text-[10px] text-ink-faint">
                      {s.minutes} min
                    </span>
                  )}
                </motion.label>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
              >
                Keep it as one task
              </button>
              <button
                disabled={selected.length === 0}
                onClick={() => task && onAdd(task, selected)}
                className="rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-mint-soft transition-all enabled:hover:bg-pine-deep enabled:active:scale-[0.98] disabled:opacity-40"
              >
                Add {selected.length} step{selected.length === 1 ? "" : "s"} to the queue
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Goals manager                                                       */
/* ------------------------------------------------------------------ */

export function GoalsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, pushToast } = useStore();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");

  const addGoal = () => {
    const t = title.trim();
    if (!t) return;
    const first = state.goals.length === 0;
    dispatch({
      type: "ADD_GOAL",
      goal: {
        id: uuid(),
        title: t,
        description: desc.trim(),
        targetDate: date || null,
        active: true,
        isPrimary: first,
        createdAt: Date.now(),
      },
    });
    pushToast({
      title: first ? "Primary goal set" : "Goal added",
      body: `Tasks are now weighed against “${t}”.`,
      tone: "ok",
    });
    setTitle("");
    setDesc("");
    setDate("");
  };

  return (
    <Modal open={open} onClose={onClose} width="max-w-lg">
      <ModalHeader eyebrow="Direction" title="Goals" onClose={onClose} />
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
        {state.goals.length === 0 && (
          <p className="mb-3 text-sm text-ink-soft">
            Goals are how Focal knows what matters. One line is enough.
          </p>
        )}
        <div className="space-y-3">
          {state.goals.map((g) => (
            <GoalRow key={g.id} goal={g} />
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-dashed border-line-strong bg-well/50 p-3.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            New goal
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGoal()}
            placeholder="e.g. Get a DevOps internship"
            className="mt-2 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-ink outline-none placeholder:text-ink-faint focus:border-pine"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Description (optional)"
              className="min-w-0 flex-1 rounded-md border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-pine"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Target date"
              className="rounded-md border border-line bg-panel px-3 py-2 font-mono text-xs text-ink outline-none focus:border-pine"
            />
            <button
              onClick={addGoal}
              disabled={!title.trim()}
              className="rounded-md bg-night px-4 py-2 text-sm font-semibold text-fog transition-all enabled:hover:bg-night-3 enabled:active:scale-[0.97] disabled:opacity-35"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function GoalRow({ goal }: { goal: Goal }) {
  const { dispatch, pushToast } = useStore();
  return (
    <div
      className={`rounded-lg border p-3.5 transition-colors ${
        goal.active ? "border-line bg-panel" : "border-line bg-well/50 opacity-70"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <button
          title={goal.isPrimary ? "Primary goal" : "Make primary"}
          onClick={() => {
            dispatch({ type: "SET_PRIMARY_GOAL", goalId: goal.id });
            pushToast({ title: "Primary goal changed", body: `“${goal.title}”`, tone: "info" });
          }}
          className={`shrink-0 transition-transform hover:scale-110 ${
            goal.isPrimary ? "text-honey" : "text-line-strong hover:text-honey"
          }`}
        >
          {goal.isPrimary ? <IconStarFilled size={18} /> : <IconStar size={18} />}
        </button>
        <input
          value={goal.title}
          onChange={(e) =>
            dispatch({ type: "PATCH_GOAL", goalId: goal.id, patch: { title: e.target.value } })
          }
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink outline-none transition-colors hover:border-line focus:border-pine focus:bg-panel"
        />
        <Switch
          checked={goal.active}
          onChange={(v) => dispatch({ type: "PATCH_GOAL", goalId: goal.id, patch: { active: v } })}
          label={`Toggle ${goal.title}`}
        />
        <button
          title="Delete goal"
          onClick={() => {
            dispatch({ type: "DELETE_GOAL", goalId: goal.id });
            pushToast({ title: "Goal deleted", body: goal.title, tone: "warn" });
          }}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-rust/10 hover:text-rust"
        >
          <IconTrash size={14} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 pl-[30px]">
        <input
          value={goal.description ?? ""}
          onChange={(e) =>
            dispatch({
              type: "PATCH_GOAL",
              goalId: goal.id,
              patch: { description: e.target.value },
            })
          }
          placeholder="Description (optional)"
          className="min-w-0 flex-1 rounded-md border border-line bg-well/60 px-2.5 py-1.5 text-xs text-ink outline-none placeholder:text-ink-faint focus:border-pine focus:bg-panel"
        />
        <input
          type="date"
          value={goal.targetDate ?? ""}
          onChange={(e) =>
            dispatch({
              type: "PATCH_GOAL",
              goalId: goal.id,
              patch: { targetDate: e.target.value || null },
            })
          }
          aria-label="Target date"
          className="rounded-md border border-line bg-well/60 px-2.5 py-1.5 font-mono text-[11px] text-ink outline-none focus:border-pine focus:bg-panel"
        />
      </div>
    </div>
  );
}
