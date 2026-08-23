import type { ReactNode } from "react";
import type { SubtaskSuggestion, Task } from "../types";
import { Modal } from "./ui";
import {
  IconBlock,
  IconCheck,
  IconClock,
  IconInfo,
  IconPlus,
  IconSend,
  IconSpark,
  IconSplit,
  IconTimer,
  IconTrash,
} from "./icons";

export type NotNowReason = "later" | "unimportant" | "delegate" | "blocked" | "notime";
export type AvoidReason = "big" | "how" | "time" | "notimportant";

/* ---------------- option row ---------------- */

function Option({
  icon,
  cls,
  label,
  note,
  onClick,
}: {
  icon: ReactNode;
  cls: string;
  label: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="btn w-full justify-start gap-3 bg-paper px-3.5 py-3 text-left shadow-hard-faint hover:-translate-y-0.5 hover:shadow-hard-soft"
    >
      <span className={`sticker grid h-9 w-9 shrink-0 place-items-center ${cls}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block font-mono text-[10px] text-ink/45">{note}</span>
      </span>
    </button>
  );
}

/* ---------------- Not Now ---------------- */

export function NotNowModal({
  task,
  onReason,
  onClose,
}: {
  task: Task;
  onReason: (r: NotNowReason) => void;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} kicker="not now — why?" title={task.title}>
      <div className="grid gap-2">
        <Option
          icon={<IconClock size={17} />}
          cls="bg-cobalt/15 text-cobalt"
          label="I'll do it later"
          note="postponed once — score dips a little, it'll resurface"
          onClick={() => onReason("later")}
        />
        <Option
          icon={<IconTrash size={17} />}
          cls="bg-ink/10 text-ink/60"
          label="Not important anymore"
          note="strikes its importance — sinks in the ranking"
          onClick={() => onReason("unimportant")}
        />
        <Option
          icon={<IconSend size={17} />}
          cls="bg-sky/15 text-sky"
          label="Someone else can do it"
          note="moves it toward the Delegate bucket"
          onClick={() => onReason("delegate")}
        />
        <Option
          icon={<IconBlock size={17} />}
          cls="bg-coral/15 text-coral"
          label="I'm blocked"
          note="parks it out of the way until you unblock"
          onClick={() => onReason("blocked")}
        />
        <Option
          icon={<IconTimer size={17} />}
          cls="bg-lilac/15 text-lilac"
          label="I don't have enough time"
          note="saved for a bigger time window"
          onClick={() => onReason("notime")}
        />
      </div>
    </Modal>
  );
}

/* ---------------- Avoidance ---------------- */

export function AvoidanceModal({
  task,
  onReason,
  onClose,
}: {
  task: Task;
  onReason: (r: AvoidReason) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      kicker={`postponed ×${task.postponeCount} — no shame`}
      title="What's stopping you?"
    >
      <p className="-mt-2 mb-4 rounded-lg border-2 border-dashed border-ink/25 bg-canvas/50 px-3 py-2 text-sm font-semibold">
        “{task.title}”
      </p>
      <div className="grid gap-2">
        <Option
          icon={<IconSplit size={17} />}
          cls="bg-coral/15 text-coral"
          label="The task is too big"
          note="we'll break it into tiny, doable steps"
          onClick={() => onReason("big")}
        />
        <Option
          icon={<IconInfo size={17} />}
          cls="bg-cobalt/15 text-cobalt"
          label="I don't know how to start"
          note="we'll sketch a clear first step for you"
          onClick={() => onReason("how")}
        />
        <Option
          icon={<IconTimer size={17} />}
          cls="bg-lilac/15 text-lilac"
          label="I don't have time"
          note="we'll stop offering it in small windows"
          onClick={() => onReason("time")}
        />
        <Option
          icon={<IconTrash size={17} />}
          cls="bg-ink/10 text-ink/60"
          label="It's not actually important"
          note="drops it — the queue re-ranks without it"
          onClick={() => onReason("notimportant")}
        />
      </div>
    </Modal>
  );
}

/* ---------------- Breakdown ---------------- */

export function BreakdownModal({
  task,
  suggestions,
  busy,
  selected,
  onToggle,
  onRegenerate,
  onAdd,
  onClose,
}: {
  task: Task;
  suggestions: SubtaskSuggestion[];
  busy: boolean;
  selected: Set<number>;
  onToggle: (i: number) => void;
  onRegenerate: () => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      kicker="smaller beats perfect"
      title={`Break down “${task.title}”`}
      wide
    >
      {busy ? (
        <div className="flex items-center justify-center gap-2 py-10">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-canvas"
              style={{
                animation: `floaty 1s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
          <span className="label-mono ml-2 text-ink/50">sketching steps…</span>
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            {suggestions.map((s, i) => {
              const on = selected.has(i);
              return (
                <button
                  key={i}
                  onClick={() => onToggle(i)}
                  className={`btn w-full justify-start gap-3 px-3.5 py-2.5 text-left ${
                    on
                      ? "bg-canvas/60 shadow-hard-faint"
                      : "border-ink/20 bg-paper/60 text-ink/40 shadow-none"
                  }`}
                >
                  <span
                    className={`sticker grid h-7 w-7 shrink-0 place-items-center ${
                      on ? "bg-mint text-paper" : "bg-ink/10 text-ink/40"
                    }`}
                  >
                    {on ? <IconCheck size={14} /> : <span className="font-mono text-xs">{i + 1}</span>}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">{s.title}</span>
                  {s.minutes != null && (
                    <span className="chip shrink-0 border-ink/25 bg-paper text-ink/60">
                      ~{s.minutes}m
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={onAdd}
              disabled={selected.size === 0}
              className="btn-yellow w-full px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:w-auto"
            >
              <IconPlus size={15} /> Add {selected.size} step{selected.size === 1 ? "" : "s"} to queue
            </button>
            <button onClick={onRegenerate} className="btn-ghost px-4 py-2.5 text-sm">
              <IconSpark size={15} /> Shuffle ideas
            </button>
            <p className="label-mono ml-auto text-ink/35">optional — nothing is forced</p>
          </div>
        </>
      )}
    </Modal>
  );
}
