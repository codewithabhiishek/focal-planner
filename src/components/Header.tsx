import { useStore } from "../lib/store";
import { IconGear, IconReticle, IconSpark } from "./icons";

export function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { state } = useStore();
  const aiOn = !!state.settings.aiKey.trim();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="sticker grid h-9 w-9 place-items-center bg-ink text-canvas">
            <IconReticle size={20} />
          </span>
          <span className="font-display text-[22px] font-extrabold tracking-tight">
            Focal
          </span>
          <span className="chip -rotate-2 border-ink bg-coral text-paper">beta</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            className="chip hidden border-ink/25 bg-paper text-ink/70 sm:inline-flex"
            title="Where task understanding comes from"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${aiOn ? "pulse-dot bg-mint" : "bg-lilac"}`}
            />
            {aiOn ? (
              <>
                <IconSpark size={11} /> groq · {state.settings.aiModel.split("-").slice(0, 2).join("-")}
              </>
            ) : (
              "heuristic engine"
            )}
          </span>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="sticker grid h-9 w-9 cursor-pointer place-items-center bg-paper text-ink transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-45"
          >
            <IconGear size={17} />
          </button>
        </div>
      </div>

      {/* living ticker */}
      <div className="overflow-hidden border-t-2 border-ink bg-ink py-1.5" aria-hidden>
        <div className="anim-marquee flex w-max items-center gap-8 font-mono text-[11px] font-bold tracking-[0.22em] text-canvas uppercase">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex items-center gap-8">
              <span>what's the one thing?</span>
              <span className="text-coral">✦</span>
              <span>dump tasks — we rank them</span>
              <span className="text-mint">✦</span>
              <span>goals × deadlines × time</span>
              <span className="text-lilac">✦</span>
              <span>stop doomscrolling your todo list</span>
              <span className="text-sky">✦</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
