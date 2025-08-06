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

export default function AIWritingExercise({
  prompt,
  lessonId,
  onComplete,
  minWords = 50,
  maxWords = 200,
  englishVariant = "british",
  voiceGender = "male",
}) {
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
        
        console.log("Raw API response:", data); // Debug log
        
        try {
          // First priority: check if data.analysis exists and is already an object
          if (data.analysis && typeof data.analysis === 'object' && !Array.isArray(data.analysis)) {
            console.log("Using data.analysis object:", data.analysis);
            analysis = data.analysis;
          }
          // Second priority: if data.analysis is a string, try to parse it
          else if (data.analysis && typeof data.analysis === 'string') {
            console.log("Parsing data.analysis string:", data.analysis);
            try {
              analysis = JSON.parse(data.analysis);
            } catch (parseError) {
              console.log("Failed to parse data.analysis, treating as text");
              analysis = { 
                score: 7, 
                feedback: data.analysis,
                clarity: data.analysis
              };
            }
          }
          // Third priority: check data.feedback
          else if (data.feedback) {
            console.log("Using data.feedback:", typeof data.feedback, data.feedback);
            if (typeof data.feedback === 'object' && !Array.isArray(data.feedback)) {
              analysis = data.feedback;
            } else if (typeof data.feedback === 'string') {
              // Try parsing as JSON first
              try {
                analysis = JSON.parse(data.feedback);
                console.log("Successfully parsed data.feedback as JSON:", analysis);
              } catch (parseError) {
                console.log("data.feedback is not JSON, treating as text feedback");
                analysis = { 
                  score: 7, 
                  feedback: data.feedback,
                  clarity: data.feedback
                };
              }
            }
          }
          // Final fallback
          else {
            console.log("Using final fallback");
            analysis = { 
              score: 7, 
              feedback: "Good work!",
              clarity: "Your writing shows good understanding."
            };
          }

          // Ensure we have a score
          if (typeof analysis.score !== 'number') {
            analysis.score = 7;
          }

        } catch (e) {
          console.error("Error processing AI response:", e);
          analysis = { 
            score: 7, 
            feedback: data.feedback || data.analysis || "Good work!",
            clarity: data.feedback || data.analysis || "Your writing shows good understanding."
          };
        }

        console.log("Parsed analysis:", analysis); // Debug log
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
        body: JSON.stringify({ text: textToSpeak, englishVariant, voiceGender }),
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
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Writing Prompt */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Writing Task
              </h3>
              <p className="text-gray-700 dark:text-gray-300">{prompt}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Write {minWords}-{maxWords} words
              </p>
            </div>
          </div>
          <button
            onClick={() => speakText(prompt)}
            className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 
                     rounded-lg transition-colors flex items-center space-x-1 ml-4"
            title="Listen to prompt"
          >
            {playingAudio ? (
              <Pause className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
            placeholder="Start writing here..."
            className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={loading || showFeedback}
          />
          <div className="absolute bottom-2 right-2 text-sm text-gray-500">
            {wordCount} words
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {wordCount < minWords && (
              <span className="text-orange-600">
                Need {minWords - wordCount} more words
              </span>
            )}
          </div>
          <div className="space-x-3">
            {showFeedback ? (
              <button
                onClick={tryAgain}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                         rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors
                         flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            ) : (
              <button
                onClick={submitForFeedback}
                disabled={loading || wordCount < minWords}
                className={`px-6 py-2 rounded-lg font-medium transition-all
                  ${
                    wordCount >= minWords
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  } flex items-center space-x-2`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit for Feedback</span>
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
          {/* Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                <span>AI Feedback</span>
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
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span>Grammar Notes</span>
                  </h5>
                  <ul className="space-y-2">
                    {feedback.grammar.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        {item.error && item.correction ? (
                          <>
                            <span className="line-through text-red-500">
                              {item.error}
                            </span>
                            {" → "}
                            <span className="text-green-600 dark:text-green-400">
                              {item.correction}
                            </span>
                            {item.explanation && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span>Vocabulary Suggestions</span>
                  </h5>
                  <ul className="space-y-2">
                    {feedback.vocabulary.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        {item.original && item.suggestion ? (
                          <>
                            <span className="font-medium">{item.original}</span>
                            {" → "}
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {item.suggestion}
                            </span>
                            {item.reason && (
                              <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">
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
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                  Overall Clarity
                </h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {feedback.clarity}
                </p>
              </div>
            )}

            {/* Improvements */}
            {feedback.improvements &&
              Array.isArray(feedback.improvements) &&
              feedback.improvements.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
                    <Target className="w-4 h-4 text-purple-500" />
                    <span>Next Steps</span>
                  </h5>
                  <ul className="space-y-1">
                    {feedback.improvements.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-700 dark:text-gray-300 flex items-start"
                      >
                        <span className="text-purple-500 mr-2">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Encouragement */}
            {feedback.encouragement && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-300 flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{feedback.encouragement}</span>
                </p>
              </div>
            )}

            {/* Fallback display for simple feedback */}
            {!feedback.grammar &&
              !feedback.vocabulary &&
              !feedback.clarity &&
              !feedback.improvements &&
              !feedback.encouragement && (
                <div className="text-gray-700 dark:text-gray-300">
                  {typeof feedback === "string" ? (
                    <div className="whitespace-pre-wrap">{feedback}</div>
                  ) : feedback.feedback ? (
                    <div className="whitespace-pre-wrap">{feedback.feedback}</div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        AI Feedback
                      </h5>
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {Object.entries(feedback).map(([key, value]) => (
                          <div key={key} className="mb-2">
                            <strong className="capitalize">{key.replace('_', ' ')}:</strong>{' '}
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Action buttons after feedback */}
          <div className="flex justify-center space-x-4">
            {feedback.score && feedback.score >= 7 ? (
              <div className="text-center space-y-4">
                <p className="text-green-600 dark:text-green-400 font-medium">
                  Great work! You&apos;ve demonstrated excellent English skills.
                </p>
                <button
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
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Continue</span>
                </button>
              </div>
            ) : (
              <div className="flex space-x-4">
                <button
                  onClick={tryAgain}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                <button
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Continue Anyway</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
