// src/app/(site)/signin/page.js
//
// Sign-in surface. Two paths in: Google (primary — 90%+ of our
// users), and email + password (fallback). Both funnel to /lesson
// on success. The old light-mode branch was retired with the DS
// migration — this page renders on the same dark slate substrate as
// the rest of the app so the front-door → sign-in → dashboard
// transition feels like one continuous surface.
"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import GoogleAuthButton from "@/components/GoogleAuthButton";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await signIn(email, password);

    if (error) {
      setError(error);
    } else {
      router.push("/lesson");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex items-center justify-center p-4">
      {/* Subtle ambient lime wash — matches the root landing so
          crossing this page feels like the same room, not a
          different one. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, rgba(163,230,53,0.12), rgba(163,230,53,0) 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-md w-full">
        {/* Logo + heading — the small "rise" sting fires the mark
            in on mount so the sign-in surface feels alive. */}
        <div className="text-center mb-8 flex flex-col items-center">
          <GlobalPlayerLogo
            variant="crest"
            tone="tonalDark"
            size={64}
            sting="rise"
          />
          <p className="mt-4 text-lg sm:text-xl font-display font-bold text-primary-50">
            Faça login com sua conta Google
          </p>
        </div>

        <div className="mb-4">
          <GoogleAuthButton text="Sign in with Google" />
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-primary-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 font-semibold bg-primary-900 text-primary-400">
              Ou entre com email e senha
            </span>
          </div>
        </div>

        {/* Email + password form — DS card treatment. */}
        <div className="bg-primary-panel border border-primary-700 rounded-panel p-6 sm:p-7">
          {error && (
            <div className="mb-4 p-3 bg-signal-alert/10 border border-signal-alert/40 text-signal-alert rounded-card text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@club.com"
              required
            />

            <div>
              <label
                htmlFor="password"
                className="block text-[12px] font-sans font-medium text-primary-400 mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-primary-900 text-primary-100 placeholder:text-primary-500 border border-primary-600 rounded-control font-sans text-[15px] leading-normal px-[15px] py-[13px] pr-10 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30 transition-colors"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-400 hover:text-primary-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-primary-300">
              Não tem uma conta?{" "}
              <Link
                href="/signup"
                className="text-accent-400 hover:text-accent-300 font-semibold transition-colors"
              >
                Registre-se aqui.
              </Link>
            </p>
          </div>
        </div>

        {/* Partnership footnote — small, discreet, points to the
            marketing team's inbox for club/academy conversations. */}
        <div className="mt-6 text-center">
          <p className="text-xs text-primary-500">
            Para parcerias com clubes ou academias,{" "}
            <Link
              href="/#contact"
              className="text-primary-300 hover:text-primary-100 transition-colors inline-flex items-center gap-1"
            >
              fale com a gente
              <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
