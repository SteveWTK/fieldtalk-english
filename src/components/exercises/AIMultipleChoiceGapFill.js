// src/components/exercises/AIMultipleChoiceGapFill.js
"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Lightbulb,
  Target,
  AlertTriangle,
  Zap,
  Play,
  Pause,
} from "lucide-react";

export default function AIMultipleChoiceGapFill({
  sentences,
  lessonId,
  onComplete,
  englishVariant = "british",
  voiceGender = "male",
}) {
  // Create unique localStorage key for this lesson and component
  const STORAGE_KEY = `lesson-${lessonId}-aiGapFill-progress`;

  // Initialize state with localStorage data if available
  const [answers, setAnswers] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.answers || {};
        } catch (e) {
          console.error("Error loading saved progress:", e);
        }
      }
    }
    return {};
  });

  const [showFeedback, setShowFeedback] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.showFeedback || {};
        } catch {}
      }
    }
    return {};
  });

  const [hints, setHints] = useState({});
  const [loadingHint, setLoadingHint] = useState({});
  const [attempts, setAttempts] = useState({});
  const [completed, setCompleted] = useState(false);
  const [playingAudio, setPlayingAudio] = useState({});

  // Enhanced hint tracking
  const [hintUsage, setHintUsage] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.hintUsage || {};
        } catch {}
      }
    }
    return {};
  });
  const [hintHistory, setHintHistory] = useState({}); // Store all hints per gap
  const MAX_HINTS_PER_GAP = 2;

  // Save progress to localStorage whenever relevant state changes
  React.useEffect(() => {
    if (typeof window !== "undefined" && !completed) {
      const progressData = {
        answers,
        showFeedback,
        hintUsage,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
    }
  }, [answers, showFeedback, hintUsage, STORAGE_KEY, completed]);

  // Clear localStorage when component unmounts or step is completed
  React.useEffect(() => {
    if (completed) {
      // Clear progress when completed
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [completed, STORAGE_KEY]);

  // Get options for each sentence
  const getOptions = (sentence) => {
    // New structure: expect 'options' array with 4 items
    if (sentence.options && sentence.options.length >= 4) {
      // Shuffle the provided options to randomize order
      return [...sentence.options].sort(() => Math.random() - 0.5);
    }

    // Fallback for old structure (backward compatibility)
    if (sentence.correct_answers && sentence.correct_answers.length > 0) {
      const correctAnswers = sentence.correct_answers;
      const options = [...correctAnswers];

      // Add some common wrong options for variety
      const commonWrongOptions = {
        trial: ["test", "game", "match"],
        academy: ["school", "university", "college"],
        opportunity: ["chance", "moment", "time"],
        dream: ["wish", "hope", "goal"],
        practice: ["play", "study", "work"],
        improve: ["change", "help", "try"],
        coach: ["teacher", "manager", "captain"],
        teammates: ["friends", "players", "team"],
      };

      // Add wrong options if available
      correctAnswers.forEach((correct) => {
        const wrongOpts = commonWrongOptions[correct.toLowerCase()];
        if (wrongOpts) {
          wrongOpts.forEach((wrong) => {
            if (!options.includes(wrong) && options.length < 4) {
              options.push(wrong);
            }
          });
        }
      });

      // Fill remaining slots with generic options if needed
      const genericOptions = [
        "play",
        "go",
        "make",
        "take",
        "good",
        "great",
        "big",
        "new",
      ];
      genericOptions.forEach((opt) => {
        if (!options.includes(opt) && options.length < 4) {
          options.push(opt);
        }
      });

      // Shuffle options
      return options.sort(() => Math.random() - 0.5).slice(0, 4);
    }

    // Fallback if no options or correct_answers
    return ["play", "go", "make", "take"];
  };

  const handleOptionSelect = (sentenceId, selectedOption) => {
    setAnswers((prev) => ({
      ...prev,
      [sentenceId]: selectedOption,
    }));
    // Clear feedback when user selects new option
    if (showFeedback[sentenceId]) {
      setShowFeedback((prev) => ({
        ...prev,
        [sentenceId]: false,
      }));
    }
  };

  const checkAnswer = (sentenceId, sentence) => {
    const userAnswer = answers[sentenceId]?.trim().toLowerCase() || "";

    // For new structure, use correct_answer (single string)
    // For old structure, use correct_answers array
    let correctAnswers;
    if (sentence.correct_answer) {
      correctAnswers = [sentence.correct_answer];
    } else if (sentence.correct_answers) {
      correctAnswers = sentence.correct_answers;
    } else {
      correctAnswers = [];
    }

    const isCorrect = correctAnswers.some(
      (answer) => answer.toLowerCase() === userAnswer
    );

    setShowFeedback((prev) => ({
      ...prev,
      [sentenceId]: { isCorrect, answer: correctAnswers[0] },
    }));

    setAttempts((prev) => ({
      ...prev,
      [sentenceId]: (prev[sentenceId] || 0) + 1,
    }));

    // Check if all complete
    const allAnswered = sentences.every(
      (s) => showFeedback[s.id]?.isCorrect || false
    );

    if (allAnswered && !completed) {
      setCompleted(true);
      // Calculate XP based on attempts and hint usage
      const totalAttempts = Object.values(attempts).reduce((a, b) => a + b, 0);
      const totalHints = Object.values(hintUsage).reduce((a, b) => a + b, 0);
      const baseXP = 100;
      const attemptPenalty = Math.min(totalAttempts * 5, 30);
      const hintPenalty = Math.min(totalHints * 10, 40);
      const finalXP = Math.max(baseXP - attemptPenalty - hintPenalty, 30);

      if (onComplete) {
        setTimeout(() => onComplete(finalXP), 1000);
      }
    }

    return isCorrect;
  };

  const getAIHint = async (sentenceId, sentence) => {
    const currentHintCount = hintUsage[sentenceId] || 0;

    // Check hint limit
    if (currentHintCount >= MAX_HINTS_PER_GAP) {
      return;
    }

    setLoadingHint((prev) => ({ ...prev, [sentenceId]: true }));

    try {
      // Create contextual prompt for football-related hints
      const hintLevel = currentHintCount + 1;
      let contextPrompt = "";

      if (hintLevel === 1) {
        contextPrompt = `This is a football/soccer context sentence: "${sentence.text}". 
          Give a helpful first hint about what type of word fits here (noun, verb, adjective) 
          and relate it to football situations. Be encouraging and educational but don't reveal the answer.`;
      } else {
        contextPrompt = `This is the second hint for: "${sentence.text}". 
          The student still needs help. Give a more specific clue about the meaning or context 
          in football terms, but still don't give away the exact answer. Be supportive.`;
      }

      const response = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "gap_fill",
          content: sentence.text,
          context: contextPrompt,
          lessonId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const newHint = data.feedback;

        // Update hint usage count
        setHintUsage((prev) => ({
          ...prev,
          [sentenceId]: currentHintCount + 1,
        }));

        // Store hint in history
        setHintHistory((prev) => ({
          ...prev,
          [sentenceId]: [...(prev[sentenceId] || []), newHint],
        }));

        // Set current hint to display
        setHints((prev) => ({
          ...prev,
          [sentenceId]: newHint,
        }));
      }
    } catch (error) {
      console.error("Error getting hint:", error);

      // Fallback hints based on hint level
      const hintLevel = currentHintCount + 1;
      let fallbackHint = "";

      if (hintLevel === 1) {
        fallbackHint =
          "Think about what type of word would make sense here. Is it an action (verb), person/thing (noun), or description (adjective)?";
      } else {
        fallbackHint =
          "Consider the context of the sentence and what would commonly happen in football situations like this.";
      }

      setHintUsage((prev) => ({
        ...prev,
        [sentenceId]: currentHintCount + 1,
      }));

      setHints((prev) => ({
        ...prev,
        [sentenceId]: fallbackHint,
      }));
    } finally {
      setLoadingHint((prev) => ({ ...prev, [sentenceId]: false }));
    }
  };

  // Text-to-Speech functionality
  const speakText = async (text, sentenceId) => {
    if (playingAudio[sentenceId]) {
      // Stop current audio
      speechSynthesis.cancel();
      setPlayingAudio((prev) => ({ ...prev, [sentenceId]: false }));
      return;
    }

    try {
      // Try OpenAI TTS first (if available)
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, englishVariant, voiceGender }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        setPlayingAudio((prev) => ({ ...prev, [sentenceId]: true }));

        audio.onended = () => {
          setPlayingAudio((prev) => ({ ...prev, [sentenceId]: false }));
          URL.revokeObjectURL(audioUrl);
        };

        audio.play();
      } else {
        throw new Error("TTS API not available");
      }
    } catch {
      // Fallback to browser TTS
      console.log("Using browser TTS fallback");

      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-GB";
        utterance.rate = 0.9;

        setPlayingAudio((prev) => ({ ...prev, [sentenceId]: true }));

        utterance.onend = () => {
          setPlayingAudio((prev) => ({ ...prev, [sentenceId]: false }));
        };

        speechSynthesis.speak(utterance);
      }
    }
  };

  const getHintButtonText = (sentenceId) => {
    const usedHints = hintUsage[sentenceId] || 0;
    if (usedHints === 0) {
      return "Get Hint";
    } else if (usedHints === 1) {
      return "Another Hint";
    } else {
      return "No More Hints";
    }
  };

  const getHintButtonStyle = (sentenceId) => {
    const usedHints = hintUsage[sentenceId] || 0;
    const isDisabled =
      usedHints >= MAX_HINTS_PER_GAP || loadingHint[sentenceId];

    if (isDisabled) {
      return "px-3 py-1 bg-gray-200 text-gray-400 cursor-not-allowed rounded text-sm font-medium";
    } else if (usedHints === 1) {
      return "px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30 rounded text-sm font-medium transition-colors flex items-center space-x-1";
    } else {
      return "px-3 py-1 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:hover:bg-yellow-900/30 rounded text-sm font-medium transition-colors flex items-center space-x-1";
    }
  };

  const renderSentenceWithOptions = (sentence) => {
    const parts = sentence.text.split("___");
    const sentenceId = sentence.id;
    const feedback = showFeedback[sentenceId];
    const usedHints = hintUsage[sentenceId] || 0;
    const hasUsedAllHints = usedHints >= MAX_HINTS_PER_GAP;
    const options = getOptions(sentence);
    const selectedOption = answers[sentenceId];

    return (
      <div
        key={sentenceId}
        className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Choose the best word
            </span>
          </div>

          {/* Audio Button */}
          <button
            onClick={() =>
              speakText(
                sentence.text.replace("___", selectedOption || "[blank]"),
                sentenceId
              )
            }
            className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-fieldtalk-900/30 dark:hover:bg-fieldtalk-900/50 
                     rounded-lg transition-colors flex items-center space-x-1"
            title="Listen to sentence"
          >
            {playingAudio[sentenceId] ? (
              <Pause className="w-4 h-4 text-fieldtalk-600 dark:text-fieldtalk-400" />
            ) : (
              <Play className="w-4 h-4 text-fieldtalk-600 dark:text-fieldtalk-400" />
            )}
          </button>

          {/* Hint Usage Indicator */}
          {usedHints > 0 && (
            <div className="flex items-center space-x-1">
              <Lightbulb
                className={`w-4 h-4 ${hasUsedAllHints ? "text-orange-500" : "text-yellow-500"}`}
              />
              <span
                className={`text-xs font-medium ${hasUsedAllHints ? "text-orange-600" : "text-yellow-600"}`}
              >
                {usedHints}/{MAX_HINTS_PER_GAP} hints used
              </span>
            </div>
          )}
        </div>

        {/* Sentence with gap */}
        <div className="text-lg text-gray-900 dark:text-white leading-relaxed mb-4">
          {parts[0]}
          <span
            className={`mx-2 px-3 py-1 rounded-xl border-2 transition-colors min-w-[120px] inline-block text-center
            ${
              feedback?.isCorrect
                ? "border-growth-500 bg-green-100 text-growth-700"
                : feedback?.isCorrect === false
                  ? "border-red-500 bg-red-100 text-red-700"
                  : selectedOption
                    ? "border-fieldtalk-400 bg-blue-50 text-fieldtalk-700"
                    : "border-gray-300 bg-gray-50 text-gray-500"
            }`}
          >
            {selectedOption || "___"}
          </span>
          {parts[1]}
        </div>

        {/* Multiple Choice Options */}
        {!feedback?.isCorrect && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(sentenceId, option)}
                className={`p-3 rounded-xl border-2 transition-all text-left
                  ${
                    selectedOption === option
                      ? "border-fieldtalk-400 bg-blue-50 dark:bg-fieldtalk-900/20 text-fieldtalk-700 dark:text-fieldtalk-300"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 dark:text-white"
                  }`}
              >
                <span className="font-medium">{option}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            {!feedback?.isCorrect && selectedOption && (
              <button
                onClick={() => checkAnswer(sentenceId, sentence)}
                className="px-4 py-2 bg-fieldtalk-600 text-white rounded-xl hover:bg-fieldtalk-700 transition-colors font-medium"
              >
                Check Answer
              </button>
            )}

            {!feedback?.isCorrect && (
              <button
                onClick={() => getAIHint(sentenceId, sentence)}
                disabled={hasUsedAllHints || loadingHint[sentenceId]}
                className={getHintButtonStyle(sentenceId)}
                title={
                  hasUsedAllHints
                    ? "You've used all available hints for this gap"
                    : "Get an AI-powered hint"
                }
              >
                {loadingHint[sentenceId] ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : hasUsedAllHints ? (
                  <AlertTriangle className="w-3 h-3" />
                ) : usedHints === 1 ? (
                  <Zap className="w-3 h-3" />
                ) : (
                  <HelpCircle className="w-3 h-3" />
                )}
                <span>{getHintButtonText(sentenceId)}</span>
              </button>
            )}
          </div>

          {/* Feedback Icons */}
          {feedback && (
            <div className="flex items-center space-x-2">
              {feedback.isCorrect ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Correct!
                  </span>
                  {usedHints > 0 && (
                    <span className="text-xs text-gray-500">
                      ({usedHints} hint{usedHints > 1 ? "s" : ""} used)
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div className="text-sm">
                    <span className="text-red-600 dark:text-red-400">
                      Incorrect.{" "}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      Correct answer: <strong>{feedback.answer}</strong>
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* AI Hint Display */}
        {hints[sentenceId] && (
          <div
            className={`mt-3 p-3 rounded-xl border ${
              usedHints === 1
                ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
            }`}
          >
            <div className="flex items-start space-x-2">
              <Lightbulb
                className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  usedHints === 1
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-orange-600 dark:text-orange-400"
                }`}
              />
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    usedHints === 1
                      ? "text-yellow-800 dark:text-yellow-300"
                      : "text-orange-800 dark:text-orange-300"
                  }`}
                >
                  <strong>Hint {usedHints}:</strong> {hints[sentenceId]}
                </p>
                {hasUsedAllHints && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic">
                    This was your final hint for this gap. Think carefully!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show all previous hints if multiple */}
        {hintHistory[sentenceId] && hintHistory[sentenceId].length > 1 && (
          <div className="mt-2">
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                View all hints ({hintHistory[sentenceId].length})
              </summary>
              <div className="mt-2 space-y-2 pl-4">
                {hintHistory[sentenceId].map((hint, index) => (
                  <div
                    key={index}
                    className="text-xs text-gray-600 dark:text-gray-400"
                  >
                    <strong>Hint {index + 1}:</strong> {hint}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {/* Context or translation if provided */}
        {sentence.context && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">
            Context: {sentence.context}
          </div>
        )}
      </div>
    );
  };

  // Calculate hint statistics for completion message
  const getTotalHintsUsed = () => {
    return Object.values(hintUsage).reduce((total, count) => total + count, 0);
  };

  const getPerformanceMessage = () => {
    const totalHints = getTotalHintsUsed();
    const totalAttempts = Object.values(attempts).reduce((a, b) => a + b, 0);

    if (totalHints === 0 && totalAttempts === sentences.length) {
      return "Perfect! You got everything right on the first try! 🏆";
    } else if (totalHints <= 2) {
      return "Great work! You used hints wisely and learned effectively! ⭐";
    } else {
      return "Good job completing the exercise! Keep practicing to build confidence! 💪";
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Complete the Sentences - Multiple Choice
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Choose the best word for each blank. Click the audio button to hear
          the sentence. Use hints if you need help!
        </p>
      </div>

      {sentences.map((sentence) => renderSentenceWithOptions(sentence))}

      {completed && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-300 font-medium">
              Excellent work! You&apos;ve completed all the sentences.
            </p>
          </div>
          <p className="text-sm text-green-700 dark:text-green-400">
            {getPerformanceMessage()}
          </p>
          {getTotalHintsUsed() > 0 && (
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              Total hints used: {getTotalHintsUsed()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
