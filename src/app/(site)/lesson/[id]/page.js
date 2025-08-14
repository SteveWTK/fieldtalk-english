/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(site)/lesson/[id]/page.js - Updated with all step types
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BookOpen,
  Play,
  Pause,
  CheckCircle,
  X,
  Volume2,
  Mic,
  ArrowRight,
  Trophy,
  ArrowLeft,
  Home,
  Users,
  Target,
  Globe,
  MessageSquare,
  Star,
  Calendar,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Book,
  Eye,
  Phone,
  MapPin,
  // Clock,
  Award,
  Headphones,
  Languages,
} from "lucide-react";
import {
  getLessonById,
  markLessonComplete,
  getPlayerPreferredLanguage,
} from "@/lib/supabase/queries";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import AIWritingExercise from "@/components/exercises/AIWritingExercise";
import AIConversationPractice from "@/components/exercises/AIConversationPractice";
import AIGapFillExercise from "@/components/exercises/AIGapFillExercise";
import AIMultipleChoiceGapFill from "@/components/exercises/AIMultipleChoiceGapFill";
import VocabularyItem from "@/components/VocabularyItem";
import InteractivePitch from "@/components/exercises/InteractivePitch";
import InteractiveGame from "@/components/exercises/InteractiveGame";

function DynamicLessonContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const lessonId = params.id;

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState({}); // For multiple gaps
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [startTime] = useState(Date.now());
  const [completing, setCompleting] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translations, setTranslations] = useState({});
  const [translating, setTranslating] = useState(false);
  const [userPreferredLanguage, setUserPreferredLanguage] = useState("en");
  const [userEnglishVariant, setUserEnglishVariant] = useState("british");
  const [userVoiceGender, setUserVoiceGender] = useState("male");
  const [stepCompleted, setStepCompleted] = useState(false);

  const audioRef = useRef(null);

  // Fetch lesson data and user preferences
  useEffect(() => {
    async function fetchLesson() {
      try {
        setLoading(true);
        const lessonData = await getLessonById(lessonId);

        if (!lessonData) {
          setError("Lesson not found");
          return;
        }

        setLesson(lessonData);

        // Fetch user's preferred language and English variant
        if (user?.id) {
          const preferredLang = await getPlayerPreferredLanguage(user.id);
          setUserPreferredLanguage(preferredLang || "en");

          // Also fetch English variant and voice gender
          try {
            const { data, error } = await createClient()
              .from("players")
              .select("english_variant, voice_gender")
              .eq("id", user.id)
              .single();

            if (!error && data) {
              setUserEnglishVariant(data.english_variant || "british");
              setUserVoiceGender(data.voice_gender || "male");
            }
          } catch (error) {
            console.error("Error fetching user preferences:", error);
          }
        }
      } catch (err) {
        setError("Failed to load lesson");
        console.error("Error fetching lesson:", err);
      } finally {
        setLoading(false);
      }
    }

    if (lessonId) {
      fetchLesson();
    }
  }, [lessonId, user]);

  // FIXED: Better error boundaries and loading states
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-screen">
        <div className="animate-pulse">
          <div className="flex items-center space-x-4 mb-4">
            <div className="h-6 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded mb-8"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // FIXED: Error state with better navigation
  if (error || !lesson) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Lesson Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {error || "The lesson you're looking for doesn't exist."}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lessonContent = lesson.content;
  const steps = lessonContent?.steps || [];
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Updated handleAnswerSubmit function
  // Updated handleAnswerSubmit function
  const handleAnswerSubmit = () => {
    if (!selectedAnswer && Object.keys(selectedAnswers).length === 0) return;

    let correct = false;
    let totalCorrect = 0;
    let totalQuestions = 0;

    // Handle different question types
    if (
      currentStepData.type === "gap_fill" ||
      currentStepData.type === "gap_fill_advanced"
    ) {
      if (currentStepData.scenarios) {
        // Multiple scenario gap fill - check all scenarios and gaps
        let allCorrect = 0;
        let totalGaps = 0;

        currentStepData.scenarios.forEach((scenario, scenarioIndex) => {
          scenario.gaps.forEach((gap, gapIndex) => {
            totalGaps++;
            const userAnswer = selectedAnswers[`${scenarioIndex}-${gapIndex}`];
            if (userAnswer === gap.correct_answer) {
              allCorrect++;
            }
          });
        });

        totalCorrect = allCorrect;
        totalQuestions = totalGaps;
        correct = allCorrect === totalGaps; // Only true if ALL answers are correct
      } else if (currentStepData.gaps) {
        // Single gap fill with new structure
        let correctGaps = 0;
        const totalGaps = currentStepData.gaps.length;

        currentStepData.gaps.forEach((gap, gapIndex) => {
          const userAnswer = selectedAnswers[`gap-${gapIndex}`];
          if (userAnswer === gap.correct_answer) {
            correctGaps++;
          }
        });

        totalCorrect = correctGaps;
        totalQuestions = totalGaps;
        correct = correctGaps === totalGaps;
      } else {
        // Fallback for old structure (backwards compatibility)
        correct =
          currentStepData.correct_answers?.includes(selectedAnswer) ||
          currentStepData.correctAnswers?.includes(selectedAnswer);
        totalCorrect = correct ? 1 : 0;
        totalQuestions = 1;
      }
    } else if (
      currentStepData.type === "situational" ||
      currentStepData.type === "situational_challenges"
    ) {
      if (currentStepData.challenges) {
        // Handle multiple challenges format
        let correctChallenges = 0;
        const totalChallenges = currentStepData.challenges.length;

        currentStepData.challenges.forEach((challenge, challengeIndex) => {
          const userAnswer = selectedAnswers[`challenge-${challengeIndex}`];
          if (userAnswer === challenge.correct_answer) {
            correctChallenges++;
          }
        });

        totalCorrect = correctChallenges;
        totalQuestions = totalChallenges;
        correct = correctChallenges === totalChallenges; // Only true if ALL challenges are correct
      } else {
        // Handle standard situational
        correct =
          selectedAnswer === currentStepData.correct_answer ||
          selectedAnswer === currentStepData.correctAnswer;
        totalCorrect = correct ? 1 : 0;
        totalQuestions = 1;
      }
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    // Award XP based on performance
    if (!completedSteps.has(currentStep)) {
      let xpToAward = 0;

      if (
        currentStepData.type === "gap_fill" ||
        currentStepData.type === "gap_fill_advanced"
      ) {
        // Award XP based on number of correct answers (partial credit)
        xpToAward = totalCorrect * 10; // 10 XP per correct gap
        if (correct) {
          xpToAward += 10; // Bonus 10 XP for perfect score
        }
      } else if (
        currentStepData.type === "situational" ||
        currentStepData.type === "situational_challenges"
      ) {
        if (currentStepData.challenges) {
          // Award XP based on number of correct challenges (partial credit)
          xpToAward = totalCorrect * 15; // 15 XP per correct challenge
          if (correct) {
            xpToAward += 10; // Bonus 10 XP for perfect score
          }
        } else {
          // Standard 20 XP for single situational
          xpToAward = correct ? 20 : 0;
        }
      } else {
        // Standard 20 XP for other question types
        xpToAward = correct ? 20 : 0;
      }

      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setXpEarned((prev) => prev + xpToAward);
    }
  };

  // New handleStepComplete function
  const handleStepComplete = (xpAwarded = 10) => {
    if (!completedSteps.has(currentStep)) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setXpEarned((prev) => prev + xpAwarded);
      setStepCompleted(true);

      // Show completion message briefly
      setTimeout(() => {
        setStepCompleted(false);
      }, 3000);
    }
  };

  const handleNext = () => {
    setSelectedAnswer("");
    setSelectedAnswers({});
    setShowFeedback(false);
    setShowTranslation(false); // Reset translation view
    setStepCompleted(false); // Reset step completion indicator
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setSelectedAnswer("");
    setSelectedAnswers({});
    setShowFeedback(false);
    setShowTranslation(false); // Reset translation view
    setStepCompleted(false); // Reset step completion indicator
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleLessonComplete = async () => {
    if (!user) {
      router.push("/dashboard");
      return;
    }

    setCompleting(true);

    try {
      console.log("🏁 Starting lesson completion process...");

      await markLessonComplete(
        user.id,
        lesson.id,
        Math.round((completedSteps.size / steps.length) * 100),
        xpEarned,
        Date.now() - startTime
      );

      console.log(
        "✅ Lesson completion successful, navigating to dashboard..."
      );

      // Small delay to ensure database operations complete
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (error) {
      console.error("❌ Error marking lesson complete:", error);
      setCompleting(false);

      // Even if completion fails, still allow navigation
      router.push("/dashboard");
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playAudio = (audioUrl) => {
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  };

  const translateContent = async (content, key) => {
    // Don't translate if already in English or no preferred language
    if (userPreferredLanguage === "en" || !content) return;

    // Check if already translated
    if (translations[key]) {
      setShowTranslation(!showTranslation);
      return;
    }

    setTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: content,
          targetLanguage: userPreferredLanguage,
          context: "Football/soccer training lesson for young players",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTranslations((prev) => ({ ...prev, [key]: data.translatedText }));
        setShowTranslation(true);
      }
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setTranslating(false);
    }
  };

  const getStepIcon = (stepType) => {
    const iconMap = {
      ai_writing: BookOpen,
      ai_conversation: MessageSquare,
      ai_gap_fill: Target,
      scenario: Globe,
      vocabulary: Book,
      dialogue: MessageSquare,
      dialogue_immersion: MessageSquare,
      pronunciation_drill: Mic,
      audio_recognition: Headphones,
      gap_fill: Target,
      gap_fill_advanced: Target,
      situational: Users,
      situational_challenges: Users,
      completion: Trophy,
      video_analysis_dialogue: Eye,
      interview_simulation: Mic,
      team_talk_structure: Users,
      emergency_scenarios: AlertCircle,
      cultural_insights: Globe,
      phone_simulation: Phone,
      transport_mastery: MapPin,
      social_etiquette: Star,
      problem_solving: Target,
      media_landscape: TrendingUp,
      pain_scale_training: BarChart3,
      motivational_language: Award,
      conflict_resolution: Users,
      building_culture: Calendar,
    };

    const IconComponent = iconMap[stepType] || Book;
    return <IconComponent className="w-5 h-5 dark:text-white" />;
  };

  const renderStepContent = () => {
    if (!currentStepData) return <div>No content available</div>;

    switch (currentStepData.type) {
      case "scenario":
        return (
          <div className="text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6">
              {/* Translation button */}
              {userPreferredLanguage !== "en" && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => {
                      const content = `${currentStepData.content}${currentStepData.cultural_context ? "\n\nCultural Context: " + currentStepData.cultural_context : ""}${currentStepData.reflection_questions ? "\n\nReflection Questions:\n" + currentStepData.reflection_questions.join("\n") : ""}`;
                      translateContent(content, `scenario-${currentStep}`);
                    }}
                    disabled={translating}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-white dark:bg-green-800 text-green-700 dark:text-gray-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-700 transition-colors"
                  >
                    {/* <Languages className="w-4 h-4" /> */}
                    <span>
                      {translating
                        ? "Traduzindo..."
                        : showTranslation
                          ? "Show English"
                          : "Traduzir"}
                    </span>
                  </button>
                </div>
              )}

              {currentStepData.image_url && (
                <img
                  src={currentStepData.image_url}
                  alt="Scenario"
                  className="w-full max-w-md mx-auto rounded-lg shadow-md mb-4"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}

              {/* Show translated or original content */}
              {showTranslation && translations[`scenario-${currentStep}`] ? (
                <div className="space-y-4">
                  <p className="text-lg text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {translations[`scenario-${currentStep}`]}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    (Translated to {userPreferredLanguage})
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                    {currentStepData.content}
                  </p>
                  {currentStepData.cultural_context && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mt-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Cultural Context:</strong>{" "}
                        {currentStepData.cultural_context}
                      </p>
                    </div>
                  )}
                  {currentStepData.reflection_questions && (
                    <div className="mt-4 text-left text-gray-700 dark:text-gray-300 ">
                      <h4 className="font-semibold mb-2">
                        Reflection Questions:
                      </h4>
                      <ul className="text-sm space-y-1">
                        {currentStepData.reflection_questions.map(
                          (question, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-blue-600 mr-2">•</span>
                              {question}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
            {currentStepData.audio_url && (
              <button
                onClick={toggleAudio}
                className="flex items-center space-x-2 mx-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                <span>Listen to Scenario</span>
              </button>
            )}
            <audio ref={audioRef} style={{ display: "none" }} />
          </div>
        );

      case "ai_writing":
        return (
          <AIWritingExercise
            prompt={currentStepData.prompt}
            context={currentStepData.context}
            lessonId={lessonId}
            englishVariant={userEnglishVariant}
            voiceGender={userVoiceGender}
            onComplete={(xp) => {
              setXpEarned((prev) => prev + xp);
              setCompletedSteps((prev) => new Set([...prev, currentStep]));
              // Auto-advance to next step after a short delay
              setTimeout(() => handleNext(), 1000);
            }}
            minWords={currentStepData.minWords || 50}
            maxWords={currentStepData.maxWords || 200}
          />
        );

      case "ai_conversation":
        return (
          <AIConversationPractice
            scenario={currentStepData.scenario}
            context={currentStepData.context}
            lessonId={lessonId}
            englishVariant={userEnglishVariant}
            voiceGender={userVoiceGender}
            onComplete={(xp) => {
              setXpEarned((prev) => prev + xp);
              setCompletedSteps((prev) => new Set([...prev, currentStep]));
              // Auto-advance to next step after a short delay
              setTimeout(() => handleNext(), 1000);
            }}
            maxTurns={currentStepData.maxTurns || 6}
          />
        );

      case "ai_gap_fill":
        return (
          <AIMultipleChoiceGapFill
            sentences={currentStepData.sentences}
            lessonId={lessonId}
            englishVariant={userEnglishVariant}
            voiceGender={userVoiceGender}
            onComplete={(xp) => {
              setXpEarned((prev) => prev + xp);
              setCompletedSteps((prev) => new Set([...prev, currentStep]));
              // Auto-advance to next step after a short delay
              setTimeout(() => handleNext(), 1000);
            }}
          />
        );
      // Use multiple choice for academy demos (beginners)
      // const isAcademyDemo =
      //   lesson?.title?.includes("Academy") ||
      //   lesson?.title?.includes("Trial");
      // return isAcademyDemo ? (
      //   <AIMultipleChoiceGapFill
      //     sentences={currentStepData.sentences}
      //     lessonId={lessonId}
      //     englishVariant={userEnglishVariant}
      //     voiceGender={userVoiceGender}
      //     onComplete={(xp) => {
      //       setXpEarned((prev) => prev + xp);
      //       setCompletedSteps((prev) => new Set([...prev, currentStep]));
      //       // Auto-advance to next step after a short delay
      //       setTimeout(() => handleNext(), 1000);
      //     }}
      //   />
      // ) : (
      //   <AIGapFillExercise
      //     sentences={currentStepData.sentences}
      //     lessonId={lessonId}
      //     onComplete={(xp) => {
      //       setXpEarned((prev) => prev + xp);
      //       setCompletedSteps((prev) => new Set([...prev, currentStep]));
      //       // Auto-advance to next step after a short delay
      //       setTimeout(() => handleNext(), 1000);
      //     }}
      //   />
      // );
      case "vocabulary":
        return (
          <div className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content || "Learn these essential words:"}
            </p>
            <div className="grid gap-4">
              {(currentStepData.vocabulary || currentStepData.words || []).map(
                (item, index) => (
                  <VocabularyItem
                    key={index}
                    item={item}
                    playAudio={playAudio}
                    englishVariant={userEnglishVariant}
                    voiceGender={userVoiceGender}
                  />
                )
              )}
            </div>
          </div>
        );

      case "interactive_pitch":
        return (
          <InteractivePitch
            interactiveConfig={currentStepData.interactive_config}
            lessonId={lessonId}
            onComplete={handleStepComplete}
          />
        );

      case "interactive_game":
        return (
          <InteractiveGame
            gameConfig={currentStepData.game_config}
            lessonId={lessonId}
            onComplete={handleStepComplete}
          />
        );

      case "pronunciation_drill":
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
            <div className="grid gap-4">
              {(currentStepData.phrases || []).map((phrase, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-xl"
                >
                  <div className="text-center mb-4">
                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      &quot;{phrase.text}&quot;
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {phrase.phonetic}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {phrase.translation}
                    </p>
                  </div>
                  <div className="flex justify-center space-x-4">
                    <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      <Volume2 className="w-4 h-4" />
                      <span>Listen</span>
                    </button>
                    <button className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                      <Mic className="w-4 h-4" />
                      <span>Record</span>
                    </button>
                  </div>
                  {phrase.confidence_tips && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-50 rounded text-sm">
                      <strong>Confidence Tip:</strong> {phrase.confidence_tips}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "dialogue":
      case "dialogue_immersion":
        return (
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-6">
              {(
                currentStepData.dialogue ||
                currentStepData.conversation ||
                []
              ).map((line, index) => (
                <div
                  key={index}
                  className={`mb-4 ${line.speaker === "João" ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block max-w-xs lg:max-w-md p-3 rounded-lg ${
                      line.speaker === "João"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white border"
                    }`}
                  >
                    <p className="font-semibold text-sm mb-1">{line.speaker}</p>
                    <p>{line.text}</p>
                    {line.cultural_note && (
                      <p className="text-xs mt-2 opacity-75">
                        💡 {line.cultural_note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {currentStepData.audio_url && (
              <button
                onClick={toggleAudio}
                className="flex items-center space-x-2 mx-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                <span>{isPlaying ? "Pause" : "Listen to Dialogue"}</span>
              </button>
            )}
            {currentStepData.key_phrases_to_remember && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="font-semibold mb-2">Key Phrases to Remember:</h4>
                <ul className="text-sm space-y-1">
                  {currentStepData.key_phrases_to_remember.map(
                    (phrase, index) => (
                      <li key={index} className="flex items-start">
                        <Star className="w-4 h-4 text-yellow-500 mr-2 mt-0.5" />
                        &quot;{phrase}&quot;
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        );

      case "gap_fill":
      case "gap_fill_advanced":
        return (
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>

            {currentStepData.scenarios ? (
              // Handle advanced gap fill with multiple scenarios
              <div className="space-y-6">
                {currentStepData.scenarios.map((scenario, scenarioIndex) => {
                  // Split text by underscores and create gaps
                  const textParts = scenario.text.split("_____");
                  const totalGaps = textParts.length - 1;

                  return (
                    <div
                      key={scenarioIndex}
                      className="bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white p-6 rounded-xl"
                    >
                      <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
                        {scenario.context}
                      </h4>
                      <div className="text-lg leading-9 mb-4">
                        {textParts.map((part, partIndex) => (
                          <span key={partIndex}>
                            {/* Handle line breaks in text */}
                            {part.split("\n").map((line, lineIndex, lines) => (
                              <span key={lineIndex}>
                                {line}
                                {lineIndex < lines.length - 1 && <br />}
                              </span>
                            ))}
                            {partIndex < totalGaps && (
                              <select
                                value={
                                  selectedAnswers[
                                    `${scenarioIndex}-${partIndex}`
                                  ] || ""
                                }
                                onChange={(e) =>
                                  setSelectedAnswers((prev) => ({
                                    ...prev,
                                    [`${scenarioIndex}-${partIndex}`]:
                                      e.target.value,
                                  }))
                                }
                                className={`mx-2 px-3 py-1 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[120px] ${
                                  showFeedback
                                    ? selectedAnswers[
                                        `${scenarioIndex}-${partIndex}`
                                      ] ===
                                      scenario.gaps[partIndex]?.correct_answer
                                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                      : "border-red-500 bg-red-50 dark:bg-red-900/20"
                                    : "border-gray-300 dark:border-gray-600"
                                }`}
                                disabled={showFeedback}
                              >
                                <option value="">Choose...</option>
                                {scenario.gaps[partIndex]?.options?.map(
                                  (option, optIndex) => (
                                    <option key={optIndex} value={option}>
                                      {option}
                                    </option>
                                  )
                                )}
                              </select>
                            )}
                          </span>
                        ))}
                      </div>

                      {/* Show individual gap feedback after submission */}
                      {showFeedback && (
                        <div className="mt-4 space-y-2">
                          {scenario.gaps.map((gap, gapIndex) => {
                            const userAnswer =
                              selectedAnswers[`${scenarioIndex}-${gapIndex}`];
                            const isGapCorrect =
                              userAnswer === gap.correct_answer;

                            return (
                              <div
                                key={gapIndex}
                                className={`p-3 rounded text-sm ${
                                  isGapCorrect
                                    ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                                    : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  {isGapCorrect ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <X className="w-4 h-4" />
                                  )}
                                  <span className="font-medium">
                                    Gap {gapIndex + 1}:{" "}
                                    {isGapCorrect ? "Correct!" : "Incorrect"}
                                  </span>
                                </div>
                                {!isGapCorrect && (
                                  <div className="mt-1 text-xs">
                                    You chose: &quot;{userAnswer || "nothing"}
                                    &quot; | Correct answer: &quot;
                                    {gap.correct_answer}&quot;
                                    {gap.explanation && (
                                      <div className="mt-1">
                                        💡 {gap.explanation}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Overall scenario feedback */}
                          {scenario.feedback && (
                            <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-sm">
                              <strong>Feedback:</strong> {scenario.feedback}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Handle standard gap fill - same line break logic
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl mb-6">
                <div className="text-xl leading-relaxed">
                  {currentStepData.text
                    ? currentStepData.text
                        .split("_____")
                        .map((part, partIndex) => {
                          const totalGaps =
                            currentStepData.text.split("_____").length - 1;
                          return (
                            <span key={partIndex}>
                              {/* Handle line breaks in text */}
                              {part
                                .split("\n")
                                .map((line, lineIndex, lines) => (
                                  <span key={lineIndex}>
                                    {line}
                                    {lineIndex < lines.length - 1 && <br />}
                                  </span>
                                ))}
                              {partIndex < totalGaps && (
                                <select
                                  value={
                                    selectedAnswers[`gap-${partIndex}`] || ""
                                  }
                                  onChange={(e) =>
                                    setSelectedAnswers((prev) => ({
                                      ...prev,
                                      [`gap-${partIndex}`]: e.target.value,
                                    }))
                                  }
                                  className={`mx-2 px-3 py-1 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[120px] ${
                                    showFeedback
                                      ? selectedAnswers[`gap-${partIndex}`] ===
                                        currentStepData.gaps[partIndex]
                                          ?.correct_answer
                                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                        : "border-red-500 bg-red-50 dark:bg-red-900/20"
                                      : "border-gray-300 dark:border-gray-600"
                                  }`}
                                  disabled={showFeedback}
                                >
                                  <option value="">Choose...</option>
                                  {currentStepData.gaps[
                                    partIndex
                                  ]?.options?.map((option, optIndex) => (
                                    <option key={optIndex} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </span>
                          );
                        })
                    : null}
                </div>

                {/* Show feedback for standard gap fill */}
                {showFeedback && currentStepData.gaps && (
                  <div className="mt-4 space-y-2">
                    {currentStepData.gaps.map((gap, gapIndex) => {
                      const userAnswer = selectedAnswers[`gap-${gapIndex}`];
                      const isGapCorrect = userAnswer === gap.correct_answer;

                      return (
                        <div
                          key={gapIndex}
                          className={`p-3 rounded text-sm ${
                            isGapCorrect
                              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                              : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {isGapCorrect ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                            <span className="font-medium">
                              Gap {gapIndex + 1}:{" "}
                              {isGapCorrect ? "Correct!" : "Incorrect"}
                            </span>
                          </div>
                          {!isGapCorrect && (
                            <div className="mt-1 text-xs">
                              You chose: &quot;{userAnswer || "nothing"}&quot; |
                              Correct answer: &quot;{gap.correct_answer}&quot;
                              {gap.explanation && (
                                <div className="mt-1">💡 {gap.explanation}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Overall feedback */}
                    {currentStepData.feedback && (
                      <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded text-sm">
                        <strong>Feedback:</strong> {currentStepData.feedback}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!showFeedback && (
              <button
                onClick={handleAnswerSubmit}
                disabled={
                  // Check if any gaps are empty
                  currentStepData.scenarios
                    ? currentStepData.scenarios.some(
                        (scenario, scenarioIndex) =>
                          scenario.gaps.some(
                            (_, gapIndex) =>
                              !selectedAnswers[`${scenarioIndex}-${gapIndex}`]
                          )
                      )
                    : currentStepData.gaps?.some(
                        (_, gapIndex) => !selectedAnswers[`gap-${gapIndex}`]
                      )
                }
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Check Answers
              </button>
            )}

            {showFeedback && (
              <div className="mt-4">
                <div
                  className={`p-4 rounded-lg ${isCorrect ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                >
                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {isCorrect
                        ? `Perfect! All answers correct. +${20 * (currentStepData.scenarios?.reduce((total, scenario) => total + scenario.gaps.length, 0) || currentStepData.gaps?.length || 1)} XP`
                        : "Some answers need work. Review the feedback above and try to remember the correct answers!"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "situational":
      case "situational_challenges":
        return (
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>

            {currentStepData.challenges ? (
              // Handle challenges format
              <div className="space-y-6">
                {currentStepData.challenges.map((challenge, challengeIndex) => (
                  <div
                    key={challengeIndex}
                    className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-xl"
                  >
                    <div className="mb-4">
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">
                        Situation {challengeIndex + 1}:
                      </p>
                      <p className="text-lg italic text-gray-700 dark:text-gray-300 mb-4">
                        &quot;{challenge.scenario}&quot;
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {challenge.challenge}
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      {challenge.options?.map((option, optIndex) => (
                        <button
                          key={optIndex}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({
                              ...prev,
                              [`challenge-${challengeIndex}`]: option,
                            }))
                          }
                          className={`w-full p-4 text-left rounded-lg border transition-colors ${
                            selectedAnswers[`challenge-${challengeIndex}`] ===
                            option
                              ? showFeedback
                                ? option === challenge.correct_answer
                                  ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                                  : "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                                : "text-gray-900 dark:text-white border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                          }`}
                          disabled={showFeedback}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    {/* Individual challenge feedback */}
                    {showFeedback && (
                      <div className="space-y-3">
                        <div
                          className={`p-4 rounded-lg ${
                            selectedAnswers[`challenge-${challengeIndex}`] ===
                            challenge.correct_answer
                              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                              : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            {selectedAnswers[`challenge-${challengeIndex}`] ===
                            challenge.correct_answer ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <X className="w-5 h-5" />
                            )}
                            <span className="font-semibold">
                              {selectedAnswers[
                                `challenge-${challengeIndex}`
                              ] === challenge.correct_answer
                                ? "Correct! Excellent choice!"
                                : "Not quite right"}
                            </span>
                          </div>

                          {selectedAnswers[`challenge-${challengeIndex}`] !==
                            challenge.correct_answer && (
                            <div className="text-sm mb-2">
                              <strong>You chose:</strong> &quot;
                              {selectedAnswers[`challenge-${challengeIndex}`] ||
                                "nothing"}
                              &quot;
                              <br />
                              <strong>Correct answer:</strong> &quot;
                              {challenge.correct_answer}&quot;
                            </div>
                          )}

                          {challenge.explanation && (
                            <div className="text-sm">
                              <strong>Explanation:</strong>{" "}
                              {challenge.explanation}
                            </div>
                          )}
                        </div>

                        {challenge.follow_up_tips && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                            <p className="font-semibold mb-1 text-blue-800 dark:text-blue-200">
                              Tips for next time:
                            </p>
                            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                              {challenge.follow_up_tips.map((tip, tipIndex) => (
                                <li key={tipIndex} className="flex items-start">
                                  <span className="text-blue-600 mr-2">•</span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Handle standard situational format (backwards compatibility)
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-xl mb-6">
                <p className="font-semibold text-gray-900 dark:text-white mb-4">
                  Situation:
                </p>
                <p className="text-lg italic text-gray-700 dark:text-gray-300 mb-4">
                  &quot;{currentStepData.situation}&quot;
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentStepData.question}
                </p>
              </div>
            )}

            {!currentStepData.challenges && (
              <>
                <div className="space-y-3 mb-6">
                  {currentStepData.options?.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedAnswer(option)}
                      className={`w-full p-4 text-left rounded-lg border transition-colors ${
                        selectedAnswer === option
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      }`}
                      disabled={showFeedback}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {!showFeedback && (
                  <button
                    onClick={handleAnswerSubmit}
                    disabled={!selectedAnswer}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Submit Answer
                  </button>
                )}
                {showFeedback && (
                  <div
                    className={`p-4 rounded-lg mb-4 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      {isCorrect ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <X className="w-5 h-5" />
                      )}
                      <span className="font-semibold">
                        {isCorrect
                          ? "Excellent choice! +20 XP"
                          : "Good try! Here's why this matters:"}
                      </span>
                    </div>
                    {currentStepData.explanation && (
                      <p className="text-sm mt-2">
                        {currentStepData.explanation}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Submit button for challenges */}
            {currentStepData.challenges && !showFeedback && (
              <button
                onClick={handleAnswerSubmit}
                disabled={
                  // Check if all challenges have been answered
                  currentStepData.challenges.some(
                    (_, challengeIndex) =>
                      !selectedAnswers[`challenge-${challengeIndex}`]
                  )
                }
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Submit Answers
              </button>
            )}

            {/* Overall feedback for challenges */}
            {currentStepData.challenges && showFeedback && (
              <div className="mt-6">
                <div
                  className={`p-4 rounded-lg ${isCorrect ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
                >
                  <div className="flex items-center space-x-2">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {isCorrect
                        ? `Perfect! All situations handled correctly. +${20 * currentStepData.challenges.length} XP`
                        : `You got ${
                            currentStepData.challenges.filter(
                              (challenge, index) =>
                                selectedAnswers[`challenge-${index}`] ===
                                challenge.correct_answer
                            ).length
                          } out of ${currentStepData.challenges.length} correct. Keep practicing!`}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case "audio_recognition":
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
            <div className="grid gap-6">
              {(currentStepData.audio_clips || []).map((clip, index) => (
                <div
                  key={index}
                  className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Audio Clip {index + 1}</h4>
                    <button
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      onClick={() => playAudio(clip.audio_url)}
                    >
                      <Headphones className="w-4 h-4" />
                      <span>Listen</span>
                    </button>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    <strong>Instruction:</strong> {clip.instruction}
                  </p>
                  {clip.key_actions && (
                    <div className="mb-3">
                      <strong>Key Actions:</strong>
                      <ul className="mt-1 text-sm">
                        {clip.key_actions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-start">
                            <span className="text-green-600 mr-2">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {clip.your_response && (
                    <div className="p-3 bg-white dark:bg-gray-800 rounded border-l-4 border-green-500">
                      <strong>Your Response:</strong> &quot;{clip.your_response}
                      &quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "cultural_insights":
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
            <div className="grid gap-6">
              {(currentStepData.insights || []).map((insight, index) => (
                <div
                  key={index}
                  className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl"
                >
                  <div className="flex items-start space-x-3 mb-4">
                    <div
                      className={`w-3 h-3 rounded-full mt-2 ${
                        insight.importance === "Critical"
                          ? "bg-red-500"
                          : insight.importance === "Very Important"
                            ? "bg-orange-500"
                            : "bg-yellow-500"
                      }`}
                    ></div>
                    <div className="flex-grow">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {insight.topic}
                      </h4>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          insight.importance === "Critical"
                            ? "bg-red-100 text-red-800"
                            : insight.importance === "Very Important"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {insight.importance}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {insight.explanation}
                  </p>
                  {insight.practical_tips && (
                    <div>
                      <h5 className="font-semibold mb-2 text-gray-900 dark:text-white">
                        Practical Tips:
                      </h5>
                      <ul className="text-sm space-y-1">
                        {insight.practical_tips.map((tip, tipIndex) => (
                          <li
                            key={tipIndex}
                            className="flex items-start text-gray-700 dark:text-gray-300"
                          >
                            <span className="text-blue-600 mr-2">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "emergency_scenarios":
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
            <div className="grid gap-6">
              {(currentStepData.emergency_types || []).map(
                (emergency, index) => (
                  <div
                    key={index}
                    className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border-l-4 border-red-500"
                  >
                    <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      {emergency.emergency}
                    </h4>

                    {emergency.immediate_actions && (
                      <div className="mb-4">
                        <h5 className="font-semibold mb-2">
                          Immediate Actions:
                        </h5>
                        <ul className="text-sm space-y-1">
                          {emergency.immediate_actions.map(
                            (action, actionIndex) => (
                              <li
                                key={actionIndex}
                                className="flex items-start"
                              >
                                <span className="text-red-600 mr-2">1.</span>
                                {action}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    {emergency.what_to_say && (
                      <div className="mb-4">
                        <h5 className="font-semibold mb-2">What to Say:</h5>
                        <div className="bg-white dark:bg-gray-800 p-3 rounded space-y-2">
                          {emergency.what_to_say.map((phrase, phraseIndex) => (
                            <p key={phraseIndex} className="text-sm font-mono">
                              &quot;{phrase}&quot;
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {emergency.phone_emergency && (
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded">
                        <strong>Emergency Number:</strong>{" "}
                        {emergency.phone_emergency}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        );

      case "interactive_map":
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>

            {/* Interactive Map Container */}
            <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-6 rounded-xl">
              <div className="relative">
                {/* Map Image */}
                <img
                  src={
                    currentStepData.map_image ||
                    "/images/training-ground-map.jpg"
                  }
                  alt="Interactive Map"
                  className="w-full max-w-2xl mx-auto rounded-lg shadow-md"
                  onError={(e) => {
                    e.target.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f3f4f6'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%236b7280' font-size='16'%3EInteractive Map Coming Soon%3C/text%3E%3C/svg%3E";
                  }}
                />

                {/* Interactive Elements */}
                {currentStepData.interactive_elements?.map((element, index) => (
                  <div
                    key={index}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{
                      left: element.x || `${20 + index * 15}%`,
                      top: element.y || `${30 + index * 15}%`,
                    }}
                    onClick={() => {
                      // Handle click - show popup or info
                      alert(element.popup || `Learn about: ${element.area}`);
                    }}
                  >
                    <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-blue-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {element.popup || element.area}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend/Instructions */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Click on the highlighted areas to explore and learn key
                  vocabulary
                </p>
              </div>
            </div>

            {/* Vocabulary Review */}
            {currentStepData.interactive_elements && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3 text-black dark:text-white">
                  Areas to Explore:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {currentStepData.interactive_elements.map(
                    (element, index) => (
                      <div
                        key={index}
                        className="p-3 bg-white dark:bg-gray-800 rounded border"
                      >
                        <h5 className="collapse font-medium text-black dark:text-gray-300">
                          {element.area}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {element.popup}
                        </p>
                        {element.vocab_review && (
                          <div className="mt-2">
                            <span className="text-xs text-blue-600">
                              Key words: {element.vocab_review.join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case "confidence_building":
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>

            <div className="grid gap-6">
              {(currentStepData.strategies || []).map((strategy, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-6 rounded-xl"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {strategy.strategy}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {strategy.description}
                      </p>

                      {strategy.examples && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2 text-gray-900 dark:text-white">
                            Examples:
                          </h4>
                          <ul className="space-y-1">
                            {strategy.examples.map((example, exIndex) => (
                              <li
                                key={exIndex}
                                className="text-sm text-gray-600 dark:text-gray-300 flex items-start"
                              >
                                <span className="text-green-600 mr-2">•</span>
                                &quot;
                                {example}&quot;
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {strategy.tips && (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded border-l-4 border-green-500">
                          <h4 className="font-medium mb-1 text-gray-900 dark:text-white">
                            Tips:
                          </h4>
                          <ul className="text-sm space-y-1">
                            {strategy.tips.map((tip, tipIndex) => (
                              <li
                                key={tipIndex}
                                className="text-gray-600 dark:text-gray-300"
                              >
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {strategy.mindset && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>Mindset:</strong> {strategy.mindset}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "problem_solving":
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>

            <div className="space-y-6">
              {(currentStepData.problems || []).map((problem, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        problem.urgency === "High"
                          ? "bg-red-500"
                          : problem.urgency === "Medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {problem.problem}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            problem.urgency === "High"
                              ? "bg-red-100 text-red-800"
                              : problem.urgency === "Medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {problem.urgency} Priority
                        </span>
                      </div>

                      {problem.who_to_contact && (
                        <div className="mb-3">
                          <strong>Who to contact:</strong>{" "}
                          {problem.who_to_contact}
                        </div>
                      )}

                      {problem.what_to_say && (
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h4 className="font-medium mb-2">What to say:</h4>
                          <p className="text-sm font-mono bg-white dark:bg-gray-800 p-3 rounded border-l-4 border-blue-500">
                            &quot;{problem.what_to_say}&quot;
                          </p>
                        </div>
                      )}

                      {problem.solution_steps && (
                        <div className="mb-3">
                          <h4 className="font-medium mb-2">Solution Steps:</h4>
                          <ol className="text-sm space-y-1">
                            {problem.solution_steps.map((step, stepIndex) => (
                              <li key={stepIndex} className="flex items-start">
                                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2 mt-0.5">
                                  {stepIndex + 1}
                                </span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {problem.your_rights && (
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>Your Rights:</strong> {problem.your_rights}
                          </p>
                        </div>
                      )}

                      {problem.cultural_tip && (
                        <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                          <p className="text-sm text-purple-800 dark:text-purple-200">
                            <strong>Cultural Tip:</strong>{" "}
                            {problem.cultural_tip}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "position_specific":
        return (
          <div className="space-y-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>

            <div className="space-y-6">
              {Object.entries(
                currentStepData.midfielder_communications || {}
              ).map(([situationType, situationData], index) => (
                <div
                  key={index}
                  className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-6 rounded-xl"
                >
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    {situationType
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </h3>

                  {situationData.what_teammates_shout && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                        What teammates shout to you:
                      </h4>
                      <div className="grid gap-2">
                        {situationData.what_teammates_shout.map(
                          (shout, shoutIndex) => (
                            <div
                              key={shoutIndex}
                              className="bg-white dark:bg-gray-800 p-3 rounded border-l-4 border-blue-500"
                            >
                              <span className="font-mono text-blue-600 dark:text-blue-400">
                                &quot;{shout.split(" - ")[0]}&quot;
                              </span>
                              {shout.includes(" - ") && (
                                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                  - {shout.split(" - ")[1]}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {situationData.your_responses && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Your responses:
                      </h4>
                      <div className="grid gap-2">
                        {situationData.your_responses.map(
                          (response, responseIndex) => (
                            <div
                              key={responseIndex}
                              className="bg-white dark:bg-gray-800 p-3 rounded border-l-4 border-green-500"
                            >
                              <span className="font-mono text-green-600 dark:text-green-400">
                                &quot;{response.split(" - ")[0]}&quot;
                              </span>
                              {response.includes(" - ") && (
                                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                  - {response.split(" - ")[1]}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {situationData.leadership_phrases && (
                    <div>
                      <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Leadership phrases:
                      </h4>
                      <div className="grid gap-2">
                        {situationData.leadership_phrases.map(
                          (phrase, phraseIndex) => (
                            <div
                              key={phraseIndex}
                              className="bg-white dark:bg-gray-800 p-3 rounded border-l-4 border-purple-500"
                            >
                              <span className="font-mono text-purple-600 dark:text-purple-400">
                                &quot;{phrase.split(" - ")[0]}&quot;
                              </span>
                              {phrase.includes(" - ") && (
                                <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                  - {phrase.split(" - ")[1]}
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "injury_dialogue":
        // Reuse dialogue logic but with medical styling
        return (
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 mb-6 border-l-4 border-red-500">
              {(currentStepData.dialogue || []).map((line, index) => (
                <div key={index} className="mb-4">
                  <div
                    className={`p-3 rounded-lg ${
                      line.speaker === "João"
                        ? "bg-blue-100 dark:bg-blue-900/30 ml-8"
                        : "bg-white dark:bg-gray-800 mr-8"
                    }`}
                  >
                    <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">
                      {line.speaker}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      {line.text}
                    </p>
                    {line.professional_approach && (
                      <p className="text-xs mt-2 text-green-600 dark:text-green-400">
                        💡 {line.professional_approach}
                      </p>
                    )}
                    {line.good_reporting && (
                      <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                        ✅ {line.good_reporting}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Key Communication Points:</h4>
              <ul className="text-sm space-y-1">
                <li>• Be specific about timing and location</li>
                <li>• Describe pain using 0-10 scale</li>
                <li>• Mention what makes it better/worse</li>
                <li>• Report changes since the injury occurred</li>
              </ul>
            </div>
          </div>
        );

      // Add cases for other step types...
      case "pain_scale_training":
      case "media_landscape":
      case "motivational_language":
      case "conflict_resolution":
      case "team_talk_structure":
      case "phone_simulation":
      case "transport_mastery":
      case "social_etiquette":
      case "problem_solving":
      case "building_culture":
      case "interview_simulation":
      case "video_analysis_dialogue":
        return (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-xl">
            <div className="flex items-center space-x-2 mb-4">
              {getStepIcon(currentStepData.type)}
              <h3 className="text-lg font-semibold">{currentStepData.title}</h3>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              {currentStepData.content}
            </p>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> This advanced step type (
                {currentStepData.type}) is being developed. The content
                structure is ready and will be fully interactive soon.
              </p>
            </div>
            {/* Display raw content for debugging */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500">
                View content structure
              </summary>
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 overflow-auto">
                {JSON.stringify(currentStepData, null, 2)}
              </pre>
            </details>
          </div>
        );

      // FIXED: Completion step with better button handling
      case "completion":
        return (
          <div className="text-center">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-8 rounded-xl">
              {/* Translation button */}
              {userPreferredLanguage !== "en" && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => {
                      const content = `${currentStepData.content}${currentStepData.cultural_context ? "\n\nCultural Context: " + currentStepData.cultural_context : ""}${currentStepData.reflection_questions ? "\n\nReflection Questions:\n" + currentStepData.reflection_questions.join("\n") : ""}`;
                      translateContent(content, `scenario-${currentStep}`);
                    }}
                    disabled={translating}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-white dark:bg-green-800 text-green-700 dark:text-gray-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-700 transition-colors"
                  >
                    {/* <Languages className="w-4 h-4" /> */}
                    <span>
                      {translating
                        ? "Traduzindo..."
                        : showTranslation
                          ? "Show English"
                          : "Traduzir"}
                    </span>
                  </button>
                </div>
              )}

              {currentStepData.image_url && (
                <img
                  src={currentStepData.image_url}
                  alt="Scenario"
                  className="w-full max-w-md mx-auto rounded-lg shadow-md mb-4"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}

              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />

              {/* Show translated or original content */}
              {showTranslation && translations[`completion-${currentStep}`] ? (
                <div className="space-y-4 mb-6">
                  <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                    {translations[`completion-${currentStep}`]}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    (Translated to {userPreferredLanguage})
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Lesson Complete!
                  </h3>
                  <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                    Great job! You&apos;ve completed &quot;{lesson.title}&quot;
                  </p>

                  {currentStepData.achievements && (
                    <div className="text-left max-w-md mx-auto space-y-2 mb-6">
                      <h4 className="font-semibold text-center mb-3">
                        Achievements:
                      </h4>
                      {currentStepData.achievements.map(
                        (achievement, index) => (
                          <p
                            key={index}
                            className="text-gray-700 dark:text-gray-300 text-sm"
                          >
                            {achievement}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg inline-block mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Total XP Earned
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {xpEarned} XP
                </p>
              </div>

              <button
                onClick={handleLessonComplete}
                disabled={completing}
                className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Progress...</span>
                  </div>
                ) : (
                  "Return to Dashboard"
                )}
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">
              Unknown step type: {currentStepData.type}
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                This step type needs to be implemented in the lesson renderer.
              </p>
              <details>
                <summary className="cursor-pointer">View step data</summary>
                <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2 overflow-auto text-left">
                  {JSON.stringify(currentStepData, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600 dark:text-gray-300">
              {lesson.pillar?.display_name || "Lesson"}
            </span>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {lesson.title}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {lesson.pillar?.display_name || "Lesson"}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {lesson.difficulty}
              </span>
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                {lesson.xp_reward} XP Available
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              XP Earned
            </p>
            <p className="text-2xl font-bold text-green-600">{xpEarned}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>
            Step {currentStep + 1} of {steps.length}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          {getStepIcon(currentStepData?.type)}
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {currentStepData?.title || `Step ${currentStep + 1}`}
          </h2>
        </div>

        {/* Step completion indicator */}
        {stepCompleted && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">
              {userPreferredLanguage === "pt-BR"
                ? "Etapa Concluída! Muito bem!"
                : userPreferredLanguage === "es"
                  ? "¡Paso Completado! ¡Muy bien!"
                  : userPreferredLanguage === "fr"
                    ? "Étape Terminée! Très bien!"
                    : "Step Complete! Great job!"}
            </span>
          </div>
        )}

        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0 || completing}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {completedSteps.size} of {steps.length - 1} steps completed
          </p>
          {completing && (
            <p className="text-xs text-blue-600 mt-1">Saving progress...</p>
          )}
        </div>

        <button
          onClick={
            currentStep === steps.length - 1 ? handleLessonComplete : handleNext
          }
          disabled={
            completing ||
            (currentStep === steps.length - 1 &&
              currentStepData?.type !== "completion")
          }
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {completing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Completing...</span>
            </>
          ) : (
            <>
              <span>
                {currentStep === steps.length - 1
                  ? "Complete Lesson"
                  : "Continue"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function DynamicLessonPage() {
  return (
    <ProtectedRoute>
      <DynamicLessonContent />
    </ProtectedRoute>
  );
}
