"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  UserPlus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

const translations = {
  en: {
    title: "Create Your Account",
    subtitle:
      "Save your progress and continue learning with your own account",
    emailLabel: "Email Address",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 6 characters",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter your password",
    nameLabel: "Display Name (optional)",
    namePlaceholder: "Player",
    createAccount: "Create Account",
    creating: "Creating...",
    passwordMismatch: "Passwords do not match",
    successTitle: "Account Created!",
    successMessage:
      "Your account has been created. All your progress has been preserved. Please sign in with your new credentials.",
    signIn: "Sign In",
    notGuest: "This page is for guest users. You already have an account.",
    goToDashboard: "Go to Dashboard",
    notLoggedIn: "Please sign in first.",
    goToLogin: "Go to Login",
  },
  pt: {
    title: "Crie Sua Conta",
    subtitle:
      "Salve seu progresso e continue aprendendo com sua própria conta",
    emailLabel: "Endereço de Email",
    emailPlaceholder: "seu@email.com",
    passwordLabel: "Senha",
    passwordPlaceholder: "Pelo menos 6 caracteres",
    confirmPasswordLabel: "Confirmar Senha",
    confirmPasswordPlaceholder: "Digite sua senha novamente",
    nameLabel: "Nome de Exibição (opcional)",
    namePlaceholder: "Jogador",
    createAccount: "Criar Conta",
    creating: "Criando...",
    passwordMismatch: "As senhas não coincidem",
    successTitle: "Conta Criada!",
    successMessage:
      "Sua conta foi criada. Todo seu progresso foi preservado. Faça login com suas novas credenciais.",
    signIn: "Entrar",
    notGuest: "Esta página é para visitantes. Você já tem uma conta.",
    goToDashboard: "Ir para o Painel",
    notLoggedIn: "Faça login primeiro.",
    goToLogin: "Ir para Login",
  },
  th: {
    title: "สร้างบัญชีของคุณ",
    subtitle:
      "บันทึกความก้าวหน้าและเรียนรู้ต่อด้วยบัญชีของคุณเอง",
    emailLabel: "ที่อยู่อีเมล",
    emailPlaceholder: "your@email.com",
    passwordLabel: "รหัสผ่าน",
    passwordPlaceholder: "อย่างน้อย 6 ตัวอักษร",
    confirmPasswordLabel: "ยืนยันรหัสผ่าน",
    confirmPasswordPlaceholder: "กรอกรหัสผ่านอีกครั้ง",
    nameLabel: "ชื่อที่แสดง (ไม่บังคับ)",
    namePlaceholder: "ผู้เล่น",
    createAccount: "สร้างบัญชี",
    creating: "กำลังสร้าง...",
    passwordMismatch: "รหัสผ่านไม่ตรงกัน",
    successTitle: "สร้างบัญชีสำเร็จ!",
    successMessage:
      "บัญชีของคุณถูกสร้างแล้ว ความก้าวหน้าทั้งหมดถูกเก็บรักษาไว้ กรุณาเข้าสู่ระบบด้วยข้อมูลใหม่ของคุณ",
    signIn: "เข้าสู่ระบบ",
    notGuest: "หน้านี้สำหรับผู้เยี่ยมชม คุณมีบัญชีอยู่แล้ว",
    goToDashboard: "ไปที่แดชบอร์ด",
    notLoggedIn: "กรุณาเข้าสู่ระบบก่อน",
    goToLogin: "ไปที่หน้าเข้าสู่ระบบ",
  },
};

// Ambient lime wash — matches signin / signup / onboarding so this
// surface sits in the same room as the rest of the auth flow.
function AmbientWash() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
        style={{
          background:
            "radial-gradient(circle at center, rgba(163,230,53,0.12), rgba(163,230,53,0) 70%)",
        }}
      />
    </div>
  );
}

export default function ClaimAccountPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = translations[lang] || translations.en;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Check if user is a guest (email ends with @fieldtalk.guest or user_metadata.is_guest)
  const isGuest = user?.email?.endsWith("@fieldtalk.guest") || user?.user_metadata?.is_guest || false;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900 text-primary-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-400" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex items-center justify-center p-4">
        <AmbientWash />
        <div className="relative z-10 bg-primary-panel border border-primary-700 rounded-panel p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-signal-alert mx-auto mb-4" />
          <p className="text-primary-100 mb-4">
            {copy.notLoggedIn}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push("/login")}
          >
            {copy.goToLogin}
          </Button>
        </div>
      </div>
    );
  }

  // Not a guest user
  if (!isGuest) {
    return (
      <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex items-center justify-center p-4">
        <AmbientWash />
        <div className="relative z-10 bg-primary-panel border border-primary-700 rounded-panel p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-12 h-12 text-accent-400 mx-auto mb-4" />
          <p className="text-primary-100 mb-4">
            {copy.notGuest}
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push("/dashboard")}
          >
            {copy.goToDashboard}
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex items-center justify-center p-4">
        <AmbientWash />
        <div className="relative z-10 bg-primary-panel border border-primary-700 rounded-panel p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-accent-400/10 border border-accent-400/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-accent-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-primary-50 mb-2">
            {copy.successTitle}
          </h2>
          <p className="text-primary-400 mb-6">
            {copy.successMessage}
          </p>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            IconTrailing={ArrowRight}
            onClick={async () => {
              await signOut();
              router.push("/login");
            }}
          >
            {copy.signIn}
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/guest-access/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to create account");
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Error claiming account:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex items-center justify-center p-4 py-12">
      <AmbientWash />

      <div className="relative z-10 max-w-md w-full">
        {/* Header — crest + heading, matching the signin / signup
            room so a guest completing account setup feels like they
            never left the auth flow. */}
        <div className="text-center mb-8 flex flex-col items-center">
          <GlobalPlayerLogo
            variant="crest"
            tone="tonalDark"
            size={64}
            sting="rise"
          />
          <h1 className="mt-4 text-2xl font-display font-bold text-primary-50">
            {copy.title}
          </h1>
          <p className="text-primary-400 mt-2">
            {copy.subtitle}
          </p>
        </div>

        <div className="bg-primary-panel border border-primary-700 rounded-panel p-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <Input
              type="email"
              label={copy.emailLabel}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={copy.emailPlaceholder}
              required
            />

            {/* Password — hand-rolled to keep the show/hide toggle,
                tokenised to match Input's DS treatment. */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-primary-400 mb-1.5"
              >
                {copy.passwordLabel}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={copy.passwordPlaceholder}
                  required
                  minLength={6}
                  className="w-full bg-primary-900 text-primary-100 placeholder:text-primary-500 border border-primary-600 rounded-control font-sans text-[15px] leading-normal px-[15px] py-[13px] pr-10 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30 transition-colors"
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

            {/* Confirm Password */}
            <Input
              type={showPassword ? "text" : "password"}
              label={copy.confirmPasswordLabel}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={copy.confirmPasswordPlaceholder}
              required
              minLength={6}
            />

            {/* Name */}
            <Input
              type="text"
              label={copy.nameLabel}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={copy.namePlaceholder}
            />

            {/* Error message */}
            {error && (
              <div className="p-3 bg-signal-alert/10 border border-signal-alert/40 rounded-card text-signal-alert text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit — the single lime action on this view. */}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isSubmitting}
              disabled={isSubmitting}
              Icon={isSubmitting ? undefined : UserPlus}
              className="w-full"
            >
              {isSubmitting ? copy.creating : copy.createAccount}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
