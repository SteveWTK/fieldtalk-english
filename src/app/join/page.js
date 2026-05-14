// src/app/join/page.js
// Streamlined signup for fan / themed editions (World Cup 2026 first, but
// reusable for any future edition that arrives via a marketing landing page).
//
// Distinct from /signup (which is club-focused: role choice, position,
// nationality, club fields). Here we only ask for what's strictly needed:
//   - Continue with Google, OR
//   - Email + password
//
// The `?edition=` query param flows through:
//   - Email path:  passed in user_metadata.edition  → DB trigger writes
//                  players.edition
//   - Google path: stashed in localStorage by GoogleAuthButton, applied in
//                  /auth/callback after the OAuth handshake
"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import GoogleAuthButton from "@/components/GoogleAuthButton";

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const edition = searchParams.get("edition") || null;
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Create the account server-side with email already confirmed
      const res = await fetch("/api/auth/signup-instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          edition,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create account");
        setLoading(false);
        return;
      }

      // 2. Sign them in immediately so they land on /lesson logged in
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError(signInError);
        setLoading(false);
        return;
      }

      router.push("/lesson");
    } catch (err) {
      console.error("Signup error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden flex flex-col">
      {/* Ambient glows — same vocabulary as the WC landing for continuity */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.18), rgba(16,185,129,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, rgba(234,179,8,0.12), rgba(234,179,8,0) 70%)",
          }}
        />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo + heading */}
          <div className="text-center mb-8">
            <Image
              src="/logos/cultura-inglesa-logo-lion.png"
              alt="Cultura Inglesa"
              width={140}
              height={50}
              priority
              className="h-10 sm:h-12 w-auto opacity-90 mx-auto mb-6"
            />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
              {t("join_heading")}
            </h1>
            <p className="text-sm sm:text-base text-white/60">
              {t("join_subtitle")}
            </p>
          </div>

          {/* Google */}
          <div className="mb-6">
            <GoogleAuthButton
              text={t("continue_with_google")}
              edition={edition}
              variant="dark"
            />
          </div>

          {/* Separator */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#070707] text-white/50 tracking-wider uppercase">
                {t("or_with_email")}
              </span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSignup} className="space-y-3">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("full_name_optional")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400/60 focus:bg-white/10 transition-colors"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder={t("email_label")}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400/60 focus:bg-white/10 transition-colors"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder={t("password_label")}
                className="w-full px-4 py-3 pr-12 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400/60 focus:bg-white/10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? t("hide_password") : t("show_password")
                }
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/40 hover:text-white/70"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !email || password.length < 6}
              className="w-full mt-2 px-4 py-3.5 rounded-full font-bold tracking-[0.1em] uppercase text-sm text-[#070707] bg-white hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-transform"
            >
              {loading ? t("creating_account") : t("create_account")}
            </button>
          </form>

          {/* Already-have-account link */}
          <p className="text-center mt-8 text-sm text-white/60">
            {t("already_have_account")}{" "}
            <Link
              href="/signin"
              className="text-emerald-400 hover:text-emerald-300 font-medium"
            >
              {t("sign_in_link")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function JoinPage() {
  // useSearchParams needs to be wrapped in Suspense for static rendering.
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#070707]" aria-hidden />}
    >
      <JoinPageContent />
    </Suspense>
  );
}
