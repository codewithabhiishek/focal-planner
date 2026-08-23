import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import type { Category } from "../types";
import { CATEGORY_META } from "../lib/engine";
import type { Toast } from "../lib/store";
import { IconCheckCircle, IconInfo, IconX } from "./icons";

/* ---------------- category badge ---------------- */

export function CategoryBadge({
  category,
  size = "sm",
}: {
  category: Category;
  size?: "xs" | "sm";
}) {
  const meta = CATEGORY_META[category];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-[0.08em] ${meta.soft} ${
        size === "xs" ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      <span className={`${meta.text} font-medium`}>{meta.label}</span>
    </span>
  );
}

/* ---------------- meta chip ---------------- */

export function Chip({
  icon,
  children,
  tone = "default",
  title,
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: "default" | "warn" | "dark";
  title?: string;
}) {
  const tones = {
    default: "border-line bg-panel text-ink-soft",
    warn: "border-ember/30 bg-ember/10 text-ember",
    dark: "border-night-line bg-night-2/70 text-fog-dim",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px] leading-none ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

/* ---------------- toggle switch ---------------- */

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
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 ${
        checked ? "border-pine bg-pine" : "border-line-strong bg-well"
      }`}
    >
      <span
        className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-panel shadow-sm transition-all duration-200 ${
          checked ? "left-[18px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

/* ---------------- modal shell ---------------- */

export function Modal({
  open,
  onClose,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-night/45 p-4 backdrop-blur-[2px] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`w-full ${width} overflow-hidden rounded-xl border border-line bg-panel shadow-[0_24px_60px_-20px_rgba(13,27,21,0.35)]`}
            initial={{ opacity: 0, y: 26, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-ink">
          {title}
        </h2>
      </div>
      <button
        onClick={onClose}
        aria-label="Close"
        className="rounded-md border border-transparent p-1.5 text-ink-faint transition-colors hover:border-line hover:bg-well hover:text-ink"
      >
        <IconX size={16} />
      </button>
    </div>
  );
}

/* ---------------- score bar (why panel) ---------------- */

export function ScoreBar({
  label,
  value,
  max,
  negative = false,
  delay = 0,
}: {
  label: string;
  value: number;
  max: number;
  negative?: boolean;
  delay?: number;
}) {
  const pct = Math.min(100, Math.round((Math.abs(value) / max) * 100));
  return (
    <div className="grid grid-cols-[92px_1fr_34px] items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-fog-dim">
        {label}
      </span>
      <div className="h-1.5 overflow-hidden rounded-full bg-night-3">
        <motion.div
          className={`h-full rounded-full ${negative ? "bg-rust" : "bg-mint"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span
        className={`text-right font-mono text-[10px] ${negative ? "text-rust" : "text-fog-dim"}`}
      >
        {negative ? `${Math.round(value)}` : `+${Math.round(value)}`}
      </span>
    </div>
  );
}

/* ---------------- toasts ---------------- */

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            onClick={() => onDismiss(t.id)}
            layout
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border border-night-line bg-night px-3.5 py-2.5 text-left shadow-[0_14px_40px_-12px_rgba(13,27,21,0.5)]"
          >
            <span
              className={`mt-0.5 ${
                t.tone === "ok" ? "text-mint" : t.tone === "warn" ? "text-ember" : "text-steel"
              }`}
            >
              {t.tone === "ok" ? <IconCheckCircle size={16} /> : <IconInfo size={16} />}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-snug text-fog">
                {t.title}
              </span>
              {t.body && (
                <span className="mt-0.5 block text-xs leading-snug text-fog-dim">{t.body}</span>
              )}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
