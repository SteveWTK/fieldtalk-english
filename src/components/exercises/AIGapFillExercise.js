// src/components/exercises/AIGapFillExercise.js
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
} from "lucide-react";

export default function AIGapFillExercise({ sentences, lessonId, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [showFeedback, setShowFeedback] = useState({});
  const [hints, setHints] = useState({});
  const [loadingHint, setLoadingHint] = useState({});
  const [attempts, setAttempts] = useState({});
  const [completed, setCompleted] = useState(false);

  // Enhanced hint tracking
  const [hintUsage, setHintUsage] = useState({}); // Track hint count per gap
  const [hintHistory, setHintHistory] = useState({}); // Store all hints per gap
  const MAX_HINTS_PER_GAP = 2;

  const handleInputChange = (sentenceId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [sentenceId]: value,
    }));
    // Clear feedback when user starts typing again
    if (showFeedback[sentenceId]) {
      setShowFeedback((prev) => ({
        ...prev,
        [sentenceId]: false,
      }));
    }
  };

  const checkAnswer = (sentenceId, correctAnswers) => {
    const userAnswer = answers[sentenceId]?.trim().toLowerCase() || "";
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

  const renderSentenceWithGap = (sentence) => {
    const parts = sentence.text.split("___");
    const sentenceId = sentence.id;
    const feedback = showFeedback[sentenceId];
    const usedHints = hintUsage[sentenceId] || 0;
    const hasUsedAllHints = usedHints >= MAX_HINTS_PER_GAP;

    return (
      <div
        key={sentenceId}
        className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Fill in the blank
            </span>
          </div>

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

        <div className="text-lg text-gray-900 dark:text-white leading-relaxed">
          {parts[0]}
          <input
            type="text"
            value={answers[sentenceId] || ""}
            onChange={(e) => handleInputChange(sentenceId, e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                checkAnswer(sentenceId, sentence.correct_answers);
              }
            }}
            className={`mx-2 px-3 py-1 border-b-2 bg-transparent focus:outline-none transition-colors min-w-[120px]
              ${
                feedback?.isCorrect
                  ? "border-green-500 text-green-600"
                  : feedback?.isCorrect === false
                    ? "border-red-500 text-red-600"
                    : usedHints > 0
                      ? "border-yellow-400 dark:border-yellow-600 focus:border-yellow-500"
                      : "border-gray-400 dark:border-gray-600 focus:border-blue-500"
              }`}
            placeholder="..."
            disabled={feedback?.isCorrect}
          />
          {parts[1]}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            {!feedback?.isCorrect && (
              <>
                <button
                  onClick={() =>
                    checkAnswer(sentenceId, sentence.correct_answers)
                  }
                  disabled={!answers[sentenceId]?.trim()}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors
                    ${
                      answers[sentenceId]?.trim()
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                >
                  Check
                </button>

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
              </>
            )}
          </div>

          {/* Feedback Icons */}
          {feedback && (
            <div className="flex items-center space-x-2">
              {feedback.isCorrect ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  {usedHints > 0 && (
                    <span className="text-xs text-gray-500">
                      ({usedHints} hint{usedHints > 1 ? "s" : ""} used)
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Try: {feedback.answer}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* AI Hint Display */}
        {hints[sentenceId] && (
          <div
            className={`mt-3 p-3 rounded border ${
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

    if (totalHints === 0) {
      return "Amazing! You completed everything without using any hints! 🏆";
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
          Complete the Sentences
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Fill in the blanks with the correct words. Use the &quot;Get
          Hint&quot; button if you need help (max 2 hints per gap).
        </p>
      </div>

      {sentences.map((sentence) => renderSentenceWithGap(sentence))}

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
