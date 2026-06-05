# PWA Push Notifications — Setup Guide

One-time setup steps before push notifications can fire. Do these
in order.

## 1. Install the `web-push` package

```bash
npm install web-push
```

This package handles the VAPID signing + Web Push protocol on the
server. Adds ~50 KB to the API bundle.

## 2. Generate a VAPID keypair

Web Push uses VAPID (Voluntary Application Server Identification) to
prove that the push request is coming from your application server,
not a random attacker. Each FieldTalk environment gets the **same**
keypair across dev/preview/prod — subscriptions are bound to the
public key, so changing keys invalidates every existing subscription
and forces every user to re-opt-in. Treat the keypair like a long-
lived secret.

Generate one **once** and stash it:

```bash
npx web-push generate-vapid-keys
```

Output looks like:

```
=======================================
Public Key:
BJfNK_...long string...
Private Key:
g3Y_h...long string...
=======================================
```

## 3. Add env vars

Add the following to **`.env.local`** AND to **Vercel project
environment variables** (Production, Preview, Development scopes):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key from step 2>
VAPID_PRIVATE_KEY=<private key from step 2>
VAPID_SUBJECT=mailto:contact@fieldtalkenglish.com
```

Notes:

- `NEXT_PUBLIC_` prefix on the public key — the browser needs it to
  subscribe. The private key stays server-only.
- `VAPID_SUBJECT` is an identifier required by the spec. Use an
  email you actually own; some push servers will reject pushes if
  it's bogus.

## 4. Run the SQL migration

In the Supabase SQL editor:

```
PUSH_NOTIFICATIONS_SCHEMA.sql
```

Creates `push_subscriptions` and `notification_log` with owner-only
RLS.

## 5. Deploy

The service worker at `/sw.js` is served from `/public` so no build
step is required — just deploy and it's there. Subsequent updates
to `public/sw.js` activate on next page load (the worker calls
`skipWaiting()` and `clients.claim()` so users don't have to close
every tab).

## 6. Verify

1. Open the deployed site in Chrome (desktop or Android) — iOS works
   only if installed to home screen first.
2. Sign in to a test account.
3. Look for the opt-in banner on the dashboard. Click "Enable".
4. Accept the browser permission prompt.
5. In Supabase SQL editor, confirm a row was written:
   ```sql
   SELECT id, player_id, language, created_at FROM push_subscriptions
    ORDER BY created_at DESC LIMIT 5;
   ```
6. Send yourself a test push from the admin route (added in the
   next implementation phase):
   ```
   POST /api/admin/push/test
   { "playerId": "<your uuid>", "kind": "welcome_pack" }
   ```

## Browser support snapshot

| Browser            | Web Push | Notes                                       |
| ------------------ | -------- | ------------------------------------------- |
| Chrome (desktop)   | ✅       | Works without install                       |
| Edge (desktop)     | ✅       | Works without install                       |
| Firefox (desktop)  | ✅       | Works without install                       |
| Chrome (Android)   | ✅       | Works without install                       |
| Safari (iOS 16.4+) | ✅       | **Only after Add to Home Screen**           |
| Safari (iOS <16.4) | ❌       | No support — silent no-op                   |
| Safari (macOS 13+) | ✅       | Works                                       |

The home-screen tip in the WelcomeOnboarding modal is doing double
duty: it makes the app feel native, *and* it gates iOS users into
the only path where they'll ever get push notifications.

## Things to monitor

- **Subscription churn.** When a user clears site data, uninstalls
  the PWA, or denies permission, their `push_subscription` row is
  orphaned. The send code already handles 410 Gone (subscription
  expired/unsubscribed) by deleting the row. A monthly cleanup of
  rows where `last_used_at IS NULL AND created_at < now() - 90 days`
  would also catch installs that never received a push.
- **Permission denial rate.** If lots of users click "Enable" but
  then deny the browser prompt, that's a UX signal — the prompt is
  too aggressive or the value isn't clear yet. Track it via
  `notification_log` (no row = denied).
- **Vercel function timing.** Each `web-push.sendNotification` call
  is ~200–500 ms. Batched cron sends should use `Promise.allSettled`
  with a concurrency cap (10 at a time) to keep wall time under
  Vercel's 10s function ceiling.
