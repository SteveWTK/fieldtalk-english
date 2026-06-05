// public/sw.js
//
// FieldTalk service worker — receives web push messages and turns
// them into OS-level notifications, plus handles the click action
// that brings the user into the right place in the app.
//
// Lives in /public so it's served from the site root (browsers
// scope a service worker to the directory it was loaded from; only
// a root-scoped worker can receive pushes for the whole app).
//
// We intentionally keep this worker tiny — no fetch handler, no
// caching, no precache list. The PWA install path comes from the
// browser's own default behaviour against manifest.json. Adding a
// fetch interceptor here would unlock offline lessons but would
// also risk serving stale content; we defer that to a separate
// initiative.

// ─── Push event ───
// Fires when the server sends a push via the Web Push protocol.
// Payload shape (set by the sending code, src/lib/push/send.js):
//   {
//     title:  "FieldTalk",
//     body:   "Brasil x Argentina kicks off in 1 hour …",
//     url:    "/lesson/abc",   // where notificationclick should land
//     tag:    "match-bra-arg",  // replaces same-tag previous notifs
//     icon?:  "/web-app-manifest-192x192.png"
//   }
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Bad/missing JSON — fall back to a minimal generic notification
    // rather than dropping the push silently. The sending side
    // shouldn't ever send malformed payloads, but if it does we'd
    // rather a user gets *something* than nothing.
    payload = { title: "FieldTalk", body: "Tap to open the app." };
  }

  const title = payload.title || "FieldTalk";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/web-app-manifest-192x192.png",
    badge: payload.badge || "/web-app-manifest-192x192.png",
    // tag lets us "replace" rather than stack notifications of the
    // same kind (e.g. a second pack reminder overrides the first).
    tag: payload.tag,
    // renotify = false means re-using a tag won't ping the user
    // again with sound/vibration; the notification list just gets
    // updated quietly. Less spammy.
    renotify: false,
    // data is forwarded to the click handler so it can navigate to
    // the right destination.
    data: { url: payload.url || "/", ts: Date.now() },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click ───
// If an existing tab is already open at our origin, focus that and
// nudge it to the target URL via postMessage (no full reload).
// Otherwise open a new tab.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        try {
          const sameOrigin = new URL(client.url).origin === self.location.origin;
          if (sameOrigin) {
            client.postMessage({ type: "navigate", url: targetUrl });
            return client.focus();
          }
        } catch {
          // Ignore non-parseable client URLs (rare; happens for
          // about:blank etc.) and keep looking.
        }
      }
      // No matching tab — open a fresh one.
      return self.clients.openWindow(targetUrl);
    })()
  );
});

// ─── Activate / install ───
// skipWaiting + claim so a freshly-deployed worker takes over right
// away without the user having to close every tab. The push
// behaviour doesn't change between deploys often, but if it does we
// want it active immediately rather than waiting hours for tabs
// to roll over.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
