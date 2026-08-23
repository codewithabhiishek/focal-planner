import { IconGear, IconReticle } from "./icons";

export function Header({ onSettings }: { onSettings: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
        {/* Brand container */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-hard-faint">
            <IconReticle size={18} />
          </span>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-display text-xl font-extrabold tracking-tight text-ink leading-none">
              Focal
            </span>
            <span className="hidden font-mono text-[11px] font-medium tracking-wide text-ink-muted sm:inline-block leading-none">
              · one question, one answer
            </span>
          </div>
        </div>

        <button
          onClick={onSettings}
          aria-label="Setup & settings"
          title="Setup — goals, signals, scoring"
          className="flex h-8.5 w-8.5 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/40 hover:text-ink hover:rotate-45"
        >
          <IconGear size={17} />
        </button>
      </div>
    </header>
  );
}
