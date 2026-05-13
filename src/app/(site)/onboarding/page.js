"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  ChevronRight,
  ChevronLeft,
  User,
  Target,
  Flame,
  Trophy,
  Loader2,
  Check,
  Mic,
  MessageCircle,
  Newspaper,
} from "lucide-react";

const translations = {
  en: {
    steps: {
      welcome: {
        title: "Welcome to FieldTalk!",
        subtitle: "Let's personalize your training experience",
        description:
          "Answer a few quick questions so we can recommend the best content for you.",
        cta: "Let's Go",
      },
      role: {
        title: "What's your role in football?",
        subtitle: "This helps us tailor content to your needs",
        options: [
          {
            id: "player",
            label: "Player",
            description: "Active or aspiring footballer",
            icon: "User",
          },
          {
            id: "coach",
            label: "Coach / Staff",
            description: "Coaching or support staff",
            icon: "Target",
          },
          {
            id: "agent",
            label: "Agent",
            description: "Player representative",
            icon: "Newspaper",
          },
          {
            id: "fan",
            label: "Football Fan",
            description: "Love the game, learning English",
            icon: "Trophy",
          },
        ],
      },
      level: {
        title: "How would you rate your English?",
        subtitle: "Be honest - we'll find your perfect starting point",
        options: [
          {
            id: "beginner",
            label: "Beginner",
            description: "I know a few words and phrases",
            color: "green",
          },
          {
            id: "intermediate",
            label: "Intermediate",
            description: "I can have basic conversations",
            color: "yellow",
          },
          {
            id: "advanced",
            label: "Advanced",
            description: "I'm comfortable but want to improve",
            color: "orange",
          },
        ],
      },
      goals: {
        title: "What are your main goals?",
        subtitle: "Select all that apply",
        options: [
          {
            id: "communication",
            label: "Team Communication",
            description: "Talk with teammates & coaches",
            icon: "MessageCircle",
          },
          {
            id: "interviews",
            label: "Media Interviews",
            description: "Handle press conferences",
            icon: "Mic",
          },
          {
            id: "career",
            label: "Career Abroad",
            description: "Prepare for international move",
            icon: "Target",
          },
          {
            id: "general",
            label: "General Improvement",
            description: "Overall English skills",
            icon: "Flame",
          },
        ],
      },
      complete: {
        title: "You're all set!",
        subtitle: "Your personalized training is ready",
        description:
          "Based on your answers, we've prepared a customized learning path. Let's start your first session!",
        cta: "Start Training",
      },
    },
    navigation: {
      back: "Back",
      next: "Continue",
      skip: "Skip for now",
    },
  },
  pt: {
    steps: {
      welcome: {
        title: "Bem-vindo ao FieldTalk!",
        subtitle: "Vamos personalizar sua experiência de treino",
        description:
          "Responda algumas perguntas rápidas para recomendarmos o melhor conteúdo para você.",
        cta: "Vamos lá",
      },
      role: {
        title: "Qual é seu papel no futebol?",
        subtitle: "Isso nos ajuda a adaptar o conteúdo às suas necessidades",
        options: [
          {
            id: "player",
            label: "Jogador",
            description: "Jogador ativo ou aspirante",
            icon: "User",
          },
          {
            id: "coach",
            label: "Treinador / Staff",
            description: "Comissão técnica ou staff",
            icon: "Target",
          },
          {
            id: "agent",
            label: "Agente",
            description: "Representante de jogadores",
            icon: "Newspaper",
          },
          {
            id: "fan",
            label: "Fã de Futebol",
            description: "Amo o jogo, aprendendo inglês",
            icon: "Trophy",
          },
        ],
      },
      level: {
        title: "Como você avalia seu inglês?",
        subtitle: "Seja honesto - vamos encontrar seu ponto de partida ideal",
        options: [
          {
            id: "beginner",
            label: "Iniciante",
            description: "Sei algumas palavras e frases",
            color: "green",
          },
          {
            id: "intermediate",
            label: "Intermediário",
            description: "Consigo ter conversas básicas",
            color: "yellow",
          },
          {
            id: "advanced",
            label: "Avançado",
            description: "Estou confortável mas quero melhorar",
            color: "orange",
          },
        ],
      },
      goals: {
        title: "Quais são seus principais objetivos?",
        subtitle: "Selecione todos que se aplicam",
        options: [
          {
            id: "communication",
            label: "Comunicação no Time",
            description: "Falar com colegas e treinadores",
            icon: "MessageCircle",
          },
          {
            id: "interviews",
            label: "Entrevistas",
            description: "Lidar com a imprensa",
            icon: "Mic",
          },
          {
            id: "career",
            label: "Carreira no Exterior",
            description: "Preparar para mudança internacional",
            icon: "Target",
          },
          {
            id: "general",
            label: "Melhoria Geral",
            description: "Habilidades gerais de inglês",
            icon: "Flame",
          },
        ],
      },
      complete: {
        title: "Tudo pronto!",
        subtitle: "Seu treino personalizado está pronto",
        description:
          "Com base nas suas respostas, preparamos um caminho de aprendizado customizado. Vamos começar sua primeira sessão!",
        cta: "Começar Treino",
      },
    },
    navigation: {
      back: "Voltar",
      next: "Continuar",
      skip: "Pular por agora",
    },
  },
};

