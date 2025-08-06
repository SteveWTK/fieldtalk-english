// src/components/exercises/AIFootballWritingExercise.js
"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trophy,
  Target,
  Sparkles,
  Clock,
  Users,
  Mail,
  ChevronRight,
  Info,
  Globe,
  Languages,
} from "lucide-react";

// Bilingual content for football scenarios
const FOOTBALL_SCENARIOS = [
  {
    id: "first_training",
    title: {
      en: "First Day at Training",
      pt: "Primeiro Dia de Treinamento"
    },
    icon: <Users className="w-5 h-5" />,
    prompt: {
      en: "Write about your first day at training with your new UK club. Describe how you felt, what happened, and your first impressions of the facilities and teammates.",
      pt: "Escreva sobre seu primeiro dia de treinamento com seu novo clube inglês. Descreva como se sentiu, o que aconteceu, e suas primeiras impressões das instalações e companheiros de equipe."
    },
    minWords: 30,
    maxWords: 50,
    tips: {
      en: [
        "Use simple past tense (I arrived, I met, I trained)",
        "Include feelings (nervous, excited, happy)",
        "Mention the weather - it's always a talking point in the UK!",
      ],
      pt: [
        "Use o passado simples em inglês (I arrived, I met, I trained)",
        "Inclua sentimentos (nervous, excited, happy)",
        "Mencione o clima - é sempre um tópico de conversa no Reino Unido!",
      ]
    },
    culturalTip: {
      en: "In UK football, punctuality is crucial. Always arrive 15 minutes early for training.",
      pt: "No futebol inglês, a pontualidade é crucial. Sempre chegue 15 minutos antes do treinamento."
    },
    sampleStart: {
      en: "Yesterday was my first day at...",
      pt: "Exemplo: 'Yesterday was my first day at...'"
    },
  },
  {
    id: "position_style",
    title: {
      en: "Your Position & Playing Style",
      pt: "Sua Posição e Estilo de Jogo"
    },
    icon: <Target className="w-5 h-5" />,
    prompt: {
      en: "Describe your position on the field and your playing style. What are your strengths? What makes you unique as a player?",
      pt: "Descreva sua posição em campo e seu estilo de jogo. Quais são seus pontos fortes? O que te torna único como jogador?"
    },
    minWords: 40,
    maxWords: 60,
    tips: {
      en: [
        "Use present simple for facts (I play, I am, I have)",
        "Include football vocabulary (midfielder, striker, pace, vision)",
        "Be confident but humble - UK culture values modesty",
      ],
      pt: [
        "Use o presente simples em inglês (I play, I am, I have)",
        "Inclua vocabulário de futebol (midfielder, striker, pace, vision)",
        "Seja confiante mas humilde - a cultura inglesa valoriza a modéstia",
      ]
    },
    culturalTip: {
      en: "British football culture appreciates hard work and team spirit over individual brilliance.",
      pt: "A cultura do futebol inglês valoriza trabalho duro e espírito de equipe mais que brilho individual."
    },
    sampleStart: {
      en: "I am a central midfielder who likes to...",
      pt: "Exemplo: 'I am a central midfielder who likes to...'"
    },
  },
  {
    id: "teammate_email",
    title: {
      en: "Email to New Teammates",
      pt: "Email para Novos Companheiros"
    },
    icon: <Mail className="w-5 h-5" />,
    prompt: {
      en: "Write an email to your new teammates introducing yourself. Include where you're from, your football background, and express excitement about joining the team.",
      pt: "Escreva um email para seus novos companheiros se apresentando. Inclua de onde você é, seu histórico no futebol, e expresse entusiasmo por se juntar ao time."
    },
    minWords: 50,
    maxWords: 80,
    tips: {
      en: [
        "Start with 'Hi everyone' or 'Hello team'",
        "End with 'Looking forward to' + verb-ing",
        "Keep it friendly but professional",
        "Mention you're learning English and appreciate patience",
      ],
      pt: [
        "Comece com 'Hi everyone' ou 'Hello team'",
        "Termine com 'Looking forward to' + verbo-ing",
        "Mantenha amigável mas profissional",
        "Mencione que está aprendendo inglês e agradece a paciência",
      ]
    },
    culturalTip: {
      en: "British teammates appreciate when you make an effort to socialize. Accept invitations to team dinners!",
      pt: "Companheiros ingleses apreciam quando você se esforça para socializar. Aceite convites para jantares da equipe!"
    },
    sampleStart: {
      en: "Hi everyone,\n\nMy name is... and I just joined...",
      pt: "Exemplo: 'Hi everyone, My name is... and I just joined...'"
    },
  },
];

