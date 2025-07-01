// src/app/(site)/lesson/page.js
"use client";

import React, { useState, useRef } from "react";
import {
  Play,
  Pause,
  // RotateCcw,
  CheckCircle,
  X,
  Volume2,
  Mic,
  ArrowRight,
  Trophy,
  // Target,
} from "lucide-react";

export default function InteractiveLessonDemo() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const audioRef = useRef(null);

  const lessonData = {
    title: "First Day at Training",
    pillar: "Survival English",
    difficulty: "Beginner",
    xpReward: 150,
    description:
      "Learn essential phrases for your first day at the training ground",
    steps: [
      {
        type: "scenario",
        title: "Scenario Introduction",
        content:
          "You're João, a new midfielder who just signed with Watford FC. It's your first day at the training ground and you need to introduce yourself to your new teammates and coaching staff.",
        image: "/api/placeholder/400/250",
        audio: "/audio/scenario-intro.mp3",
      },
      {
        type: "vocabulary",
        title: "Key Vocabulary",
        content: "Let's learn some essential words you'll need:",
        vocabulary: [
          {
            word: "training ground",
            translation: "campo de treinamento",
            pronunciation: "/ˈtreɪnɪŋ ɡraʊnd/",
          },
          {
            word: "teammate",
            translation: "companheiro de equipe",
            pronunciation: "/ˈtiːmmeɪt/",
          },
          {
            word: "coaching staff",
            translation: "comissão técnica",
            pronunciation: "/ˈkoʊtʃɪŋ stæf/",
          },
          {
            word: "warm-up",
            translation: "aquecimento",
            pronunciation: "/ˈwɔːrm ʌp/",
          },
        ],
      },
      {
        type: "dialogue",
        title: "Listen & Learn",
        content: "Listen to this conversation between João and his new coach:",
        dialogue: [
          {
            speaker: "Coach",
            text: "Good morning! You must be João. Welcome to Watford!",
          },
          {
            speaker: "João",
            text: "Good morning, Coach. Thank you! I'm excited to be here.",
          },
          {
            speaker: "Coach",
            text: "Excellent! Let me introduce you to the team. Training starts in 10 minutes.",
          },
          { speaker: "João", text: "Perfect. Where should I put my kit?" },
        ],
        audio: "/audio/dialogue-1.mp3",
      },
      {
        type: "gap-fill",
        title: "Practice Time",
        content: "Complete this dialogue using what you've learned:",
        text: "Coach: Good morning! You must be {}. Welcome to {}!",
        options: ["João", "Watford", "training", "excited"],
        correctAnswers: ["João", "Watford"],
        gaps: 2,
      },
      {
        type: "pronunciation",
        title: "Pronunciation Practice",
        content: "Practice saying these key phrases:",
        phrases: [
          { text: "Good morning, Coach", phonetic: "/ɡʊd ˈmɔːrnɪŋ koʊtʃ/" },
          {
            text: "I'm excited to be here",
            phonetic: "/aɪm ɪkˈsaɪtɪd tu bi hɪr/",
          },
          {
            text: "Where should I put my kit?",
            phonetic: "/wer ʃʊd aɪ pʊt maɪ kɪt/",
          },
        ],
      },
      {
        type: "situational",
        title: "Real-World Application",
        content: "Choose the best response for this situation:",
        situation:
          "A teammate approaches you and says: 'Hey mate, good to have you on the team!'",
        question: "What's the most appropriate response?",
        options: [
          "Thank you! I'm happy to be here and looking forward to playing with everyone.",
          "Yes, I am very good player.",
          "OK.",
          "I don't understand.",
        ],
        correctAnswer:
          "Thank you! I'm happy to be here and looking forward to playing with everyone.",
        explanation:
          "This response is polite, shows enthusiasm, and demonstrates good team spirit - exactly what teammates want to hear!",
      },
      {
        type: "completion",
        title: "Lesson Complete!",
        content:
          "Great job! You've mastered the basics of your first day at training.",
        summary: [
          "✅ Learned key training ground vocabulary",
          "✅ Practiced polite introductions",
          "✅ Understood coach-player dialogue",
          "✅ Applied knowledge in real situations",
        ],
      },
    ],
  };

  const currentStepData = lessonData.steps[currentStep];
  const progress = ((currentStep + 1) / lessonData.steps.length) * 100;

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) return;

    let correct = false;
    if (currentStepData.type === "gap-fill") {
      correct = currentStepData.correctAnswers.includes(selectedAnswer);
    } else if (currentStepData.type === "situational") {
      correct = selectedAnswer === currentStepData.correctAnswer;
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
    if (currentStep < lessonData.steps.length - 1) {
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
    switch (currentStepData.type) {
      case "scenario":
        return (
          <div className="text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6">
              <img
                src="/images/coach_training_players.jpeg"
                alt="Training ground scenario"
                className="w-full max-w-md mx-auto rounded-lg shadow-md mb-4"
              />
              <p className="text-lg text-gray-700 dark:text-gray-300">
                {currentStepData.content}
              </p>
            </div>
            <button
              onClick={toggleAudio}
              className="flex items-center space-x-2 mx-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen to Scenario</span>
            </button>
          </div>
        );

      case "vocabulary":
        return (
          <div className="space-y-4">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
            <div className="grid gap-4">
              {currentStepData.vocabulary.map((item, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white text-lg">
                        {item.word}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">
                        {item.pronunciation}
                      </span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700">
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    {item.translation}
                  </p>
                </div>
              ))}
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
              {currentStepData.dialogue.map((line, index) => (
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
          </div>
        );

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
                    {index < currentStepData.gaps && (
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

      case "pronunciation":
        return (
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              {currentStepData.content}
            </p>
            <div className="space-y-4">
              {currentStepData.phrases.map((phrase, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white text-lg">
                      {phrase.text}
                    </span>
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-700">
                        <Volume2 className="w-5 h-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-700">
                        <Mic className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {phrase.phonetic}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                💡 Tip: Click the microphone to record yourself and get
                pronunciation feedback!
              </p>
            </div>
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
                {currentStepData.title}
              </h3>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                {currentStepData.content}
              </p>
              <div className="text-left max-w-md mx-auto space-y-2 mb-6">
                {currentStepData.summary.map((item, index) => (
                  <p key={index} className="text-gray-700 dark:text-gray-300">
                    {item}
                  </p>
                ))}
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg inline-block">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Total XP Earned
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {xpEarned} XP
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Unknown step type</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {lessonData.title}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {lessonData.pillar}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {lessonData.difficulty}
              </span>
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                {lessonData.xpReward} XP Available
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
            Step {currentStep + 1} of {lessonData.steps.length}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          {currentStepData.title}
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
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>Previous</span>
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {completedSteps.size} of {lessonData.steps.length - 1} steps
            completed
          </p>
        </div>

        <button
          onClick={handleNext}
          disabled={currentStep === lessonData.steps.length - 1}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>
            {currentStep === lessonData.steps.length - 1
              ? "Lesson Complete"
              : "Continue"}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Demo Notification */}
      {/* <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-blue-600 to-green-500 text-white p-4 rounded-lg shadow-lg md:left-auto md:right-4 md:max-w-sm">
        <p className="font-semibold mb-1">🎮 Interactive Demo</p>
        <p className="text-sm opacity-90">
          This is a sample lesson showing FieldTalk&apos;s interactive learning
          experience.
        </p>
      </div> */}
    </div>
  );
}
