// src/app/(site)/lesson/[id]/page.js
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play,
  Pause,
  CheckCircle,
  X,
  Volume2,
  //   Mic,
  ArrowRight,
  Trophy,
  ArrowLeft,
  Home,
} from "lucide-react";
import { getLessonById, markLessonComplete } from "@/lib/supabase/queries";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

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
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const audioRef = useRef(null);

  // Fetch lesson data
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
  }, [lessonId]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded mb-8"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
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
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const lessonContent = lesson.content;
  const steps = lessonContent?.steps || [];
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) return;

    let correct = false;
    if (currentStepData.type === "gap_fill") {
      correct =
        currentStepData.correct_answers?.includes(selectedAnswer) ||
        currentStepData.correctAnswers?.includes(selectedAnswer);
    } else if (currentStepData.type === "situational") {
      correct =
        selectedAnswer === currentStepData.correct_answer ||
        selectedAnswer === currentStepData.correctAnswer;
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct && !completedSteps.has(currentStep)) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setXpEarned((prev) => prev + 20);
    }
  };

  const handleNext = () => {
    setSelectedAnswer("");
    setShowFeedback(false);
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setSelectedAnswer("");
    setShowFeedback(false);
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleLessonComplete = async () => {
    if (user) {
      try {
        await markLessonComplete(
          user.id,
          lesson.id,
          Math.round((completedSteps.size / steps.length) * 100),
          xpEarned,
          Date.now() - startTime
        );
      } catch (error) {
        console.error("Error marking lesson complete:", error);
      }
    }
    router.push("/dashboard");
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

  const renderStepContent = () => {
    if (!currentStepData) return <div>No content available</div>;

    switch (currentStepData.type) {
      case "scenario":
        return (
          <div className="text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6">
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
              <p className="text-lg text-gray-700 dark:text-gray-300">
                {currentStepData.content}
              </p>
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
          </div>
        );

      case "vocabulary":
        return (
          <div className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content || "Learn these essential words:"}
            </p>
            <div className="grid gap-4">
              {(currentStepData.vocabulary || currentStepData.words || []).map(
                (item, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-gray-900 dark:text-white text-lg">
                          {item.word || item.english}
                        </span>
                        {item.pronunciation && (
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            {item.pronunciation}
                          </span>
                        )}
                      </div>
                      <button className="text-blue-600 hover:text-blue-700">
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      {item.translation}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        );

      case "dialogue":
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
          </div>
        );

      case "gap_fill":
      case "gap-fill":
        return (
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl mb-6">
              <div className="text-xl leading-relaxed">
                {currentStepData.text.split("{}").map((part, index) => (
                  <span key={index}>
                    {part}
                    {index < (currentStepData.gaps || 1) && (
                      <select
                        value={selectedAnswer}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        className="mx-2 px-3 py-1 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={showFeedback}
                      >
                        <option value="">Choose...</option>
                        {currentStepData.options.map((option, optIndex) => (
                          <option key={optIndex} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                  </span>
                ))}
              </div>
            </div>
            {!showFeedback && (
              <button
                onClick={handleAnswerSubmit}
                disabled={!selectedAnswer}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Check Answer
              </button>
            )}
            {showFeedback && (
              <div
                className={`p-4 rounded-lg mb-4 ${isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
              >
                <div className="flex items-center space-x-2">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <X className="w-5 h-5" />
                  )}
                  <span className="font-semibold">
                    {isCorrect
                      ? "Correct! +20 XP"
                      : "Not quite right. Try again!"}
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case "situational":
        return (
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
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
            <div className="space-y-3 mb-6">
              {currentStepData.options.map((option, index) => (
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
                  <p className="text-sm mt-2">{currentStepData.explanation}</p>
                )}
              </div>
            )}
          </div>
        );

      case "completion":
        return (
          <div className="text-center">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-8 rounded-xl">
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Lesson Complete!
              </h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                Great job! You&apos;ve completed &quot;{lesson.title}&quot;
              </p>
              <div className="text-left max-w-md mx-auto space-y-2 mb-6">
                {currentStepData.summary?.map((item, index) => (
                  <p key={index} className="text-gray-700 dark:text-gray-300">
                    {item}
                  </p>
                ))}
              </div>
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
                className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Unknown step type: {currentStepData.type}
            </p>
            <pre className="text-xs text-gray-400 mt-4 overflow-auto">
              {JSON.stringify(currentStepData, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const startTime = Date.now();

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
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          {currentStepData?.title || `Step ${currentStep + 1}`}
        </h2>
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {completedSteps.size} of {steps.length - 1} steps completed
          </p>
        </div>

        <button
          onClick={
            currentStep === steps.length - 1 ? handleLessonComplete : handleNext
          }
          disabled={
            currentStep === steps.length - 1 &&
            currentStepData?.type !== "completion"
          }
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>
            {currentStep === steps.length - 1 ? "Complete Lesson" : "Continue"}
          </span>
          <ArrowRight className="w-4 h-4" />
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
