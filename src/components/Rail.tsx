import { differenceInCalendarDays, format } from "date-fns";
import { useState, type FormEvent } from "react";
import { useStore } from "../lib/store";
import { enableNotifications, notificationsSupported, notify } from "../lib/notify";
import type { Goal } from "../types";
import { Switch } from "./ui";
import {
  IconBell,
  IconPause,
  IconPlay,
  IconPlus,
  IconSpark,
  IconStarFilled,
  IconTrash,
} from "./icons";

/* ---------------- goals ---------------- */

export function GoalsCard({ onOpenGoals }: { onOpenGoals: () => void }) {
  const { state, dispatch, pushToast } = useStore();
  const [title, setTitle] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: t,
      active: true,
      isPrimary: state.goals.length === 0,
      targetDate: null,
      createdAt: Date.now(),
    };
    dispatch({ type: "ADD_GOAL", goal });
    setTitle("");
    pushToast({ title: "Goal locked in", body: `${t} is now part of the scoring.`, tone: "ok" });
  };

  const daysUntil = (d: string) => differenceInCalendarDays(new Date(d), new Date());

  return (
    <section className="card anim-rise p-4" style={{ animationDelay: "120ms" }}>
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-extrabold tracking-tight">Your goals</h2>
        <span className="chip border-ink/20 bg-canvas/70">
          {state.goals.filter((g) => g.active).length} active
        </span>
        <button
          onClick={onOpenGoals}
          className="label-mono ml-auto cursor-pointer text-ink/45 underline decoration-2 decoration-canvas underline-offset-4 transition-colors hover:text-ink"
        >
          manage
        </button>
      </div>

      <div className="mt-2">
        {state.goals.length === 0 && (
          <p className="rounded-lg border-2 border-dashed border-ink/20 px-3 py-4 text-center text-sm text-ink/50">
            No goals yet. Add one — everything gets scored against it.
          </p>
        )}
        {state.goals.map((g) => (
          <div
            key={g.id}
            className={`group flex items-start gap-2.5 border-t-2 border-dashed border-line py-2.5 first:border-t-0 ${
              g.active ? "" : "opacity-45"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold">{g.title}</p>
                {g.isPrimary && (
                  <span className="chip -rotate-2 border-ink bg-canvas text-ink">★ primary</span>
                )}
                {!g.active && <span className="chip border-ink/25 text-ink/45">paused</span>}
              </div>
              {g.targetDate && (
                <p
                  className={`mt-0.5 font-mono text-[10px] ${
                    daysUntil(g.targetDate) < 14 ? "font-bold text-coral" : "text-ink/45"
                  }`}
                >
                  {daysUntil(g.targetDate) >= 0
                    ? `target ${format(new Date(g.targetDate), "MMM d")} · ${daysUntil(g.targetDate)}d left`
                    : `target passed ${format(new Date(g.targetDate), "MMM d")}`}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                title={g.isPrimary ? "Primary goal" : "Make primary"}
                onClick={() => {
                  if (!g.isPrimary) dispatch({ type: "SET_PRIMARY_GOAL", goalId: g.id });
                }}
                className={`grid h-7 w-7 cursor-pointer place-items-center rounded-lg border-2 transition-all ${
                  g.isPrimary
                    ? "border-ink bg-canvas shadow-[2px_2px_0_var(--color-ink)]"
                    : "border-ink/15 text-ink/35 hover:border-ink hover:text-ink"
                }`}
              >
                <IconStarFilled size={14} />
              </button>
              <button
                title={g.active ? "Pause goal" : "Resume goal"}
                onClick={() =>
                  dispatch({ type: "PATCH_GOAL", goalId: g.id, patch: { active: !g.active } })
                }
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/35 transition-all hover:border-ink hover:text-ink"
              >
                {g.active ? <IconPause size={13} /> : <IconPlay size={13} />}
              </button>
              <button
                title="Delete goal"
                onClick={() => dispatch({ type: "DELETE_GOAL", goalId: g.id })}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/35 opacity-0 transition-all group-hover:opacity-100 hover:border-coral hover:bg-coral/10 hover:text-coral"
              >
                <IconTrash size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-2 flex gap-2 border-t-2 border-ink pt-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New goal… e.g. land a DevOps internship"
          aria-label="New goal"
          className="min-w-0 flex-1 rounded-lg border-2 border-ink bg-paper px-3 py-2 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-ink/35 focus:bg-canvas/30"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="btn-ink shrink-0 px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <IconPlus size={15} />
        </button>
      </form>
      <p className="label-mono mt-2 text-ink/35">★ primary goal gets the biggest weight</p>
    </section>
  );
}

/* ---------------- engine + push signals ---------------- */

export function EngineCard({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { state, dispatch, pushToast } = useStore();
  const [notifOn, setNotifOn] = useState(state.settings.notificationsEnabled);
  const aiOn = !!state.settings.aiKey.trim();

  const weights = [
    { k: "goal fit", v: "+28", c: "text-mint" },
    { k: "impact", v: "+24", c: "text-cobalt" },
    { k: "urgency", v: "+34", c: "text-coral" },
    { k: "time fit", v: "+14", c: "text-lilac" },
    { k: "penalties", v: "−…", c: "text-fog-dim" },
  ];

  const toggleNudges = async (v: boolean) => {
    if (v) {
      if (!notificationsSupported()) {
        pushToast({
          title: "Notifications unavailable here",
          body: "This browser context doesn't expose the Notification API. The push plumbing is still wired for production.",
          tone: "warn",
        });
        return;
      }
      const res = await enableNotifications();
      if (res !== "granted") {
        pushToast({
          title: "Permission not granted",
          body: "Allow notifications in your browser settings to get nudges.",
          tone: "warn",
        });
        return;
      }
      void notify("Focal is on", "We'll nudge you about overdue work and priority swaps.", "focal-hello");
    }
    setNotifOn(v);
    dispatch({ type: "PATCH_SETTINGS", patch: { notificationsEnabled: v } });
    pushToast({
      title: v ? "Nudges on" : "Nudges off",
      body: v ? "Rule-based — no spam, ever." : "You're flying solo.",
      tone: v ? "ok" : "info",
    });
  };

  const perm = notificationsSupported() ? Notification.permission : "unsupported";

  return (
    <section className="card-dark anim-rise p-4" style={{ animationDelay: "180ms" }}>
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg font-extrabold tracking-tight text-paper">The engine</h2>
        <span
          className={`chip ml-auto ${
            aiOn ? "border-mint/50 bg-mint/15 text-mint" : "border-lilac/50 bg-lilac/15 text-lilac"
          }`}
        >
          {aiOn ? (
            <>
              <IconSpark size={11} /> groq llm
            </>
          ) : (
            "heuristics"
          )}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-fog-dim">
        An LLM reads <em>meaning</em> (optional). The ranking math is always deterministic:
      </p>

      <div className="mt-3 space-y-1.5">
        {weights.map((w) => (
          <div
            key={w.k}
            className="flex items-center justify-between rounded-lg bg-white/[0.05] px-2.5 py-1.5"
          >
            <span className="font-mono text-[11px] text-fog-dim">{w.k}</span>
            <span className={`font-mono text-[11px] font-bold ${w.c}`}>{w.v}</span>
          </div>
        ))}
      </div>

      <button onClick={onOpenSettings} className="btn-yellow mt-3 w-full py-2 text-sm font-bold">
        <IconSpark size={15} /> {aiOn ? "Manage AI key" : "Plug in Groq (optional)"}
      </button>

      <div className="mt-4 border-t-2 border-dashed border-fog/15 pt-4">
        <div className="flex items-center gap-2">
          <IconBell size={15} className="text-fog-dim" />
          <span className="label-mono text-fog-dim">push signals</span>
          <span className="ml-auto">
            <Switch checked={notifOn} onChange={toggleNudges} label="Enable nudges" />
          </span>
        </div>
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-fog-faint">
          {perm === "granted" && notifOn
            ? "ready — nudges fire for overdue #1s, priority swaps & avoidance loops."
            : perm === "denied"
              ? "blocked in browser settings — the service worker is still registered for real push later."
              : perm === "unsupported"
                ? "unavailable in this context — service worker + push subscription plumbing is wired for production."
                : "flip the switch to allow nudges."}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {["overdue #1", "new #1", "avoidance loop"].map((r) => (
            <span key={r} className="chip border-fog/20 text-fog-faint">
              {r}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
