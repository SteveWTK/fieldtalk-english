"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertTriangle, Trophy, RefreshCw } from "lucide-react";

const t = {
  en: {
    activating: "Activating your access...",
    signingIn: "Setting up your session...",
    redirecting: "Taking you to your destination...",
    errorTitle: "Access Error",
    tryAgain: "Try Again",
    goHome: "Go to Homepage",
    welcomeDefault: "Welcome to FieldTalk!",
    preparingExperience: "Preparing your experience",
  },
  pt: {
    activating: "Ativando seu acesso...",
    signingIn: "Configurando sua sessão...",
    redirecting: "Levando você ao seu destino...",
    errorTitle: "Erro de Acesso",
    tryAgain: "Tentar Novamente",
    goHome: "Ir para a Página Inicial",
    welcomeDefault: "Bem-vindo ao FieldTalk!",
    preparingExperience: "Preparando sua experiência",
  },
  th: {
    activating: "กำลังเปิดใช้งานการเข้าถึงของคุณ...",
    signingIn: "กำลังตั้งค่าเซสชันของคุณ...",
    redirecting: "กำลังนำคุณไปยังจุดหมาย...",
    errorTitle: "ข้อผิดพลาดในการเข้าถึง",
    tryAgain: "ลองอีกครั้ง",
    goHome: "ไปที่หน้าแรก",
    welcomeDefault: "ยินดีต้อนรับสู่ FieldTalk!",
    preparingExperience: "กำลังเตรียมประสบการณ์ของคุณ",
  },
};

/**
 * Guest Access Landing Page
 *
 * When a user scans a QR code, they arrive at /guest/[token].
 * This page:
 * 1. Validates the QR token via the activation API
 * 2. Creates a temporary guest account
 * 3. Signs them in automatically via Supabase Auth
 * 4. Redirects to the configured destination page
 */
export default function GuestAccessPage() {
  const { token } = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [pageStatus, setPageStatus] = useState("activating");
  const [error, setError] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState(null);
  const activatingRef = useRef(false);

  // Detect language from browser
  const browserLang =
    typeof navigator !== "undefined"
      ? navigator.language?.startsWith("th")
        ? "th"
        : navigator.language?.startsWith("pt")
          ? "pt"
          : "en"
      : "en";
  const copy = t[browserLang] || t.en;

  useEffect(() => {
    if (!token || activatingRef.current || authLoading) return;
    activatingRef.current = true;

    // If already logged in, just validate and redirect
    if (user) {
      handleAuthenticatedUser();
      return;
    }

    activateGuest();
  }, [token, user, authLoading]);

  const handleAuthenticatedUser = async () => {
    try {
      const res = await fetch("/api/guest-access/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: token }),
      });
      const data = await res.json();

      // If already authenticated or any successful response, redirect
      if (data.already_authenticated || data.success) {
        router.push(data.destination_path || "/dashboard");
      } else if (data.error) {
        // Show error if code is invalid
        setError(data.error);
        setPageStatus("error");
      } else {
        // Fallback: redirect to dashboard anyway since user is logged in
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Error for authenticated user:", err);
      router.push("/dashboard");
    }
  };

  const activateGuest = async () => {
    try {
      setPageStatus("activating");
      setError(null);

      // Step 1: Validate code and create temporary account
      const res = await fetch("/api/guest-access/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: token }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to activate access");
        setPageStatus("error");
        return;
      }

      // If already authenticated (non-guest), just redirect
      if (data.already_authenticated) {
        router.push(data.destination_path || "/dashboard");
        return;
      }

      // Set welcome message if provided
      const welcomeMsg =
        browserLang === "th"
          ? data.welcome_message_th
          : browserLang === "pt"
            ? data.welcome_message_pt
            : data.welcome_message;
      if (welcomeMsg) {
        setWelcomeMessage(welcomeMsg);
      }

      // Step 2: Sign in with Supabase Auth using the generated credentials
      setPageStatus("signing-in");

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.guest_email,
        password: data.guest_password,
      });

      if (signInError) {
        console.error("Supabase sign-in error:", signInError);
        setError("Failed to sign in. Please try scanning the QR code again.");
        setPageStatus("error");
        return;
      }

      // Step 3: Redirect to destination
      setPageStatus("redirecting");

      // Small delay to let the session establish
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push(data.destination_path || "/dashboard");
    } catch (err) {
      console.error("Guest activation error:", err);
      setError("Something went wrong. Please try scanning the QR code again.");
      setPageStatus("error");
    }
  };

  const handleRetry = () => {
    activatingRef.current = false;
    activateGuest();
  };

  // Error state
  if (pageStatus === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-300" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {copy.errorTitle}
          </h1>
          <p className="text-red-200 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {copy.tryAgain}
            </button>
            <button
              onClick={() => router.push("/")}
              className="flex-1 px-4 py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-medium transition-colors"
            >
              {copy.goHome}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading states (activating, signing-in, redirecting)
  const statusMessage =
    pageStatus === "activating"
      ? copy.activating
      : pageStatus === "signing-in"
        ? copy.signingIn
        : copy.redirecting;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        {/* Animated football icon */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-accent-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-accent-600/30 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-accent-300 animate-pulse" />
          </div>
        </div>

        {/* Welcome message */}
        <h1 className="text-2xl font-bold text-white mb-2">
          {welcomeMessage || copy.welcomeDefault}
        </h1>
        <p className="text-primary-200 mb-6">{copy.preparingExperience}</p>

        {/* Status */}
        <div className="flex items-center justify-center gap-3 text-primary-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">{statusMessage}</span>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              pageStatus === "activating"
                ? "bg-accent-400 animate-pulse"
                : "bg-accent-400"
            }`}
          />
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              pageStatus === "signing-in"
                ? "bg-accent-400 animate-pulse"
                : pageStatus === "activating"
                  ? "bg-white/20"
                  : "bg-accent-400"
            }`}
          />
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              pageStatus === "redirecting"
                ? "bg-accent-400 animate-pulse"
                : "bg-white/20"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
