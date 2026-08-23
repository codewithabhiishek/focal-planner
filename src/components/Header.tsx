import { IconGear, IconReticle } from "./icons";

export function Header({ onSettings }: { onSettings: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-2.5 px-4 sm:px-6">
        <span className="sticker grid h-9 w-9 place-items-center bg-ink text-canvas">
          <IconReticle size={20} />
        </span>
        <span className="font-display text-[22px] font-extrabold tracking-tight">Focal</span>
        <span className="label-mono ml-2 hidden text-ink/40 md:block">
          one question · one answer
        </span>
        <button
          onClick={onSettings}
          aria-label="Setup & settings"
          title="Setup — goals, AI key, signals"
          className="sticker ml-auto grid h-9 w-9 cursor-pointer place-items-center bg-paper text-ink transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-45"
        >
          <IconGear size={17} />
        </button>
      </div>
    </header>
  );
}
