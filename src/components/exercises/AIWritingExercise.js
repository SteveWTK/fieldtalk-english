/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/exercises/AIWritingExercise.js
"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Target,
  Sparkles,
  Volume2,
  Play,
  Pause,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

export default function AIWritingExercise({
  prompt,
  example,
  lessonId,
  onComplete,
  minWords = 50,
  maxWords = 200,
  englishVariant = "british",
  voiceGender = "male",
}) {
  const { user } = useAuth();
  const { t } = useTranslation(user);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  // Storage key for persisting content
  const storageKey = `ai-writing-${lessonId}-${prompt.substring(0, 50)}`;

  // Load saved content on mount
  useEffect(() => {
    try {
      const savedText = localStorage.getItem(storageKey);
      if (savedText && !showFeedback) {
        setText(savedText);
        setWordCount(
          savedText
            .trim()
            .split(/\s+/)
            .filter((word) => word.length > 0).length
        );
      }
    } catch (error) {
      console.error("Error loading saved text:", error);
    }
  }, [storageKey, showFeedback]);

  // Save content as user types
  useEffect(() => {
    if (text && !showFeedback) {
      try {
        localStorage.setItem(storageKey, text);
      } catch (error) {
        console.error("Error saving text:", error);
      }
    }
  }, [text, storageKey, showFeedback]);

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

  const submitForFeedback = async () => {
    if (wordCount < minWords) {
      alert(`Please write at least ${minWords} words.`);
      return;
    }

    setLoading(true);
    setShowFeedback(false);

    try {
      const response = await fetch("/api/ai-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "writing",
          content: text,
          context: prompt,
          lessonId,
        }),
      });

      const data = await response.json();
      console.log("AI Writing Response:", data); // Debug log

      if (data.success) {
        let analysis;

        console.log("=== AI FEEDBACK DEBUG ===");
        console.log("Raw API response:", JSON.stringify(data, null, 2));
        console.log("data.analysis type:", typeof data.analysis);
        console.log("data.analysis content:", data.analysis);
        console.log("data.feedback type:", typeof data.feedback);
        console.log("data.feedback content:", data.feedback);

        try {
          // The API should return the parsed object in data.analysis
          if (
            data.analysis &&
            typeof data.analysis === "object" &&
            !Array.isArray(data.analysis)
          ) {
            console.log(
              "✅ Using data.analysis object (preferred path):",
              data.analysis
            );
            analysis = data.analysis;
          }
          // If analysis is missing or not an object, try to parse feedback
          else if (data.feedback && typeof data.feedback === "string") {
            console.log(
              "⚠️  data.analysis not available, trying to parse data.feedback"
            );
            try {
              analysis = JSON.parse(data.feedback);
              console.log(
                "✅ Successfully parsed data.feedback as JSON:",
                analysis
              );
            } catch (parseError) {
              console.log(
                "❌ data.feedback is not valid JSON:",
                parseError.message
              );
              console.log("Raw feedback string:", data.feedback);
              // Create structured fallback from raw text
              analysis = {
                score: 7,
                feedback: data.feedback,
                clarity: data.feedback,
                grammar: [],
                vocabulary: [],
                improvements: ["Continue practicing writing in English"],
                encouragement:
                  "Great effort! Keep practicing to improve your English skills.",
              };
            }
          }
          // If we have a feedback object (unlikely but possible)
          else if (data.feedback && typeof data.feedback === "object") {
            console.log("✅ Using data.feedback object:", data.feedback);
            analysis = data.feedback;
          }
          // Final fallback
          else {
            console.log(
              "❌ No valid analysis or feedback found, using fallback"
            );
            analysis = {
              score: 7,
              feedback:
                "Good work! Your writing shows understanding of the topic.",
              clarity: "Your writing demonstrates good comprehension.",
              grammar: [],
              vocabulary: [],
              improvements: ["Continue practicing writing in English"],
              encouragement:
                "Great effort! Keep practicing to improve your English skills.",
            };
          }

          // Ensure we have a valid score
          if (
            typeof analysis.score !== "number" ||
            analysis.score < 1 ||
            analysis.score > 10
          ) {
            console.log("⚠️  Invalid score, setting to 7");
            analysis.score = 7;
          }
        } catch (e) {
          console.error("❌ Error processing AI response:", e);
          analysis = {
            score: 7,
            feedback: data.feedback || "Good work!",
            clarity: "Your writing shows good understanding.",
            grammar: [],
            vocabulary: [],
            improvements: ["Continue practicing writing in English"],
            encouragement:
              "Great effort! Keep practicing to improve your English skills.",
          };
        }

        console.log(
          "✅ Final parsed analysis:",
          JSON.stringify(analysis, null, 2)
        );
        console.log("=== END DEBUG ===");

        setFeedback(analysis);
        setShowFeedback(true);

        // Don't auto-complete - let user read feedback and click continue
        // The completion will be handled by the continue button
      } else {
        console.error("AI feedback failed:", data);
        alert(`Failed to get feedback: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error getting feedback:", error);
      alert("Failed to get feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tryAgain = () => {
    setText("");
    setFeedback(null);
    setShowFeedback(false);
    setWordCount(0);
    // Clear saved content
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Error clearing saved text:", error);
    }
  };

  // Text-to-Speech functionality
  const speakText = async (textToSpeak) => {
    if (playingAudio) {
      // Stop current audio
      speechSynthesis.cancel();
      setPlayingAudio(false);
      return;
    }

    try {
      // Try OpenAI TTS first (if available)
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToSpeak,
          englishVariant,
          voiceGender,
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        setPlayingAudio(true);

        audio.onended = () => {
          setPlayingAudio(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.play();
      } else {
        throw new Error("TTS API not available");
      }
    } catch (error) {
      // Fallback to browser TTS
      console.log("Using browser TTS fallback");

      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = "en-GB";
        utterance.rate = 0.9;

        setPlayingAudio(true);

        utterance.onend = () => {
          setPlayingAudio(false);
        };

        speechSynthesis.speak(utterance);
      }
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return "text-accent-400";
    if (score >= 6) return "text-signal-performance";
    return "text-signal-alert";
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Writing Prompt */}
      <div className="bg-signal-english/10 border border-signal-english/30 rounded-control p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <BookOpen className="w-6 h-6 text-signal-english flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-primary-50 mb-2">
                {t("writing_task")}
              </h3>
              <p className="text-primary-100 pb-2">{prompt}</p>
              <p className="text-accent-400 font-bold">
                {example}
              </p>
              <p className="text-sm text-primary-300 mt-2">
                {t("write_words")} {minWords}-{maxWords} {t("words")}
              </p>
            </div>
          </div>
          <button
            onClick={() => speakText(prompt)}
            className="p-2 bg-primary-800 hover:bg-primary-700
                     rounded-control transition-colors flex items-center space-x-1 ml-4"
            title="Listen to prompt"
          >
            {playingAudio ? (
              <Pause className="w-4 h-4 text-accent-400" />
            ) : (
              <Play className="w-4 h-4 text-accent-400" />
            )}
          </button>
        </div>
      </div>

      {/* Writing Area */}
      <div className="mb-6">
        <div className="relative">
          <textarea
            value={text}
            onChange={handleTextChange}
            placeholder={t("start_writing")}
            className="w-full h-48 p-4 border border-primary-600 rounded-control
                     bg-primary-900 text-primary-100 placeholder:text-primary-500
                     focus:border-accent-400 focus:ring-accent-400/30 focus:ring-2 resize-none outline-none transition-colors"
            disabled={loading || showFeedback}
          />
          <div className="absolute bottom-2 right-2 text-sm text-primary-400">
            {wordCount} words
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-primary-300">
            {wordCount < minWords && (
              <span className="text-signal-performance">
                {t("need_more_words")} {minWords - wordCount} {t("words")}
              </span>
            )}
          </div>
          <div className="space-x-3">
            {showFeedback ? (
              <Button
                variant="secondary"
                onClick={tryAgain}
                Icon={RefreshCw}
              >
                {t("try_again")}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={submitForFeedback}
                disabled={loading || wordCount < minWords}
                loading={loading}
                Icon={loading ? undefined : Send}
              >
                {loading ? t("analyzing") : t("submit_for_feedback")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* AI Feedback Display */}
      {showFeedback && feedback && (
        <div className="space-y-4 animate-fadeIn">
          {/* Score */}
          <div className="bg-primary-panel rounded-control p-6 border border-primary-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-primary-50 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-signal-performance" />
                <span>{t("ai_feedback")}</span>
              </h4>
              {feedback.score && (
                <div
                  className={`text-3xl font-bold ${getScoreColor(feedback.score)}`}
                >
                  {feedback.score}/10
                </div>
              )}
            </div>

            {/* Grammar Feedback */}
            {feedback.grammar &&
              Array.isArray(feedback.grammar) &&
              feedback.grammar.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-primary-50 mb-2 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-signal-performance" />
                    <span>{t("grammar_notes")}</span>
                  </h5>
                  <ul className="space-y-2">
                    {feedback.grammar.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-primary-100"
                      >
                        {item.error && item.correction ? (
                          <>
                            <span className="line-through text-signal-alert">
                              {item.error}
                            </span>
                            {" → "}
                            <span className="text-accent-400">
                              {item.correction}
                            </span>
                            {item.explanation && (
                              <p className="text-xs text-primary-300 mt-1">
                                {item.explanation}
                              </p>
                            )}
                          </>
                        ) : (
                          <span>
                            {typeof item === "string"
                              ? item
                              : JSON.stringify(item)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Vocabulary Suggestions */}
            {feedback.vocabulary &&
              Array.isArray(feedback.vocabulary) &&
              feedback.vocabulary.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-primary-50 mb-2 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-signal-english" />
                    <span>{t("vocabulary_suggestions")}</span>
                  </h5>
                  <ul className="space-y-2">
                    {feedback.vocabulary.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-primary-100"
                      >
                        {item.original && item.suggestion ? (
                          <>
                            <span className="font-medium">{item.original}</span>
                            {" → "}
                            <span className="text-signal-english font-medium">
                              {item.suggestion}
                            </span>
                            {item.reason && (
                              <span className="text-xs text-primary-300 ml-2">
                                ({item.reason})
                              </span>
                            )}
                          </>
                        ) : (
                          <span>
                            {typeof item === "string"
                              ? item
                              : JSON.stringify(item)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Overall Clarity */}
            {feedback.clarity && (
              <div className="mb-4">
                <h5 className="font-medium text-primary-50 mb-2">
                  {t("overall_clarity")}
                </h5>
                <p className="text-sm text-primary-100">
                  {feedback.clarity}
                </p>
              </div>
            )}

            {/* Improvements */}
            {feedback.improvements &&
              Array.isArray(feedback.improvements) &&
              feedback.improvements.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-primary-50 mb-2 flex items-center space-x-2">
                    <Target className="w-4 h-4 text-signal-mental" />
                    <span>{t("next_steps")}</span>
                  </h5>
                  <ul className="space-y-1">
                    {feedback.improvements.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-primary-100 flex items-start"
                      >
                        <span className="text-signal-mental mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Encouragement */}
            {feedback.encouragement && (
              <div className="bg-accent-400/10 border border-accent-400/30 rounded-control p-4">
                <p className="text-sm text-accent-400 flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{feedback.encouragement}</span>
                </p>
              </div>
            )}

            {/* Fallback display for simple feedback */}
            {(!feedback.grammar ||
              !Array.isArray(feedback.grammar) ||
              feedback.grammar.length === 0) &&
              (!feedback.vocabulary ||
                !Array.isArray(feedback.vocabulary) ||
                feedback.vocabulary.length === 0) &&
              !feedback.clarity &&
              (!feedback.improvements ||
                !Array.isArray(feedback.improvements) ||
                feedback.improvements.length === 0) &&
              !feedback.encouragement && (
                <div className="text-primary-100">
                  {typeof feedback === "string" ? (
                    <div className="whitespace-pre-wrap">{feedback}</div>
                  ) : feedback.feedback ? (
                    <div className="bg-signal-english/10 border border-signal-english/30 p-4 rounded-control">
                      <h5 className="font-medium text-primary-50 mb-2">
                        AI Feedback
                      </h5>
                      <div className="text-sm text-primary-100 whitespace-pre-wrap">
                        {feedback.feedback}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-signal-performance/10 p-4 rounded-control border border-signal-performance/30">
                      <h5 className="font-medium text-primary-50 mb-2">
                        🔍 Debug: Raw AI Response
                      </h5>
                      <div className="text-xs text-primary-100 font-mono bg-primary-800 p-2 rounded max-h-40 overflow-y-auto">
                        {Object.entries(feedback).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <strong className="text-signal-english">{key}:</strong>{" "}
                            {typeof value === "object" ? (
                              <pre className="inline whitespace-pre-wrap">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            ) : (
                              <span className="text-accent-400">
                                {String(value)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-signal-performance mt-2">
                        This is debug output. The AI response structure needs to
                        be fixed.
                      </p>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Action buttons after feedback */}
          <div className="flex justify-center space-x-4">
            {feedback.score && feedback.score >= 7 ? (
              <div className="text-center space-y-4">
                <p className="text-accent-400 font-medium">
                  {t("you_demonstrated_excellent")}
                </p>
                <div className="flex justify-center">
                  <Button
                    variant="primary"
                    Icon={CheckCircle}
                    onClick={() => {
                      // Clear saved content
                      try {
                        localStorage.removeItem(storageKey);
                      } catch (error) {
                        console.error("Error clearing saved text:", error);
                      }
                      if (onComplete) {
                        onComplete(feedback.score * 10); // Convert to XP
                      }
                    }}
                  >
                    {t("continue")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex space-x-4">
                <Button
                  variant="secondary"
                  Icon={RefreshCw}
                  onClick={tryAgain}
                >
                  {t("try_again")}
                </Button>
                <Button
                  variant="primary"
                  Icon={CheckCircle}
                  onClick={() => {
                    // Clear saved content
                    try {
                      localStorage.removeItem(storageKey);
                    } catch (error) {
                      console.error("Error clearing saved text:", error);
                    }
                    if (onComplete) {
                      onComplete(Math.max(feedback.score * 10, 50)); // Minimum 50 XP
                    }
                  }}
                >
                  {t("continue_anyway")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
