import { differenceInCalendarDays, format } from "date-fns";
import { useState, type FormEvent, type ReactNode } from "react";
import type { Goal } from "../types";
import { useStore } from "../lib/store";
import { enableNotifications, notificationsSupported, notify } from "../lib/notify";
import { Switch } from "./ui";
import {
  IconBell,
  IconChevron,
  IconInfo,
  IconPause,
  IconPlay,
  IconPlus,
  IconSpark,
  IconStarFilled,
  IconTarget,
  IconTrash,
  IconUndo,
} from "./icons";

const MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "openai/gpt-oss-120b",
];

function Section({
  n,
  title,
  icon,
  sub,
  children,
}: {
  n: number;
  title: string;
  icon: ReactNode;
  sub: string;
  children: ReactNode;
}) {
  return (
    <section className="card anim-rise p-4 sm:p-5" style={{ animationDelay: `${n * 60}ms` }}>
      <div className="flex items-center gap-3">
        <span className="sticker grid h-9 w-9 shrink-0 place-items-center bg-canvas font-display text-base font-extrabold">
          {n}
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
            {icon}
            {title}
          </h2>
          <p className="label-mono mt-0.5 text-ink/45">{sub}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const { state, dispatch, pushToast } = useStore();
  const s = state.settings;
  const aiOn = !!s.aiKey.trim();

  /* goals */
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const addGoal = (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: t,
      targetDate: date || null,
      active: true,
      isPrimary: state.goals.length === 0,
      createdAt: Date.now(),
    };
    dispatch({ type: "ADD_GOAL", goal });
    setTitle("");
    setDate("");
    pushToast({ title: "Goal locked in", body: `${t} is now part of the scoring.`, tone: "ok" });
  };
  const daysUntil = (d: string) => differenceInCalendarDays(new Date(d), new Date());

  /* signals */
  const [notifOn, setNotifOn] = useState(s.notificationsEnabled);
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
  const perm = notificationsSupported() ? Notification.permission : "unsupported";

  /* data */
  const [confirmClear, setConfirmClear] = useState(false);

  const weights = [
    { k: "goal fit", v: "+28", c: "text-mint" },
    { k: "impact", v: "+24", c: "text-cobalt" },
    { k: "urgency", v: "+34", c: "text-coral" },
    { k: "time fit", v: "+14", c: "text-lilac" },
    { k: "penalties", v: "−…", c: "text-ink/45" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      {/* page header */}
      <div className="anim-rise flex items-center gap-3">
        <button onClick={onBack} className="btn-ghost px-3 py-2 text-sm">
          <IconChevron size={15} className="rotate-180" /> Focus
        </button>
        <div className="ml-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Setup</h1>
          <p className="label-mono text-ink/45">the engine room — nothing here is required</p>
        </div>
        <span
          className={`chip ml-auto ${aiOn ? "border-mint/50 bg-mint/15 text-mint" : "border-lilac/50 bg-lilac/15 text-lilac"}`}
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

      <div className="mt-6 grid gap-5">
        {/* 1 — goals */}
        <Section n={1} title="Goals" icon={<IconTarget size={17} className="text-mint" />} sub="what everything gets scored against">
          {state.goals.length === 0 && (
            <p className="rounded-lg border-2 border-dashed border-ink/20 px-3 py-4 text-center text-sm text-ink/50">
              No goals yet — tasks score fine, but a goal makes the ranking personal.
            </p>
          )}
          <div>
            {state.goals.map((g) => (
              <div
                key={g.id}
                className={`group flex items-start gap-2.5 border-t-2 border-dashed border-line py-2.5 first:border-t-0 ${
                  g.active ? "" : "opacity-45"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
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
                    className={`grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 transition-all lg:h-7 lg:w-7 ${
                      g.isPrimary
                        ? "border-ink bg-canvas shadow-[2px_2px_0_var(--shadow-ink)]"
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
                    className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/35 transition-all hover:border-ink hover:text-ink lg:h-7 lg:w-7"
                  >
                    {g.active ? <IconPause size={13} /> : <IconPlay size={13} />}
                  </button>
                  <button
                    title="Delete goal"
                    onClick={() => dispatch({ type: "DELETE_GOAL", goalId: g.id })}
                    className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border-2 border-ink/15 text-ink/35 transition-all hover:border-coral hover:bg-coral/10 hover:text-coral lg:h-7 lg:w-7"
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={addGoal} className="mt-2 grid gap-2 border-t-2 border-ink pt-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="New goal… e.g. land a DevOps internship"
              aria-label="New goal title"
              className="field"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Target date (optional)"
              className="field w-auto"
            />
            <button type="submit" disabled={!title.trim()} className="btn-ink px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
              <IconPlus size={15} /> Add
            </button>
          </form>
          <p className="label-mono mt-2 text-ink/35">★ the primary goal gets the biggest weight in every score</p>
        </Section>

        {/* 2 — AI provider */}
        <Section n={2} title="AI provider" icon={<IconSpark size={17} className="text-lilac" />} sub="optional — meaning reading, not math">
          <p className="text-xs leading-relaxed text-ink/60">
            Without a key, Focal runs on its built-in heuristic engine — fully functional, fully
            offline. With a Groq key, an LLM reads task <em>meaning</em>, goal fit and impact.
            Deadlines, blocks and time windows stay deterministic either way. The key lives only
            in this browser.
          </p>
          <input
            type="password"
            value={s.aiKey}
            onChange={(e) => dispatch({ type: "PATCH_SETTINGS", patch: { aiKey: e.target.value } })}
            placeholder="gsk_…"
            aria-label="Groq API key"
            className="field mt-3 font-mono text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MODELS.map((m) => (
              <button
                key={m}
                onClick={() => dispatch({ type: "PATCH_SETTINGS", patch: { aiModel: m } })}
                className={`chip cursor-pointer transition-colors ${
                  s.aiModel === m
                    ? "border-ink bg-ink text-canvas"
                    : "border-ink/25 bg-paper text-ink/60 hover:border-ink hover:text-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="label-mono mt-2 text-ink/35">
            {aiOn ? "active — new & existing tasks get LLM analysis" : "get a key at console.groq.com → paste → done"}
          </p>
        </Section>

        {/* 3 — signals */}
        <Section n={3} title="Signals" icon={<IconBell size={17} className="text-cobalt" />} sub="nudges, not noise">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Browser nudges</span>
            <span className="ml-auto">
              <Switch checked={notifOn} onChange={(v) => void toggleNudges(v)} label="Enable nudges" />
            </span>
          </div>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-ink/45">
            {perm === "granted" && notifOn
              ? "ready — nudges fire for overdue #1s, priority swaps & avoidance loops."
              : perm === "denied"
                ? "blocked in browser settings — the service worker is still registered for real push later."
                : perm === "unsupported"
                  ? "unavailable in this context — service worker + push subscription plumbing is wired for production."
                  : "flip the switch to allow nudges."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {["overdue #1", "new #1", "avoidance loop"].map((r) => (
              <span key={r} className="chip border-ink/20 text-ink/50">
                {r}
              </span>
            ))}
            <button onClick={() => void testNudge()} className="btn-ghost ml-auto px-3 py-1.5 text-xs">
              <IconBell size={13} /> Send test nudge
            </button>
          </div>
        </Section>

        {/* 4 — scoring */}
        <Section n={4} title="How the score works" icon={<IconInfo size={17} className="text-coral" />} sub="deterministic, inspectable, boring on purpose">
          <div className="space-y-1.5">
            {weights.map((w) => (
              <div key={w.k} className="flex items-center justify-between rounded-lg bg-canvas/70 px-3 py-2">
                <span className="font-mono text-[11px] text-ink/60">{w.k}</span>
                <span className={`font-mono text-[11px] font-bold ${w.c}`}>{w.v}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink/45">
            signal = goal fit + impact + urgency + time fit − postpone/blocked penalties. Open
            “why this score” on any pick to see the live numbers.
          </p>
        </Section>

        {/* 5 — data */}
        <Section n={5} title="Data" icon={<IconTrash size={17} className="text-honey" />} sub="stored locally in this browser">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                dispatch({ type: "LOAD_SAMPLE" });
                pushToast({ title: "Sample loaded", body: "A realistic day, re-ranked live.", tone: "ok" });
              }}
              className="btn-yellow px-4 py-2 text-sm"
            >
              <IconUndo size={14} /> Load sample day
            </button>
            {confirmClear ? (
              <span className="inline-flex items-center gap-1.5">
                <button
                  onClick={() => {
                    dispatch({ type: "CLEAR_ALL" });
                    setConfirmClear(false);
                    pushToast({ title: "Fresh start", body: "Everything's wiped. The question remains.", tone: "warn" });
                  }}
                  className="btn-coral px-4 py-2 text-sm"
                >
                  Yes, wipe it
                </button>
                <button onClick={() => setConfirmClear(false)} className="btn-ghost px-3 py-2 text-sm">
                  Keep it
                </button>
              </span>
            ) : (
              <button onClick={() => setConfirmClear(true)} className="btn-ghost px-4 py-2 text-sm">
                <IconTrash size={14} /> Clear everything
              </button>
            )}
          </div>
          <p className="label-mono mt-3 text-ink/35">
            no account, no cloud — goals & tasks persist in localStorage only
          </p>
        </Section>
      </div>

      <footer className="mt-10 pb-8 text-center">
        <button onClick={onBack} className="label-mono cursor-pointer text-ink/50 underline decoration-2 decoration-canvas underline-offset-4 transition-colors hover:text-ink">
          ← back to the one question
        </button>
      </footer>
    </div>
  );
}
