// src/components/try/TryButton.js
//
// Primary CTA on /o-campo. One click:
//   1. POST /api/guest-access/try/activate (creates auth user + public
//      profile, returns credentials).
//   2. supabase.auth.signInWithPassword to establish the SSR auth
//      cookies — this is what makes the subsequent navigation to the
//      lesson see the guest as signed in.
//   3. window.location.assign to the destination so Next.js kicks
//      off a fresh server render with the new cookies attached
//      (router.push keeps client-side state and misses the SSR auth).
//
// Error cases:
//   - Activate 500 / network: show a short error message, let the user
//     tap again. We don't retry automatically — surface fail-closed so
//     an actual outage doesn't silently drop them on a broken screen.
//   - Already-authenticated: the API returns already_authenticated=true
//     and we just redirect. Covers the "I opened /o-campo in another
//     tab while already a guest" edge.

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function TryButton({ label }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guest-access/try/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Não foi possível começar. Tente de novo.");
        setLoading(false);
        return;
      }

      // Already a guest? skip the sign-in and jump straight to the lesson.
      if (data.already_authenticated) {
        window.location.assign(data.destination_path);
        return;
      }

      // Fresh guest — establish the browser session from the credentials
      // the server just created.
      const supabase = createClient();
      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: data.guest_email,
          password: data.guest_password,
        });
      if (signInError) {
        console.error("[try-button] signIn failed:", signInError);
        setError("Falha ao entrar. Atualize a página e tente de novo.");
        setLoading(false);
        return;
      }

      // Hard navigate so the destination's server-side auth picks up
      // the fresh cookies on first render.
      window.location.assign(data.destination_path);
    } catch (err) {
      console.error("[try-button] exception:", err);
      setError("Erro de rede. Tente de novo em alguns segundos.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-accent-400 hover:bg-accent-300 disabled:opacity-70 disabled:cursor-not-allowed text-primary-900 text-base font-bold tracking-wide transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Entrando…
          </>
        ) : (
          label
        )}
      </button>
      {error && (
        <p className="text-xs text-signal-alert max-w-xs">{error}</p>
      )}
    </div>
  );
}