// UI text translations
const UI_TRANSLATIONS = {
  en: {
    title: "Football Writing Practice",
    subtitle: "For Brazilian players 🇧🇷 → 🇬🇧",
    writingTask: "Writing Task",
    writeWords: "Write {min}-{max} words",
    timeEstimate: "~5 minutes",
    culturalTip: "UK Football Culture Tip",
    writingTips: "Writing Tips",
    startWriting: "Start writing here...",
    wordsCount: "{count} words",
    needMoreWords: "Need {count} more words",
    tooManyWords: "Too many words! Remove {count} words",
    tryAgain: "Try Again",
    nextExercise: "Next Exercise",
    getFeedback: "Get AI Feedback",
    gettingFeedback: "Getting Feedback...",
    aiCoachFeedback: "AI Coach Feedback",
    grammarCorrections: "Grammar Corrections",
    betterVocab: "Better Football Vocabulary",
    communicationClarity: "Communication Clarity",
    trainingGoals: "Training Goals",
    xpEarned: "+{xp} XP Earned!",
    greatProgress: "Great progress on your English journey!",
    successTips: "Success Tips for Brazilian Players",
    yourProgress: "Your Progress Today",
    exercisesCompleted: "Exercises completed:",
    totalXpEarned: "Total XP earned:",
  },
  pt: {
    title: "Prática de Escrita em Futebol",
    subtitle: "Para jogadores brasileiros 🇧🇷 → 🇬🇧",
    writingTask: "Tarefa de Escrita",
    writeWords: "Escreva {min}-{max} palavras",
    timeEstimate: "~5 minutos",
    culturalTip: "Dica Cultural do Futebol Inglês",
    writingTips: "Dicas de Escrita",
    startWriting: "Comece a escrever aqui...",
    wordsCount: "{count} palavras",
    needMoreWords: "Precisa de mais {count} palavras",
    tooManyWords: "Muitas palavras! Remova {count} palavras",
    tryAgain: "Tentar Novamente",
    nextExercise: "Próximo Exercício",
    getFeedback: "Obter Feedback da IA",
    gettingFeedback: "Obtendo Feedback...",
    aiCoachFeedback: "Feedback do Treinador IA",
    grammarCorrections: "Correções Gramaticais",
    betterVocab: "Melhor Vocabulário de Futebol",
    communicationClarity: "Clareza da Comunicação",
    trainingGoals: "Objetivos de Treinamento",
    xpEarned: "+{xp} XP Ganho!",
    greatProgress: "Ótimo progresso na sua jornada em inglês!",
    successTips: "Dicas de Sucesso para Jogadores Brasileiros",
    yourProgress: "Seu Progresso Hoje",
    exercisesCompleted: "Exercícios concluídos:",
    totalXpEarned: "Total de XP ganho:",
  }
};

