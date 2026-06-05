// src/components/notifications/NotificationsOptIn.js
//
// Dashboard opt-in banner for push notifications. Renders only when:
//   - The user is signed in.
//   - The browser supports web push (Notification + PushManager + SW).
//   - The user hasn't already subscribed on this device.
//   - They haven't dismissed the prompt within the cooldown window
//     (7 days, localStorage-backed) — so a "not now" doesn't pop
//     back the next session.
//   - They haven't already explicitly denied permission (we don't
//     re-prompt; settings is the path to re-enable in that case).
//
// We DON'T trigger the browser permission prompt on mount — the
// banner shows a custom "Enable" button first so the user signs the
// intent before we burn their one-shot OS prompt. This is the
// pattern that lifts opt-in rate from ~10% (cold prompt) to 40–60%
// (intentional prompt) in the industry data.

"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, X, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  isPushSupported,
  getPermissionState,
  getExistingSubscription,
  subscribeToPush,
} from "@/lib/push/subscribe-client";

const DISMISS_KEY = "ft.push.optin.dismissed_at";
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const COPY = {
  en: {
    title: "Get a nudge when something good happens",
    body: "We'll ping you when a pack is waiting or a match you can predict is about to start. No spam — opt out anytime.",
    cta: "Enable notifications",
    enabling: "Enabling…",
    dismiss: "Not now",
    deniedTitle: "Notifications are blocked",
    deniedBody:
      "Re-enable them in your browser's site settings to get pack and match reminders.",
    failedTitle: "Couldn't enable notifications",
    failedBody: "Please try again, or check your browser's site settings.",
    enabledTitle: "You're all set",
    enabledBody: "We'll let you know about new packs and upcoming matches.",
  },
  pt: {
    title: "Receba um aviso quando algo bom acontecer",
    body: "A gente te avisa quando tiver um pacote esperando ou um jogo onde você pode dar palpite. Sem spam — pode desativar a qualquer hora.",
    cta: "Ativar notificações",
    enabling: "Ativando…",
    dismiss: "Agora não",
    deniedTitle: "As notificações estão bloqueadas",
    deniedBody:
      "Reative nas configurações do site no seu navegador para receber lembretes de pacotes e jogos.",
    failedTitle: "Não consegui ativar as notificações",
    failedBody:
      "Tente novamente, ou verifique as configurações do site no seu navegador.",
    enabledTitle: "Tudo certo!",
    enabledBody:
      "Vamos te avisar sobre novos pacotes e os próximos jogos.",
  },
};

export default function NotificationsOptIn() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const copy = useMemo(() => COPY[lang] || COPY.en, [lang]);

  // "loading"     — checking SW / existing subscription
  // "hidden"      — bail; don't render anything
  // "prompt"      — show the opt-in banner
  // "enabling"    — user clicked Enable; calling the API
  // "denied"      — permission is denied; show the help message
  // "failed"      — subscribe-failed or save-failed
  // "enabled"     — show a transient success state
  const [phase, setPhase] = useState("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setPhase("hidden");
        return;
      }
      if (!isPushSupported()) {
        setPhase("hidden");
        return;
      }

      const perm = getPermissionState();
      if (perm === "denied") {
        // Don't show on every page load — only after a manual
        // attempt. For now, hide silently so the dashboard isn't
        // littered with permission-help cards.
        setPhase("hidden");
        return;
      }

      // Already subscribed on this device? Don't pester.
      try {
        const existing = await getExistingSubscription();
        if (existing) {
          setPhase("hidden");
          return;
        }
      } catch {
        // ignore — fall through to prompt
      }

      // Recently dismissed?
      try {
        const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
        if (ts && Date.now() - ts < DISMISS_COOLDOWN_MS) {
          setPhase("hidden");
          return;
        }
      } catch {
        // localStorage unavailable (private mode, etc.) — show anyway
      }

      if (!cancelled) setPhase("prompt");
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleEnable = async () => {
    setPhase("enabling");
    const result = await subscribeToPush({ language: lang || "en" });
    if (result.ok) {
      setPhase("enabled");
      // Hide the success state after a few seconds — no need for it
      // to linger on the dashboard forever.
      setTimeout(() => setPhase("hidden"), 4000);
      return;
    }
    if (result.reason === "denied") {
      setPhase("denied");
      return;
    }
    setPhase("failed");
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore — banner just reappears next session
    }
    setPhase("hidden");
  };

  if (phase === "loading" || phase === "hidden") return null;

  // ── Card shells share a wrapper so the entrance animation looks
  // the same across success / failure / denied / prompt states.
  const wrapperClass =
    "relative rounded-2xl border bg-white/[0.04] backdrop-blur-sm p-4 sm:p-5 flex items-start gap-3";

  if (phase === "enabled") {
    return (
      <div className={`${wrapperClass} border-emerald-400/40`}>
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white">{copy.enabledTitle}</p>
          <p className="text-xs text-white/65 mt-0.5">{copy.enabledBody}</p>
        </div>
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className={`${wrapperClass} border-white/15`}>
        <div className="w-9 h-9 rounded-xl bg-white/[0.06] text-white/65 flex items-center justify-center shrink-0">
          <BellOff className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white">{copy.deniedTitle}</p>
          <p className="text-xs text-white/55 mt-0.5">{copy.deniedBody}</p>
        </div>
        <button
          onClick={() => setPhase("hidden")}
          className="shrink-0 w-7 h-7 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className={`${wrapperClass} border-red-400/40`}>
        <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-300 flex items-center justify-center shrink-0">
          <BellOff className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-white">{copy.failedTitle}</p>
          <p className="text-xs text-white/55 mt-0.5">{copy.failedBody}</p>
        </div>
        <button
          onClick={() => setPhase("hidden")}
          className="shrink-0 w-7 h-7 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // phase === "prompt" or "enabling"
  const isEnabling = phase === "enabling";
  return (
    <div className={`${wrapperClass} border-emerald-400/30`}>
      <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
        <Bell className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white">{copy.title}</p>
        <p className="text-xs text-white/65 mt-0.5">{copy.body}</p>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleEnable}
            disabled={isEnabling}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#062013] text-xs font-bold"
          >
            {isEnabling ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {copy.enabling}
              </>
            ) : (
              <>
                <Bell className="w-3 h-3" />
                {copy.cta}
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={isEnabling}
            className="px-3 py-1.5 rounded-full text-white/60 hover:text-white text-xs font-semibold"
          >
            {copy.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}
