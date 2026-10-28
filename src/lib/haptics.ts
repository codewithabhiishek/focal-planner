/**
 * Tactile mobile haptic feedback engine for Focal Planner.
 * SSR-safe, gracefully degrades when navigator.vibrate is unsupported or denied.
 */

export const HAPTIC_PATTERNS = {
  tap: 8,
  select: 12,
  complete: [15, 60, 25],
  postpone: [20, 40, 20],
  unblock: [25, 45, 30],
  error: [35, 50, 35],
} as const;

export type HapticType = keyof typeof HAPTIC_PATTERNS;

export function isHapticsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function"
  );
}

export function triggerHaptic(type: HapticType): boolean {
  if (!isHapticsSupported()) return false;
  try {
    const pattern = HAPTIC_PATTERNS[type];
    return navigator.vibrate(pattern as unknown as VibratePattern);
  } catch {
    return false;
  }
}

export const haptics = {
  tap: () => triggerHaptic("tap"),
  select: () => triggerHaptic("select"),
  complete: () => triggerHaptic("complete"),
  postpone: () => triggerHaptic("postpone"),
  unblock: () => triggerHaptic("unblock"),
  error: () => triggerHaptic("error"),
  custom: (pattern: number | number[]): boolean => {
    if (!isHapticsSupported()) return false;
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  },
};