export default function AIFootballWritingExercise({
  lessonId,
  onComplete,
  initialScenario = "first_training",
}) {
  const [selectedScenario, setSelectedScenario] = useState(
    FOOTBALL_SCENARIOS.find((s) => s.id === initialScenario) || FOOTBALL_SCENARIOS[0]
  );
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Language toggle state with session persistence
  const [instructionLang, setInstructionLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('football-writing-instruction-lang') || 'pt';
    }
    return 'pt';
  });

  // Update session storage when language changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('football-writing-instruction-lang', instructionLang);
    }
  }, [instructionLang]);

  // Helper function to get translated text
  const t = (key, params = {}) => {
    let text = UI_TRANSLATIONS[instructionLang]?.[key] || UI_TRANSLATIONS.en[key] || key;
    
    // Replace parameters in text
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
  };

  // Helper function to get scenario content in selected language
  const getScenarioContent = (field) => {
    return selectedScenario[field]?.[instructionLang] || selectedScenario[field]?.en || selectedScenario[field];
  };

  // Update word count
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    setWordCount(
      newText
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length
    );
  };

  // Toggle instruction language
  const toggleInstructionLanguage = () => {
    setInstructionLang(instructionLang === 'en' ? 'pt' : 'en');
  };

  // Submit for AI feedback
  const submitForFeedback = async () => {
    if (wordCount < selectedScenario.minWords) {
      setError(t('needMoreWords', { count: selectedScenario.minWords - wordCount }));
      return;
    }

    setLoading(true);
    setShowFeedback(false);
    setError(null);

    try {
      const response = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "writing",
          content: text,
          context: `Football context - ${getScenarioContent('title')}: ${getScenarioContent('prompt')}`,
          lessonId: lessonId || `football-writing-${selectedScenario.id}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        let analysis;
        try {
          analysis =
            typeof data.analysis === "string"
              ? JSON.parse(data.analysis)
              : data.analysis;
        } catch {
          analysis = { 
            score: 7, 
            feedback: data.feedback,
            encouragement: "Continue praticando! A cada dia você está melhorando no inglês."
          };
        }

        // Add football-specific encouragement if not present
        if (!analysis.encouragement) {
          analysis.encouragement = getFootballEncouragement(analysis.score);
        }

        setFeedback(analysis);
        setShowFeedback(true);

        // Mark as complete if score is good
        if (analysis.score >= 7 && onComplete) {
          const xpEarned = calculateXP(analysis.score, wordCount);
          onComplete(xpEarned, selectedScenario.id);
        }
      } else {
        throw new Error(data.error || "Failed to get feedback");
      }
    } catch (error) {
      console.error("Error getting feedback:", error);
      setError("Failed to get feedback. Please try again.");
      setRetryCount(retryCount + 1);
      
      // Offer offline feedback after 2 failed attempts
      if (retryCount >= 1) {
        setError("Connection issues? Check the tips below to improve your writing!");
      }
    } finally {
      setLoading(false);
    }
  };

  // Try another scenario
  const tryNewScenario = () => {
    setText("");
    setFeedback(null);
    setShowFeedback(false);
    setWordCount(0);
    setError(null);
    
    // Move to next scenario
    const currentIndex = FOOTBALL_SCENARIOS.findIndex(s => s.id === selectedScenario.id);
    const nextIndex = (currentIndex + 1) % FOOTBALL_SCENARIOS.length;
    setSelectedScenario(FOOTBALL_SCENARIOS[nextIndex]);
  };

  // Reset current exercise
  const resetExercise = () => {
    setText("");
    setFeedback(null);
    setShowFeedback(false);
    setWordCount(0);
    setError(null);
  };

  // Calculate XP based on score and effort
  const calculateXP = (score, words) => {
    const baseXP = score * 10;
    const effortBonus = Math.min(words / 10, 10);
    return Math.round(baseXP + effortBonus);
  };

  // Get football-specific encouragement
  const getFootballEncouragement = (score) => {
    if (score >= 9) {
      return "Fantastic work! You're communicating like a Premier League pro! 🏆";
    } else if (score >= 7) {
      return "Great job! Your English is improving fast - keep training hard! ⚽";
    } else if (score >= 5) {
      return "Good effort! Like football skills, language improves with daily practice! 💪";
    } else {
      return "Keep going! Every champion started as a beginner. You're on the right path! 🌟";
    }
  };

  // Get score color and emoji
  const getScoreDisplay = (score) => {
    if (score >= 8) return { color: "text-green-600", emoji: "🏆" };
    if (score >= 6) return { color: "text-yellow-600", emoji: "⭐" };
    return { color: "text-orange-600", emoji: "💪" };
  };

  // Word count indicator color
  const getWordCountColor = () => {
    if (wordCount < selectedScenario.minWords) return "text-orange-600";
    if (wordCount > selectedScenario.maxWords) return "text-red-600";
    return "text-green-600";
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header with Language Toggle */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Trophy className="w-7 h-7 text-yellow-500" />
            <span>{t('title')}</span>
          </h2>
          <div className="flex items-center space-x-4">
            {/* Language Toggle Button */}
            <button
              onClick={toggleInstructionLanguage}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 
                       rounded-lg border border-gray-300 dark:border-gray-600 
                       hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                       text-sm font-medium text-gray-700 dark:text-gray-300"
              title={instructionLang === 'pt' ? 'Switch to English instructions' : 'Mudar para instruções em português'}
            >
              <Languages className="w-4 h-4" />
              <span className="flex items-center space-x-1">
                <span className={instructionLang === 'pt' ? 'font-bold text-blue-600 dark:text-blue-400' : ''}>PT</span>
                <span className="text-gray-400">/</span>
                <span className={instructionLang === 'en' ? 'font-bold text-blue-600 dark:text-blue-400' : ''}>EN</span>
              </span>
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('subtitle')}
            </span>
          </div>
        </div>

        {/* Scenario Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {FOOTBALL_SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => !loading && !showFeedback && setSelectedScenario(scenario)}
              disabled={loading || showFeedback}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2
                ${
                  selectedScenario.id === scenario.id
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }
                ${(loading || showFeedback) && "opacity-50 cursor-not-allowed"}
              `}
            >
              {scenario.icon}
              <span>{getScenarioContent('title')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Writing Prompt */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <div className="flex items-start space-x-3">
          {selectedScenario.icon}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('writingTask')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              {getScenarioContent('prompt')}
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                <Target className="w-4 h-4" />
                <span>
                  {t('writeWords', { min: selectedScenario.minWords, max: selectedScenario.maxWords })}
                </span>
              </span>
              <span className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{t('timeEstimate')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cultural Tip */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-2">
          <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-1">
              {t('culturalTip')}
            </p>
            <p className="text-sm text-purple-800 dark:text-purple-400">
              {getScenarioContent('culturalTip')}
            </p>
          </div>
        </div>
      </div>

      {/* Writing Tips (Collapsible) */}
      {showTips && !showFeedback && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2 flex items-center space-x-2">
                <Info className="w-4 h-4" />
                <span>{t('writingTips')}</span>
              </p>
              <ul className="space-y-1">
                {getScenarioContent('tips').map((tip, idx) => (
                  <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-400 flex items-start">
                    <ChevronRight className="w-3 h-3 mt-0.5 mr-1 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
              {getScenarioContent('sampleStart') && (
                <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-2 italic">
                  {getScenarioContent('sampleStart')}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowTips(false)}
              className="text-yellow-600 hover:text-yellow-700 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Writing Area */}
      <div className="mb-6">
        <div className="relative">
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder={`${t('startWriting')} ${getScenarioContent('sampleStart') || ""}`}
            className="w-full h-48 p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none
                     placeholder-gray-400 dark:placeholder-gray-500"
            disabled={loading || showFeedback}
          />
          <div className={`absolute bottom-2 right-2 text-sm font-medium ${getWordCountColor()}`}>
            {t('wordsCount', { count: wordCount })} / {selectedScenario.minWords}-{selectedScenario.maxWords}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {wordCount < selectedScenario.minWords && (
              <span className="text-orange-600 font-medium">
                {t('needMoreWords', { count: selectedScenario.minWords - wordCount })}
              </span>
            )}
            {wordCount > selectedScenario.maxWords && (
              <span className="text-red-600 font-medium">
                {t('tooManyWords', { count: wordCount - selectedScenario.maxWords })}
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            {!showTips && !showFeedback && (
              <button
                onClick={() => setShowTips(true)}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <Info className="w-5 h-5" />
              </button>
            )}
            {showFeedback ? (
              <>
                <button
                  onClick={resetExercise}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                           rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                           flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('tryAgain')}</span>
                </button>
                <button
                  onClick={tryNewScenario}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           transition-colors flex items-center space-x-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>{t('nextExercise')}</span>
                </button>
              </>
            ) : (
              <button
                onClick={submitForFeedback}
                disabled={
                  loading || 
                  wordCount < selectedScenario.minWords || 
                  wordCount > selectedScenario.maxWords
                }
                className={`px-6 py-2 rounded-lg font-medium transition-all
                  ${
                    wordCount >= selectedScenario.minWords && wordCount <= selectedScenario.maxWords
                      ? "bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 shadow-lg"
                      : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  } flex items-center space-x-2`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('gettingFeedback')}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t('getFeedback')}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Feedback Display */}
      {showFeedback && feedback && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            {/* Score Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span>{t('aiCoachFeedback')}</span>
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                  (Em Português 🇧🇷)
                </span>
              </h4>
              <div className="flex items-center space-x-3">
                <span className={`text-3xl font-bold ${getScoreDisplay(feedback.score).color}`}>
                  {feedback.score}/10
                </span>
                <span className="text-2xl">{getScoreDisplay(feedback.score).emoji}</span>
              </div>
            </div>

            {/* Grammar Feedback */}
            {feedback.grammar && feedback.grammar.length > 0 && (
              <div className="mb-6">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span>{t('grammarCorrections')}</span>
                </h5>
                <div className="space-y-3">
                  {feedback.grammar.map((item, idx) => (
                    <div key={idx} className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-sm">
                          {idx + 1}.
                        </span>
                        <div className="flex-1">
                          <div className="text-sm mb-1">
                            <span className="line-through text-red-600 dark:text-red-400">
                              {item.error}
                            </span>
                            {" → "}
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {item.correction}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            {item.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vocabulary Suggestions */}
            {feedback.vocabulary && feedback.vocabulary.length > 0 && (
              <div className="mb-6">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <Trophy className="w-4 h-4 text-blue-500" />
                  <span>{t('betterVocab')}</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {feedback.vocabulary.map((item, idx) => (
                    <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <div className="text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{item.original}</span>
                        {" → "}
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {item.suggestion}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {item.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clarity Feedback */}
            {feedback.clarity && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('communicationClarity')}
                </h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {feedback.clarity}
                </p>
              </div>
            )}

            {/* Next Steps */}
            {feedback.improvements && feedback.improvements.length > 0 && (
              <div className="mb-6">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <span>{t('trainingGoals')}</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {feedback.improvements.map((item, idx) => (
                    <div key={idx} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Encouragement Message */}
            {(feedback.encouragement || getFootballEncouragement(feedback.score)) && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-300 flex items-start space-x-2">
                  <Trophy className="w-5 h-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                  <span className="font-medium">
                    {feedback.encouragement || getFootballEncouragement(feedback.score)}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* XP Earned (if score is good) */}
          {feedback.score >= 7 && (
            <div className="text-center">
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {t('xpEarned', { xp: calculateXP(feedback.score, wordCount) })}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('greatProgress')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}