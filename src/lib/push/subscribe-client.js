// src/lib/push/subscribe-client.js
//
// Browser-only helpers for the push opt-in flow. Three concerns:
//
//   - registerServiceWorker()   ensure /sw.js is registered and ready.
//   - subscribeToPush(lang)      run the full opt-in pipeline:
//                                 permission → SW → pushManager.subscribe
//                                 → POST to /api/push/subscribe.
//   - unsubscribeFromPush()      mirror of the above for the off path.
//
// The component that uses these (NotificationsOptIn) doesn't need to
// know any of the Web Push protocol details — just call these.

const SW_PATH = "/sw.js";

/**
 * URL-safe base64 → Uint8Array. The browser's PushManager wants the
 * VAPID public key as a raw byte buffer, but our env var is a
 * url-safe base64 string. Standard utility, copied here so the
 * component doesn't need a separate dependency.
 */
function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(safe);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Whether this browser can do web push at all. Returns false in
 * SSR (no `window`), older Safari, and any browser that doesn't
 * expose PushManager.
 */
export function isPushSupported() {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Current OS-level permission: "granted" | "denied" | "default". */
export function getPermissionState() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

/**
 * Ensure /sw.js is registered. Idempotent — if a registration
 * already exists, just return it.
 */
export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (existing) return existing;
  return navigator.serviceWorker.register(SW_PATH);
}

/** Existing subscription for the current browser, if any. */
export async function getExistingSubscription() {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration(SW_PATH);
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/**
 * Full opt-in pipeline. Returns:
 *   { ok: true,  subscription }  — happy path
 *   { ok: false, reason: "unsupported" | "denied" | "no-vapid"
 *                       | "subscribe-failed" | "save-failed" }
 */
export async function subscribeToPush({ language = "en" } = {}) {
  if (!isPushSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { ok: false, reason: "no-vapid" };
  }

  // 1. Ask permission. Browsers return the existing state if it's
  // already "granted" or "denied" without showing the prompt again.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  // 2. Make sure the service worker is registered + active.
  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: "unsupported" };

  // 3. Subscribe with the VAPID key. userVisibleOnly is required by
  // every browser — silent push isn't an option in the web spec.
  let subscription;
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  } catch (err) {
    console.error("[push] pushManager.subscribe failed:", err);
    return { ok: false, reason: "subscribe-failed" };
  }

  // 4. Send the subscription to our server so the cron jobs and
  // event triggers can find it later.
  try {
    const json = subscription.toJSON(); // { endpoint, keys: {p256dh, auth} }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...json, language }),
    });
    if (!res.ok) {
      console.error("[push] /api/push/subscribe non-OK:", res.status);
      return { ok: false, reason: "save-failed" };
    }
  } catch (err) {
    console.error("[push] /api/push/subscribe threw:", err);
    return { ok: false, reason: "save-failed" };
  }

  return { ok: true, subscription };
}

/** Mirror of subscribeToPush — unsubscribe + tell the server. */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return { ok: true };
  const existing = await getExistingSubscription();
  if (!existing) return { ok: true };
  const endpoint = existing.endpoint;
  try {
    await existing.unsubscribe();
  } catch {
    // Ignore — we'll still tell the server so the DB row goes away.
  }
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // The DB row will be cleaned up later by the 410-Gone path on
    // the next send attempt. Non-fatal.
  }
  return { ok: true };
}
