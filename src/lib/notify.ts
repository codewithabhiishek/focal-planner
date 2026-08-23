/* ------------------------------------------------------------------ */
/* Notifications — real, never faked.                                  */
/*                                                                     */
/* Today: local notifications fired through the service worker while   */
/* the PWA is installed/open, gated on real user permission.           */
/*                                                                     */
/* Tomorrow (architecture already in place):                           */
/*  - sw.js handles `push` events from a backend scheduler             */
/*  - subscribePush() captures a PushSubscription to persist           */
/*    (saveSubscription → POST /api/push-subscriptions on a backend)   */
/* ------------------------------------------------------------------ */

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function notificationsSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

export function swSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!swSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function enableNotifications(): Promise<"granted" | "denied" | "unsupported"> {
  if (!notificationsSupported()) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registerServiceWorker();
      return "granted";
    }
    return permission === "denied" ? "denied" : "unsupported";
  } catch {
    return "unsupported";
  }
}

export async function notify(title: string, body: string, tag?: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && "showNotification" in reg) {
      await reg.showNotification(title, {
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: tag || "focal",
      });
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, { body, icon: "/icon.svg", tag });
  } catch {
    /* older browsers */
  }
}

/**
 * Capture a Web Push subscription (VAPID). A backend would store this and
 * let a scheduler send pushes ("top task still incomplete", "new #1", …).
 * Until a backend exists we persist locally — nothing is sent anywhere.
 */
export async function subscribePush(): Promise<PushSubscription | null> {
  if (!swSupported() || !("pushManager" in (await navigator.serviceWorker.getRegistration() ?? {}))) {
    return null;
  }
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // applicationServerKey: <VAPID public key from your backend>
    } as PushSubscriptionOptionsInit);
    saveSubscription(sub);
    return sub;
  } catch {
    return null;
  }
}

function saveSubscription(sub: PushSubscription): void {
  // TODO(backend): POST sub.toJSON() to /api/push-subscriptions
  try {
    localStorage.setItem("focal.push.subscription", JSON.stringify(sub.toJSON()));
  } catch {
    /* ignore */
  }
}

/* ---- nudges: throttled, rule-based, decided by app logic (no AI) ---- */

const NUDGE_KEY = "focal.nudges.v1";

function readNudges(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(NUDGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeNudges(n: Record<string, number>) {
  try {
    localStorage.setItem(NUDGE_KEY, JSON.stringify(n));
  } catch {
    /* ignore */
  }
}

/** Returns true if enough time passed since the last nudge of this kind. */
export function shouldNudge(key: string, minGapMs: number): boolean {
  const nudges = readNudges();
  const last = nudges[key] ?? 0;
  if (Date.now() - last < minGapMs) return false;
  nudges[key] = Date.now();
  writeNudges(nudges);
  return true;
}