const iconMap = {
  User,
  Target,
  Flame,
  Trophy,
  Mic,
  MessageCircle,
  Newspaper,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const copy = translations[lang] || translations.en;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState({
    role: null,
    level: null,
    goals: [],
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-600" />
      </div>
    );
  }

  const steps = ["welcome", "role", "level", "goals", "complete"];
  const currentStep = steps[step];
  const totalSteps = steps.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const canProceed = () => {
    if (currentStep === "welcome" || currentStep === "complete") return true;
    if (currentStep === "role") return answers.role !== null;
    if (currentStep === "level") return answers.level !== null;
    if (currentStep === "goals") return answers.goals.length > 0;
    return true;
  };

  const handleNext = async () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      await saveOnboardingData();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSelectRole = (roleId) => {
    setAnswers({ ...answers, role: roleId });
  };

  const handleSelectLevel = (levelId) => {
    setAnswers({ ...answers, level: levelId });
  };

  const handleToggleGoal = (goalId) => {
    const goals = answers.goals.includes(goalId)
      ? answers.goals.filter((g) => g !== goalId)
      : [...answers.goals, goalId];
    setAnswers({ ...answers, goals });
  };

  const saveOnboardingData = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(answers),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        // Even if save fails, redirect to dashboard
        console.error("Failed to save onboarding data");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error saving onboarding:", error);
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "welcome":
        return (
          <div className="text-center max-w-lg mx-auto">
            <div className="w-24 h-24 bg-accent-100 dark:bg-accent-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">⚽</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {copy.steps.welcome.title}
            </h1>
            <p className="text-lg text-accent-600 dark:text-accent-400 font-medium mb-4">
              {copy.steps.welcome.subtitle}
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              {copy.steps.welcome.description}
            </p>
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              {copy.steps.welcome.cta}
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        );

      case "role":
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {copy.steps.role.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {copy.steps.role.subtitle}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {copy.steps.role.options.map((option) => {
                const Icon = iconMap[option.icon] || User;
                const isSelected = answers.role === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectRole(option.id)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? "bg-accent-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {option.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-6 h-6 text-accent-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "level":
        return (
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {copy.steps.level.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {copy.steps.level.subtitle}
              </p>
            </div>
            <div className="space-y-4">
              {copy.steps.level.options.map((option) => {
                const isSelected = answers.level === option.id;
                const colorClasses = {
                  green: "bg-green-500",
                  yellow: "bg-yellow-500",
                  orange: "bg-orange-500",
                };
                return (
                  <button
                    key={option.id}
                    onClick={() => handleSelectLevel(option.id)}
                    className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-4 h-4 rounded-full ${colorClasses[option.color]}`}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {option.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-6 h-6 text-accent-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {copy.steps.goals.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {copy.steps.goals.subtitle}
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {copy.steps.goals.options.map((option) => {
                const Icon = iconMap[option.icon] || Target;
                const isSelected = answers.goals.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => handleToggleGoal(option.id)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-accent-500 bg-accent-50 dark:bg-accent-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? "bg-accent-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {option.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {option.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-6 h-6 text-accent-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="text-center max-w-lg mx-auto">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {copy.steps.complete.title}
            </h1>
            <p className="text-lg text-accent-600 dark:text-accent-400 font-medium mb-4">
              {copy.steps.complete.subtitle}
            </p>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              {copy.steps.complete.description}
            </p>
            <button
              onClick={handleNext}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {copy.steps.complete.cta}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Progress bar */}
      {step > 0 && step < totalSteps - 1 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-800 z-50">
          <div
            className="h-full bg-accent-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6 py-20">
        <div className="w-full">{renderStepContent()}</div>
      </div>

      {/* Navigation */}
      {currentStep !== "welcome" && currentStep !== "complete" && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
            >
              <ChevronLeft className="w-5 h-5" />
              {copy.navigation.back}
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
              >
                {copy.navigation.skip}
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center gap-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                {copy.navigation.next}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
