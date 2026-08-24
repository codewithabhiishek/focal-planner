import { IconGear, IconReticle } from "./icons";

export function Header({ onSettings }: { onSettings: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex h-12 sm:h-14 max-w-3xl items-center justify-between px-3 sm:px-6">
        {/* Brand container */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary text-primary-foreground shadow-hard-faint">
            <IconReticle size={16} className="sm:hidden" />
            <IconReticle size={18} className="hidden sm:block" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-ink">
              Focal
            </span>
            <span className="hidden font-mono text-[11px] font-medium text-ink-muted sm:inline-block">
              · one question, one answer
            </span>
          </div>
        </div>

        <button
          onClick={onSettings}
          aria-label="Setup & settings"
          title="Setup — goals, signals, scoring"
          className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg sm:rounded-xl border border-line bg-surface text-ink-secondary shadow-hard-faint transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/40 hover:text-ink hover:rotate-45 active:scale-95"
        >
          <IconGear size={15} className="sm:hidden" />
          <IconGear size={17} className="hidden sm:block" />
        </button>
      </div>
    </header>
  );
}
