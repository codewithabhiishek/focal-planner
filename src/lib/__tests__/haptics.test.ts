import {
  haptics,
  isHapticsSupported,
  triggerHaptic,
  HAPTIC_PATTERNS,
  type HapticType,
} from "../haptics.ts";

export function runHapticsTests(): void {
  function assertEqual<T>(actual: T, expected: T, msg: string): void {
    if (actual !== expected) {
      throw new Error(`FAIL: ${msg} (expected ${expected}, got ${actual})`);
    }
    console.log(`PASS: ${msg}`);
  }

  function assertTrue(actual: boolean, msg: string): void {
    if (!actual) {
      throw new Error(`FAIL: ${msg}`);
    }
    console.log(`PASS: ${msg}`);
  }

  const originalNavigator = globalThis.navigator;
  const originalWindow = (globalThis as any).window;

  try {
    // 1. When navigator.vibrate is missing
    Object.defineProperty(globalThis, "navigator", {
      value: {},
      configurable: true,
      writable: true,
    });
    assertEqual(isHapticsSupported(), false, "isHapticsSupported() returns false when navigator.vibrate is absent");
    assertEqual(triggerHaptic("tap"), false, "triggerHaptic() returns false when vibration is not supported");
    assertEqual(haptics.complete(), false, "haptics.complete() degrades gracefully without vibrating");

    // 2. When navigator.vibrate and window are supported
    (globalThis as any).window = globalThis;

    let lastVibrateCall: any = null;
    const mockVibrate = (pattern: any) => {
      lastVibrateCall = pattern;
      return true;
    };

    Object.defineProperty(globalThis, "navigator", {
      value: { vibrate: mockVibrate },
      configurable: true,
      writable: true,
    });

    assertTrue(isHapticsSupported(), "isHapticsSupported() returns true when navigator.vibrate is defined");

    // Test each pattern
    const types: HapticType[] = ["tap", "select", "complete", "postpone", "unblock", "error"];
    for (const t of types) {
      lastVibrateCall = null;
      const res = triggerHaptic(t);
      assertTrue(res, `triggerHaptic("${t}") returns true`);
      assertEqual(
        JSON.stringify(lastVibrateCall),
        JSON.stringify(HAPTIC_PATTERNS[t]),
        `triggerHaptic("${t}") passed expected pattern: ${JSON.stringify(HAPTIC_PATTERNS[t])}`
      );
    }

    // Test haptics helper methods
    lastVibrateCall = null;
    haptics.tap();
    assertEqual(lastVibrateCall, HAPTIC_PATTERNS.tap, "haptics.tap() triggers tap pattern");

    lastVibrateCall = null;
    haptics.select();
    assertEqual(lastVibrateCall, HAPTIC_PATTERNS.select, "haptics.select() triggers select pattern");

    lastVibrateCall = null;
    haptics.complete();
    assertEqual(JSON.stringify(lastVibrateCall), JSON.stringify(HAPTIC_PATTERNS.complete), "haptics.complete() triggers complete pattern");

    lastVibrateCall = null;
    haptics.postpone();
    assertEqual(JSON.stringify(lastVibrateCall), JSON.stringify(HAPTIC_PATTERNS.postpone), "haptics.postpone() triggers postpone pattern");

    lastVibrateCall = null;
    haptics.unblock();
    assertEqual(JSON.stringify(lastVibrateCall), JSON.stringify(HAPTIC_PATTERNS.unblock), "haptics.unblock() triggers unblock pattern");

    lastVibrateCall = null;
    haptics.error();
    assertEqual(JSON.stringify(lastVibrateCall), JSON.stringify(HAPTIC_PATTERNS.error), "haptics.error() triggers error pattern");

    lastVibrateCall = null;
    haptics.custom([50, 100, 50]);
    assertEqual(JSON.stringify(lastVibrateCall), JSON.stringify([50, 100, 50]), "haptics.custom() triggers custom pattern");

    // 3. Graceful recovery on exception
    Object.defineProperty(globalThis, "navigator", {
      value: {
        vibrate: () => {
          throw new Error("Device permission denied");
        },
      },
      configurable: true,
      writable: true,
    });

    assertEqual(triggerHaptic("complete"), false, "triggerHaptic catches thrown error and returns false safely");
    assertEqual(haptics.custom(10), false, "haptics.custom catches thrown error and returns false safely");
  } finally {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    (globalThis as any).window = originalWindow;
  }
}
