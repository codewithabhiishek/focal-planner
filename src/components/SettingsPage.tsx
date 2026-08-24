import { differenceInCalendarDays, format } from "date-fns";
import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import type { Goal } from "../types";
import { useStore } from "../lib/store";
import {
  enableNotifications,
  isIOS,
  isStandalone,
  notificationsSupported,
  notify,
} from "../lib/notify";
import { Switch } from "./ui";
import {
  IconBell,
  IconCheck,
  IconChevron,
  IconInfo,
  IconPause,
  IconPlay,
  IconPlus,
  IconReticle,
  IconSpark,
  IconStarFilled,
  IconTarget,
  IconTrash,
  IconUndo,
} from "./icons";

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
    <section className="card anim-rise p-3.5 sm:p-5" style={{ animationDelay: `${n * 60}ms` }}>
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className="sticker grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center bg-surface-2 font-display text-sm sm:text-base font-extrabold text-ink">
          {n}
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-base sm:text-lg font-extrabold tracking-tight">
            {icon}
            {title}
          </h2>
          <p className="label-mono mt-0.5 text-ink-muted">{sub}</p>
        </div>
      </div>
      <div className="mt-3 sm:mt-4">{children}</div>
    </section>
  );
}

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const { state, dispatch, pushToast } = useStore();
  const s = state.settings;
  const [backendConfigured, setBackendConfigured] = useState(false);

  useEffect(() => {
    fetch("/api/groq")
      .then((r) => r.json())
      .then((data) => {
        if (data?.configured) setBackendConfigured(true);
      })
      .catch(() => {});
  }, []);

  const aiOn = backendConfigured || !!s.aiKey.trim();

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
      if (isIOS() && !isStandalone()) {
        pushToast({
          title: "Add to Home Screen first",
          body: "On iPhone, tap Share (📤) → 'Add to Home Screen', then open Focal from your Home Screen to enable notifications.",
          tone: "warn",
        });
        return;
      }
      if (!notificationsSupported()) {
        pushToast({
          title: "Notifications unavailable",
          body: "This browser does not support the Web Notification API.",
          tone: "warn",
        });
        return;
      }
      const res = await enableNotifications();
      if (res !== "granted") {
        pushToast({
          title: "Permission not granted",
          body: "Allow notifications in your browser or device settings.",
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
    if (isIOS() && !isStandalone()) {
      pushToast({
        title: "Add to Home Screen first",
        body: "Open Focal from your Home Screen to test iPhone notifications.",
        tone: "warn",
      });
      return;
    }
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
    { k: "Goal Fit", v: "+28", c: "text-primary" },
    { k: "Impact", v: "+24", c: "text-cobalt" },
    { k: "Urgency", v: "+34", c: "text-warning" },
    { k: "Time Fit", v: "+14", c: "text-lilac" },
    { k: "Penalties", v: "−…", c: "text-ink-muted" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 sm:px-6 sm:py-6">
      {/* page header */}
      <div className="anim-rise flex items-center gap-2.5 sm:gap-3">
        <button onClick={onBack} className="btn-ghost px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm">
          <IconChevron size={14} className="rotate-180" /> Focus
        </button>
        <div className="ml-1">
          <h1 className="font-display text-xl sm:text-3xl font-extrabold tracking-tight">Setup</h1>
          <p className="label-mono text-ink-muted">the engine room — nothing here is required</p>
        </div>
        <span
          className={`chip ml-auto ${aiOn ? "border-success/35 bg-success/10 text-success" : "border-later/35 bg-later/10 text-later"}`}
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

      <div className="mt-4 sm:mt-6 grid gap-3.5 sm:gap-5">
        {/* 1 — appearance */}
        <Section n={1} title="Appearance" icon={<IconReticle size={17} className="text-primary" />} sub="light or dark — applied instantly, remembered">
          <div className="grid grid-cols-2 gap-3">
            {(["light", "dark"] as const).map((m) => {
              const active = s.theme === m;
              const lite = m === "light";
              return (
                <button
                  key={m}
                  aria-pressed={active}
                  onClick={() => {
                    dispatch({ type: "PATCH_SETTINGS", patch: { theme: m } });
                    document.documentElement.setAttribute("data-theme", m);
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95 ${
                    active
                      ? "border-primary bg-primary/[0.08] text-ink shadow-hard-faint ring-1 ring-primary/20 scale-[1.02]"
                      : "border-line bg-surface text-ink-secondary hover:border-ink/40 hover:bg-surface-2 hover:shadow-hard-faint"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-lg border transition-transform duration-200 ${
                      lite
                        ? "border-line bg-[#ffffff] text-[#0a0a0a]"
                        : "border-[#262626] bg-[#0a0a0a] text-[#ffffff]"
                    }`}
                  >
                    {lite ? "☀️" : "🌙"}
                  </span>
                  <span className="font-display text-sm font-bold">
                    {lite ? "Light · snow" : "Dark · OLED black"}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* 2 — goals */}
        <Section n={2} title="Goals" icon={<IconTarget size={17} className="text-success" />} sub="what everything gets scored against">
          {state.goals.length === 0 && (
            <p className="rounded-lg border border-dashed border-line bg-surface-2/40 px-3 py-4 text-center text-sm text-ink-muted">
              No goals yet — tasks score fine, but a goal makes the ranking personal.
            </p>
          )}
          <div>
            {state.goals.map((g) => (
              <div
                key={g.id}
                className={`group flex items-start gap-2.5 border-t border-dashed border-line py-2.5 first:border-t-0 ${
                  g.active ? "" : "opacity-65"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold">{g.title}</p>
                    {g.isPrimary && (
                      <span className="chip border-primary/40 bg-primary/10 text-primary">★ primary</span>
                    )}
                    {!g.active && <span className="chip border-line bg-surface-2 text-ink-muted">paused</span>}
                  </div>
                  {g.targetDate && (
                    <p
                      className={`mt-0.5 font-mono text-[10px] ${
                        daysUntil(g.targetDate) < 14 ? "font-bold text-coral" : "text-ink-muted"
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
                    className={`grid h-9 w-9 cursor-pointer place-items-center rounded-lg border transition-all duration-150 hover:scale-110 active:scale-90 lg:h-7 lg:w-7 ${
                      g.isPrimary
                        ? "border-primary bg-primary text-primary-foreground shadow-hard-faint"
                        : "border-line text-ink-muted hover:border-ink/40 hover:text-ink"
                    }`}
                  >
                    <IconStarFilled size={14} />
                  </button>
                  <button
                    title={g.active ? "Pause goal" : "Resume goal"}
                    onClick={() =>
                      dispatch({ type: "PATCH_GOAL", goalId: g.id, patch: { active: !g.active } })
                    }
                    className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-line text-ink-muted transition-all duration-150 hover:scale-110 hover:border-ink/40 hover:text-ink active:scale-90 lg:h-7 lg:w-7"
                  >
                    {g.active ? <IconPause size={13} /> : <IconPlay size={13} />}
                  </button>
                  <button
                    title="Delete goal"
                    onClick={() => dispatch({ type: "DELETE_GOAL", goalId: g.id })}
                    className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg border border-line text-ink-muted transition-all duration-150 hover:scale-110 hover:border-danger hover:bg-danger/10 hover:text-danger active:scale-90 lg:h-7 lg:w-7"
                  >
                    <IconTrash size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={addGoal} className="mt-2 grid gap-2 border-t border-line pt-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a goal…"
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
            <button type="submit" disabled={!title.trim()} className="btn-ink h-9 px-3.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">
              <IconPlus size={14} /> Add
            </button>
          </form>
          <p className="label-mono mt-2 text-ink-faint">★ the primary goal gets the biggest weight in every score</p>
        </Section>

        {/* 3 — signals */}
        <Section n={3} title="Signals" icon={<IconBell size={17} className="text-cobalt" />} sub="nudges, not noise">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Device & browser nudges</span>
            <span className="ml-auto">
              <Switch checked={notifOn} onChange={(v) => void toggleNudges(v)} label="Enable nudges" />
            </span>
          </div>

          {isIOS() && !isStandalone() ? (
            <div className="mt-3 rounded-xl border border-primary/30 bg-primary/[0.07] p-3 text-xs leading-relaxed text-ink">
              <p className="flex items-center gap-1.5 font-bold text-primary">
                📱 iPhone & iPad Setup:
              </p>
              <p className="mt-1 text-ink-secondary">
                Apple requires installing web apps to your Home Screen before enabling notifications:
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 font-medium text-ink">
                <li>Tap the <strong>Share</strong> button (📤) in your Safari toolbar</li>
                <li>Tap <strong>Add to Home Screen</strong> (➕)</li>
                <li>Open <strong>Focal</strong> from your Home Screen to enable notifications</li>
              </ol>
            </div>
          ) : (
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-ink-muted">
              {perm === "granted" && notifOn
                ? "ready — nudges fire for overdue #1s, priority swaps & avoidance loops."
                : perm === "denied"
                  ? "blocked in browser settings — enable notifications in your browser or device settings."
                  : "flip the switch to allow nudges."}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {["overdue #1", "new #1", "avoidance loop"].map((r) => (
              <span key={r} className="chip border-line bg-surface-2 text-ink-muted">
                {r}
              </span>
            ))}
            <button onClick={() => void testNudge()} className="btn-ghost ml-auto px-3 py-1.5 text-xs">
              <IconBell size={13} /> Send test nudge
            </button>
          </div>
        </Section>

        {/* 4 — scoring */}
        <Section n={4} title="How the score works" icon={<IconInfo size={17} className="text-warning" />} sub="Deterministic, inspectable, boring on purpose">
          <div className="space-y-1.5">
            {weights.map((w) => (
              <div key={w.k} className="flex items-center justify-between rounded-lg border border-line bg-surface-2/60 px-3 py-2">
                <span className="font-mono text-[11px] font-medium text-ink-secondary">{w.k}</span>
                <span className={`font-mono text-[11px] font-bold ${w.c}`}>{w.v}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-muted">
            Signal = Goal Fit + Impact + Urgency + Time Fit − Postpone / Blocked penalties. Open
            “Why this score” on any pick to see the live numbers.
          </p>
        </Section>

        {/* 5 — data */}
        <Section n={5} title="Data" icon={<IconTrash size={17} className="text-danger" />} sub="stored locally in this browser">
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
          <p className="label-mono mt-3 text-ink-faint">
            no account, no cloud — goals & tasks persist in localStorage only
          </p>
        </Section>
      </div>

      <footer className="mt-10 pb-8 text-center">
        <button onClick={onBack} className="label-mono cursor-pointer text-ink-muted underline decoration-line decoration-2 underline-offset-4 transition-colors hover:text-ink">
          ← back to the one question
        </button>
      </footer>
    </div>
  );
}
