import { useState, type ReactNode } from "react";
import type { Goal, SubtaskSuggestion, Task } from "../types";
import { useStore } from "../lib/store";
import { enableNotifications, notificationsSupported, notify } from "../lib/notify";
import { Modal, Switch } from "./ui";
import {
  IconBlock,
  IconCheck,
  IconClock,
  IconInfo,
  IconPause,
  IconPlay,
  IconPlus,
  IconSend,
  IconSpark,
  IconSplit,
  IconStarFilled,
  IconTimer,
  IconTrash,
  IconX,
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
      className="btn w-full justify-start gap-3 bg-paper px-3.5 py-3 text-left shadow-[3px_3px_0_rgba(26,23,18,0.18)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_rgba(26,23,18,0.22)]"
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
                      ? "bg-canvas/60 shadow-[3px_3px_0_rgba(26,23,18,0.18)]"
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

/* ---------------- Goals manager ---------------- */

export function GoalsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");

  const add = () => {
    const t = title.trim();
    if (!t) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: t,
      description: desc.trim() || undefined,
      targetDate: date || null,
      active: true,
      isPrimary: state.goals.length === 0,
      createdAt: Date.now(),
    };
    dispatch({ type: "ADD_GOAL", goal });
    setTitle("");
    setDesc("");
    setDate("");
  };

  return (
    <Modal open onClose={onClose} kicker="the compass" title="Manage goals" wide>
      <div className="grid gap-2">
        {state.goals.length === 0 && (
          <p className="rounded-lg border-2 border-dashed border-ink/20 px-3 py-4 text-center text-sm text-ink/50">
            No goals yet — tasks score fine, but a goal makes the ranking personal.
          </p>
        )}
        {state.goals.map((g) => (
          <div
            key={g.id}
            className={`rounded-lg border-2 border-ink/15 p-3 ${g.active ? "" : "opacity-50"}`}
          >
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-bold">{g.title}</p>
              <button
                title="Make primary"
                onClick={() => dispatch({ type: "SET_PRIMARY_GOAL", goalId: g.id })}
                className={`grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 transition-all lg:h-7 lg:w-7 ${
                  g.isPrimary
                    ? "border-ink bg-canvas shadow-[2px_2px_0_var(--color-ink)]"
                    : "border-ink/15 text-ink/35 hover:border-ink hover:text-ink"
                }`}
              >
                <IconStarFilled size={14} />
              </button>
              <button
                title={g.active ? "Pause" : "Resume"}
                onClick={() =>
                  dispatch({ type: "PATCH_GOAL", goalId: g.id, patch: { active: !g.active } })
                }
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/35 hover:border-ink hover:text-ink lg:h-7 lg:w-7"
              >
                {g.active ? <IconPause size={13} /> : <IconPlay size={13} />}
              </button>
              <button
                title="Delete"
                onClick={() => dispatch({ type: "DELETE_GOAL", goalId: g.id })}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/35 hover:border-coral hover:bg-coral/10 hover:text-coral lg:h-7 lg:w-7"
              >
                <IconTrash size={13} />
              </button>
            </div>
            {g.description && <p className="mt-1 text-xs text-ink/55">{g.description}</p>}
            <div className="mt-2 flex items-center gap-2">
              <span className="label-mono text-ink/40">target</span>
              <input
                type="date"
                value={g.targetDate ?? ""}
                onChange={(e) =>
                  dispatch({
                    type: "PATCH_GOAL",
                    goalId: g.id,
                    patch: { targetDate: e.target.value || null },
                  })
                }
                className="field w-auto cursor-pointer px-2 py-1 text-xs"
              />
              {g.isPrimary && <span className="chip -rotate-2 border-ink bg-canvas">★ primary</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border-2 border-dashed border-ink/25 p-3">
        <p className="label-mono mb-2 text-ink/50">add a goal</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Title — e.g. Learn Kubernetes"
          className="field"
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            className="field"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Target date"
            className="field w-auto cursor-pointer"
          />
        </div>
        <button
          onClick={add}
          disabled={!title.trim()}
          className="btn-ink mt-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <IconPlus size={15} /> Add goal
        </button>
      </div>
    </Modal>
  );
}

/* ---------------- Settings ---------------- */

const MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-20b"];

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, pushToast } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const s = state.settings;

  const testNudge = async () => {
    if (!notificationsSupported()) {
      pushToast({ title: "Unavailable here", body: "This context has no Notification API.", tone: "warn" });
      return;
    }
    const res = await enableNotifications();
    if (res !== "granted") {
      pushToast({ title: "Permission not granted", body: "Allow notifications in browser settings.", tone: "warn" });
      return;
    }
    void notify("This is a Focal nudge", "Your highest-priority task is waiting.", "focal-test");
  };

  return (
    <Modal open={open} onClose={onClose} kicker="under the hood" title="Settings" wide>
      {/* AI provider */}
      <section>
        <p className="label-mono text-ink/50">AI provider — optional</p>
        <p className="mt-1 text-xs leading-relaxed text-ink/60">
          Without a key, Focal runs on its built-in heuristic engine — fully functional. With a
          Groq key, an LLM reads task meaning, goal fit and impact. The key lives only in your
          browser.
        </p>
        <input
          type="password"
          value={s.aiKey}
          onChange={(e) => dispatch({ type: "PATCH_SETTINGS", patch: { aiKey: e.target.value } })}
          placeholder="gsk_…"
          aria-label="Groq API key"
          className="field mt-2 font-mono text-sm"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MODELS.map((m) => (
            <button
              key={m}
              onClick={() => dispatch({ type: "PATCH_SETTINGS", patch: { aiModel: m } })}
              className={`cursor-pointer rounded-full border-2 px-2.5 py-1 font-mono text-[10px] font-bold transition-all ${
                s.aiModel === m
                  ? "border-ink bg-ink text-canvas"
                  : "border-ink/25 text-ink/55 hover:border-ink hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {s.aiKey.trim() && (
          <p className="label-mono mt-2 flex items-center gap-1.5 text-mint">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-mint" /> key saved — new tasks
            get LLM analysis
          </p>
        )}
      </section>

      {/* notifications */}
      <section className="mt-5 border-t-2 border-dashed border-line pt-4">
        <div className="flex items-center gap-2">
          <p className="label-mono text-ink/50">push signals</p>
          <span className="ml-auto">
            <Switch
              checked={s.notificationsEnabled}
              label="Enable nudges"
              onChange={async (v) => {
                if (v) {
                  const res = await enableNotifications();
                  if (res !== "granted") {
                    pushToast({ title: "Permission not granted", tone: "warn" });
                    return;
                  }
                }
                dispatch({ type: "PATCH_SETTINGS", patch: { notificationsEnabled: v } });
              }}
            />
          </span>
        </div>
        <p className="mt-1 text-xs text-ink/55">
          Rule-based nudges: overdue #1s, priority swaps, avoidance loops. A service worker is
          registered and push-subscription capture is wired for a backend scheduler.
        </p>
        <button onClick={testNudge} className="btn-ink mt-2 px-4 py-2 text-sm">
          Send test nudge
        </button>
      </section>

      {/* data */}
      <section className="mt-5 border-t-2 border-dashed border-line pt-4">
        <p className="label-mono text-ink/50">data</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => {
              dispatch({ type: "LOAD_SAMPLE" });
              pushToast({ title: "Sample data loaded", tone: "info" });
            }}
            className="btn-ghost px-4 py-2 text-sm"
          >
            Load sample data
          </button>
          <button
            onClick={() => {
              if (!confirmClear) {
                setConfirmClear(true);
                window.setTimeout(() => setConfirmClear(false), 2500);
                return;
              }
              dispatch({ type: "CLEAR_ALL" });
              setConfirmClear(false);
              pushToast({ title: "Wiped clean", body: "Fresh start.", tone: "warn" });
            }}
            className={`btn px-4 py-2 text-sm ${
              confirmClear
                ? "border-coral bg-coral text-paper shadow-[3px_3px_0_var(--color-ink)]"
                : "border-coral/50 bg-coral/10 text-coral shadow-none hover:bg-coral/20"
            }`}
          >
            <IconX size={14} /> {confirmClear ? "Sure? Click again" : "Clear everything"}
          </button>
        </div>
        <p className="label-mono mt-2 text-ink/35">everything is stored locally in your browser</p>
      </section>
    </Modal>
  );
}
