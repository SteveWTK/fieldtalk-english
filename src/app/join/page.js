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

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { getBranch } from "@/lib/branches";
import { DEFAULT_EDITION } from "@/lib/editions/editions";
import {
  rememberPartnerReferrer,
  readPartnerReferrer,
} from "@/lib/partners/referrer";

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Edition resolution — explicit `?edition=` param wins, everything
  // else falls to the primary Global Player edition (Pro Path). The
  // server routes have the same fallback; sending the resolved
  // edition explicitly here means a client that reaches this page
  // via a partner deep link still gets the right tag, and everyone
  // else still lands in Pro Path without an untagged null flowing
  // through to the API.
  const edition = searchParams.get("edition") || DEFAULT_EDITION;
  const branchKey = searchParams.get("branch");
  // Branding rule (2026-09):
  //   - No branch slug            → Global Player mark only.
  //   - Branch slug present       → co-branded. Global Player is the
  //                                 primary anchor (that's the app
  //                                 they're joining); the partner
  //                                 mark sits below as an "in
  //                                 partnership with" credit.
  // The old logic defaulted to a Cultura fallback when neither
  // `edition` nor `branch` was set, which meant users arriving from
  // the streamlined root landing saw the Cultura lion — wrong for
  // the umbrella brand. That path is gone; the umbrella IS Global
  // Player now.
  const partnerBranch = branchKey ? getBranch(branchKey) : null;

  // Mirror the /wc2026 capture so users who deep-link straight to
  // /join?branch=<slug> (e.g. from a partner email blast that skips
  // the marketing page) still get attributed.
  useEffect(() => {
    if (branchKey) rememberPartnerReferrer(branchKey);
  }, [branchKey]);
  const { t } = useTranslation();
  // Current language from LanguageContext — browser-detected for
  // first-time visitors (Brazilian browsers land on "pt"), or
  // whatever the user explicitly toggled to. We pass this to
  // signup-instant so the players row is created with the right
  // preferred_language out of the gate.
  const { lang } = useLanguage();
  const { signIn } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError("");

    // Gentle inline validation before we even hit the network.
    if (password.length < 6) {
      setError(t("password_too_short"));
      return;
    }

    setLoading(true);

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
          // Pull the partner attribution out of localStorage where
          // /wc2026 or this page itself stashed it. The server-side
          // route writes it to players.partner_referrer on the
          // freshly-created row. Null if the user came in via a
          // plain URL.
          partnerReferrer: readPartnerReferrer(),
          // Browser-detected (or user-toggled) language. Without
          // this the server defaults to "en" and the LanguageContext
          // overwrites a Brazilian browser's "pt" back to "en" on
          // first signed-in render.
          preferredLanguage: lang,
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
    <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex flex-col">
      {/* Ambient lime wash — same vocabulary as the root/signin
          surfaces so crossing here feels like the same room. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, rgba(163,230,53,0.12), rgba(163,230,53,0) 70%)",
          }}
        />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo + heading — Global Player is always the primary
              anchor. When a partner branch is present, the partner
              mark sits below as an "in partnership with" credit so
              they get recognition without the app itself feeling
              white-labelled. */}
          <div className="text-center mb-8 flex flex-col items-center">
            <GlobalPlayerLogo
              variant="crest"
              tone="tonalDark"
              size={64}
              sting="rise"
            />
            {partnerBranch && (
              <div className="mt-4 flex flex-col items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-label text-primary-500 font-semibold">
                  {lang === "pt"
                    ? "Em parceria com"
                    : "In partnership with"}
                </span>
                <Image
                  src={partnerBranch.logoSrc}
                  alt={partnerBranch.alt}
                  width={120}
                  height={40}
                  priority
                  className="h-7 sm:h-8 w-auto opacity-80"
                />
              </div>
            )}
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-primary-50">
              {t("join_heading")}
            </h1>
            <p className="text-sm sm:text-base text-primary-300">
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
              <div className="w-full border-t border-primary-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-primary-900 text-primary-400 tracking-wider uppercase">
                {t("or_with_email")}
              </span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSignup} className="space-y-3">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-control bg-signal-alert/10 border border-signal-alert/40 text-signal-alert text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("full_name_optional")}
            />

            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder={t("email_label")}
            />

            <div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder={t("password_label")}
                  className="w-full px-[15px] py-[13px] pr-12 rounded-control bg-primary-900 border border-primary-600 text-primary-100 placeholder:text-primary-500 font-sans text-[15px] leading-normal outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? t("hide_password") : t("show_password")
                  }
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-400 hover:text-primary-100"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-primary-500 px-1">
                {t("password_min_hint")}
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              Icon={ArrowRight}
              loading={loading}
              disabled={loading || !email}
              fullWidth
              className="mt-2"
            >
              {loading ? t("creating_account") : t("create_account")}
            </Button>
          </form>

          {/* Already-have-account link */}
          <p className="text-center mt-8 text-sm text-primary-300">
            {t("already_have_account")}{" "}
            <Link
              href="/signin"
              className="text-accent-400 hover:text-accent-300 font-medium"
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
      fallback={<div className="min-h-screen bg-primary-900" aria-hidden />}
    >
      <JoinPageContent />
    </Suspense>
  );
}
