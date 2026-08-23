import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import type { Category } from "../types";
import type { Toast } from "../lib/store";
import {
  IconCheckCircle,
  IconClock,
  IconFire,
  IconInfo,
  IconPin,
  IconSend,
  IconStar4,
  IconTrash,
  IconX,
} from "./icons";

/* ---------------- category sticker badges ---------------- */

export const CATEGORY_STYLE: Record<
  Category,
  { label: string; cls: string; icon: (p: { size?: number }) => ReactNode }
> = {
  DO_NOW: {
    label: "Do now",
    cls: "border-primary/30 bg-primary/10 text-primary",
    icon: (p) => <IconFire {...p} />,
  },
  SOON: {
    label: "Soon",
    cls: "border-info/30 bg-info/10 text-info",
    icon: (p) => <IconPin {...p} />,
  },
  LATER: {
    label: "Later",
    cls: "border-later/30 bg-later/10 text-later",
    icon: (p) => <IconClock {...p} />,
  },
  DELEGATE: {
    label: "Delegate",
    cls: "border-delegate/30 bg-delegate/10 text-delegate",
    icon: (p) => <IconSend {...p} />,
  },
  DROP: {
    label: "Drop",
    cls: "border-rose/30 bg-rose/10 text-rose",
    icon: (p) => <IconTrash {...p} />,
  },
};

export function CategoryBadge({
  category,
  size = "sm",
}: {
  category: Category;
  size?: "xs" | "sm";
}) {
  const meta = CATEGORY_STYLE[category];
  return (
    <span
      className={`chip ${meta.cls} ${size === "xs" ? "px-1.5! py-0! text-[9px]!" : ""}`}
    >
      {meta.icon({ size: size === "xs" ? 10 : 11 })}
      {meta.label}
    </span>
  );
}

/* ---------------- chips ---------------- */

export function Chip({
  children,
  icon,
  tone = "line",
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: "line" | "primary" | "danger" | "warning" | "success" | "info" | "dark" | "paper";
  title?: string;
}) {
  const tones: Record<string, string> = {
    line: "border-line text-ink/60",
    primary: "border-primary/30 bg-primary/10 text-primary",
    danger: "border-danger/30 bg-danger/10 text-danger",
    warning: "border-warning/35 bg-warning/10 text-warning",
    success: "border-success/30 bg-success/10 text-success",
    info: "border-info/30 bg-info/10 text-info",
    dark: "border-line bg-surface-2 text-ink/60",
    paper: "border-line bg-surface-2 text-ink/60",
  };
  return (
    <span className={`chip ${tones[tone]}`} title={title}>
      {icon}
      {children}
    </span>
  );
}

/* ---------------- modal shell ---------------- */

export function Modal({
  open,
  onClose,
  title,
  kicker,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  kicker?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(21,20,17,0.5)] sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          {/* bottom sheet on phones, centered card on larger screens */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`card relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-b-none border-b-0 rounded-t-[18px] shadow-[var(--shadow-pop)] sm:max-h-[85vh] sm:rounded-[16px] sm:border-b ${
              wide ? "sm:max-w-lg" : "sm:max-w-md"
            }`}
            initial={{ y: 72, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div aria-hidden className="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-ink/15 sm:hidden" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line bg-surface-2 text-ink/55 transition-colors hover:border-ink/30 hover:text-ink sm:h-8 sm:w-8"
            >
              <IconX size={15} />
            </button>
            {(title || kicker) && (
              <div className="shrink-0 px-5 pt-4 sm:pt-5">
                {kicker && (
                  <p className="label-mono pr-10 text-ink/50">
                    {kicker}
                  </p>
                )}
                {title && (
                  <h3 className="mt-1 pr-10 font-display text-2xl font-bold tracking-tight text-balance">
                    {title}
                  </h3>
                )}
              </div>
            )}
            <div className="overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- tactile switch ---------------- */

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
              className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ${
        checked ? "border-primary bg-primary" : "border-line bg-ink/10"
      }`}
    >
      <span
        className={`absolute top-[3px] h-4 w-4 rounded-full bg-surface shadow-hard-xs transition-all duration-200 ${
          checked ? "left-[23px]" : "left-[3px]"
        }`}
      />    </button>
  );
}

/* ---------------- score bar (why-this-score) ---------------- */

export function ScoreBar({
  label,
  value,
  max,
  negative,
  delay = 0,
  color = "bg-mint",
}: {
  label: string;
  value: number;
  max: number;
  negative?: boolean;
  delay?: number;
  color?: string;
}) {
  const pct = Math.min(100, Math.round((Math.abs(value) / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <span className="label-mono w-24 shrink-0 text-ink/55 normal-case tracking-wider">
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full border border-ink/10 bg-ink/[0.06]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${negative ? "bg-danger" : color}`}
        />
      </div>
      <span
        className={`w-11 shrink-0 text-right font-mono text-xs font-bold ${
          negative ? "text-danger" : "text-ink"
        }`}
      >
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

/* ---------------- toasts ---------------- */

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  const iconFor = (t: Toast["tone"]) => {
    const map = {
      ok: { icon: <IconCheckCircle size={16} />, cls: "bg-mint text-paper" },
      info: { icon: <IconInfo size={16} />, cls: "bg-cobalt text-paper" },
      warn: { icon: <IconStar4 size={16} />, cls: "bg-coral text-paper" },
    } as const;
    return map[t];
  };
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[60] flex flex-col gap-2.5 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[340px]">
      <AnimatePresence>
        {toasts.map((t) => {
          const m = iconFor(t.tone);
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: 60 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="card pointer-events-auto flex items-start gap-3 p-3"
            >
              <span
                className={`sticker mt-0.5 grid h-8 w-8 shrink-0 place-items-center ${m.cls}`}
              >
                {m.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold leading-snug">{t.title}</p>
                {t.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink/65">
                    {t.body}
                  </p>
                )}
              </div>
              <button
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 cursor-pointer text-ink/40 transition-colors hover:text-ink"
              >
                <IconX size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
