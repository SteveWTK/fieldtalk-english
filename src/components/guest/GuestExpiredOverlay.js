"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { Clock, UserPlus, Trophy, Star, BookOpen } from "lucide-react";

const translations = {
  en: {
    title: "Your Guest Access Has Ended",
    subtitle: "Create a free account to keep your progress!",
    yourProgress: "Your Progress",
    xp: "XP Earned",
    level: "Level",
    lessons: "Lessons Completed",
    createAccount: "Create Free Account",
    keepProgress:
      "Sign up to save your progress and unlock more features",
  },
  pt: {
    title: "Seu Acesso de Visitante Expirou",
    subtitle: "Crie uma conta gratuita para manter seu progresso!",
    yourProgress: "Seu Progresso",
    xp: "XP Ganho",
    level: "Nível",
    lessons: "Lições Concluídas",
    createAccount: "Criar Conta Gratuita",
    keepProgress:
      "Cadastre-se para salvar seu progresso e desbloquear mais recursos",
  },
  th: {
    title: "การเข้าถึงของผู้เยี่ยมชมสิ้นสุดแล้ว",
    subtitle: "สร้างบัญชีฟรีเพื่อเก็บรักษาความก้าวหน้าของคุณ!",
    yourProgress: "ความก้าวหน้าของคุณ",
    xp: "XP ที่ได้รับ",
    level: "เลเวล",
    lessons: "บทเรียนที่สำเร็จ",
    createAccount: "สร้างบัญชีฟรี",
    keepProgress:
      "ลงทะเบียนเพื่อบันทึกความก้าวหน้าและปลดล็อกคุณสมบัติเพิ่มเติม",
  },
};

export default function GuestExpiredOverlay({ stats = {} }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = translations[lang] || translations.en;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Clock icon */}
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {copy.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {copy.subtitle}
        </p>

        {/* Stats grid */}
        {(stats.xp > 0 || stats.level > 1 || stats.lessons > 0) && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              {copy.yourProgress}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {stats.xp > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                  <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {stats.xp}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {copy.xp}
                  </p>
                </div>
              )}
              {stats.level > 1 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                  <Star className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    {stats.level}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {copy.level}
                  </p>
                </div>
              )}
              {stats.lessons > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {stats.lessons}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {copy.lessons}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          onClick={() => router.push("/claim-account")}
          className="w-full py-3 px-6 bg-accent-600 hover:bg-accent-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-lg"
        >
          <UserPlus className="w-5 h-5" />
          {copy.createAccount}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          {copy.keepProgress}
        </p>
      </div>
    </div>
  );
}
