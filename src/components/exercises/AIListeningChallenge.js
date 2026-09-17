// src/components/exercises/AIListeningChallenge.js
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Headphones,
  Award,
  RotateCcw,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/components/AuthProvider";

export default function AIListeningChallenge({
  audioClips = [],
  lessonId,
  onComplete,
  englishVariant = "british",
  voiceGender = "male",
  content,
}) {
  const { user } = useAuth();
  const { t } = useTranslation(user);

  // Create unique localStorage key for this lesson and component
  const STORAGE_KEY = `lesson-${lessonId}-listening-challenge-progress`;

  // Initialize state with localStorage data if available
  const [currentClipIndex, setCurrentClipIndex] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.currentClipIndex || 0;
        } catch (e) {
          console.error("Error loading saved progress:", e);
        }
      }
    }
    return 0;
  });

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.score || 0;
        } catch {}
      }
    }
    return 0;
  });

  const [completedClips, setCompletedClips] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return new Set(data.completedClips || []);
        } catch {}
      }
    }
    return new Set();
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [hasPlayedCurrentClip, setHasPlayedCurrentClip] = useState(false);
  const audioRef = useRef(null);

  const currentClip = audioClips[currentClipIndex];

  // Save progress to localStorage whenever relevant state changes
  useEffect(() => {
    if (typeof window !== "undefined" && currentClipIndex < audioClips.length) {
      const progressData = {
        currentClipIndex,
        score,
        completedClips: Array.from(completedClips),
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
    }
  }, [currentClipIndex, score, completedClips, STORAGE_KEY, audioClips.length]);

  // Clear localStorage when all clips are completed
  useEffect(() => {
    if (completedClips.size === audioClips.length && audioClips.length > 0) {
      if (typeof window !== "undefined") {
        // Delay clearing to allow final state to be saved
        setTimeout(() => {
          localStorage.removeItem(STORAGE_KEY);
        }, 2000);
      }
    }
  }, [completedClips, audioClips.length, STORAGE_KEY]);

  const playAudio = async () => {
    if (!currentClip) return;

    setAudioLoading(true);
    setIsPlaying(true);

    try {
      let audioUrl = null;

      // Try pre-recorded audio first
      if (
        currentClip.audio_url &&
        currentClip.audio_url.startsWith("/audio/")
      ) {
        try {
          const response = await fetch(currentClip.audio_url, {
            method: "HEAD",
          });
          if (response.ok) {
            audioUrl = currentClip.audio_url;
          }
        } catch {
          console.log("Pre-recorded audio not found, falling back to TTS");
        }
      }

      // Fallback to TTS if no audio file
      if (!audioUrl) {
        console.log("Generating TTS audio for clip");
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: currentClip.text,
            englishVariant,
            voiceGender,
          }),
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          audioUrl = URL.createObjectURL(audioBlob);
        } else {
          throw new Error("Failed to generate TTS audio");
        }
      }

      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        setHasPlayedCurrentClip(true);

        audioRef.current.onended = () => {
          setIsPlaying(false);
          if (audioUrl.startsWith("blob:")) {
            URL.revokeObjectURL(audioUrl);
          }
        };
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      setIsPlaying(false);

      // Fallback to browser TTS
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(currentClip.text);
        utterance.lang = englishVariant === "british" ? "en-GB" : "en-US";
        utterance.rate = 0.9;

        utterance.onend = () => {
          setIsPlaying(false);
        };

        speechSynthesis.speak(utterance);
        setHasPlayedCurrentClip(true);
      }
    } finally {
      setAudioLoading(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handleAnswerSelect = (answer) => {
    if (showFeedback) return; // Don't allow selection during feedback
    setSelectedAnswer(answer);
  };

  const submitAnswer = () => {
    if (!selectedAnswer) return;

    const correct = selectedAnswer === currentClip.correct_answer;
    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      setScore((prev) => prev + 1);
      setCompletedClips((prev) => new Set([...prev, currentClipIndex]));

      // Auto-advance after showing feedback
      setTimeout(() => {
        moveToNextClip();
      }, 2000);
    } else {
      // Allow retry after showing feedback
      setTimeout(() => {
        setShowFeedback(false);
        setSelectedAnswer("");
      }, 2000);
    }
  };

  const moveToNextClip = () => {
    if (currentClipIndex + 1 < audioClips.length) {
      setCurrentClipIndex((prev) => prev + 1);
      setSelectedAnswer("");
      setShowFeedback(false);
      setHasPlayedCurrentClip(false);
    } else {
      // All clips completed
      if (onComplete) {
        const xpEarned = Math.round((score / audioClips.length) * 100);
        onComplete(xpEarned);
      }
    }
  };

  const resetChallenge = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setCurrentClipIndex(0);
    setScore(0);
    setCompletedClips(new Set());
    setSelectedAnswer("");
    setShowFeedback(false);
    setHasPlayedCurrentClip(false);
  };

  const isComplete =
    completedClips.size === audioClips.length && audioClips.length > 0;

  if (!currentClip && !isComplete) {
    return (
      <div className="text-center py-8">
        <p className="text-primary-300">
          {t("no_audio_clips_available")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Instructions */}
      <div className="bg-primary-panel border border-primary-700 rounded-panel p-6 mb-6">
        <div className="flex items-start space-x-3">
          <Headphones className="w-6 h-6 text-accent-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-primary-50 mb-2">
              {t("Desafio de Áudio")}
            </h3>
            <p className="text-primary-100">
              {content || t("listen_and_select_correct_answer")}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-primary-300 mb-2">
          <span>{t("progress")}</span>
          <span>
            {completedClips.size} / {audioClips.length} {t("completed")}
          </span>
        </div>
        <div className="w-full bg-primary-700 rounded-full h-2">
          <div
            className="bg-accent-400 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(completedClips.size / audioClips.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {!isComplete ? (
        <>
          {/* Current Clip */}
          <div className="bg-primary-panel rounded-panel border border-primary-700 p-6 mb-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center space-x-2 text-primary-300 mb-4">
                <span className="text-sm">
                  {t("clip")} {currentClipIndex + 1} {t("of")}{" "}
                  {audioClips.length}
                </span>
              </div>

              {/* Context hint */}
              {/* {currentClip.context && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4">
                  {currentClip.context}
                </p>
              )} */}

              {/* Play Audio Button */}
              <button
                onClick={isPlaying ? stopAudio : playAudio}
                disabled={audioLoading}
                className="bg-accent-400 text-primary-800 px-8 py-4 rounded-control hover:bg-accent-300
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                         flex items-center space-x-3 mx-auto text-lg"
              >
                {audioLoading ? (
                  <div className="w-6 h-6 border-2 border-primary-800 border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
                <span>
                  {audioLoading
                    ? t("loading")
                    : isPlaying
                      ? t("Pausar Áudio")
                      : hasPlayedCurrentClip
                        ? t("Ouça novamente")
                        : t("Tocar Áudio")}
                </span>
              </button>
            </div>

            {/* Answer Options */}
            {hasPlayedCurrentClip && (
              <div className="space-y-3 animate-fadeIn">
                <h4 className="font-medium text-primary-50 mb-3">
                  {t("O que você ouviu?")}
                </h4>
                {currentClip.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={showFeedback}
                    className={`w-full text-left p-4 rounded-control border-2 transition-all
                      ${
                        selectedAnswer === option
                          ? showFeedback
                            ? isCorrect && option === currentClip.correct_answer
                              ? "border-accent-400 bg-accent-400/10"
                              : !isCorrect && option === selectedAnswer
                                ? "border-signal-alert bg-signal-alert/10"
                                : option === currentClip.correct_answer
                                  ? "border-accent-400 bg-accent-400/10"
                                  : "border-primary-600"
                            : "border-accent-400 bg-accent-400/10"
                          : "border-primary-600 hover:border-primary-500"
                      }
                      ${showFeedback ? "cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`
                        ${
                          showFeedback && option === currentClip.correct_answer
                            ? "text-accent-400 font-medium"
                            : showFeedback &&
                                option === selectedAnswer &&
                                !isCorrect
                              ? "text-signal-alert"
                              : "text-primary-50"
                        }
                      `}
                      >
                        {option}
                      </span>
                      {showFeedback &&
                        option === currentClip.correct_answer && (
                          <CheckCircle className="w-5 h-5 text-accent-400" />
                        )}
                      {showFeedback &&
                        option === selectedAnswer &&
                        !isCorrect && (
                          <XCircle className="w-5 h-5 text-signal-alert" />
                        )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Submit Button */}
            {hasPlayedCurrentClip && selectedAnswer && !showFeedback && (
              <button
                onClick={submitAnswer}
                className="mt-6 w-full bg-accent-400 text-primary-800 py-3 rounded-control hover:bg-accent-300
                         transition-colors font-medium"
              >
                {t("Enviar resposta")}
              </button>
            )}

            {/* Feedback Message */}
            {showFeedback && (
              <div
                className={`mt-6 p-4 rounded-control ${
                  isCorrect
                    ? "bg-accent-400/10 border border-accent-400/40"
                    : "bg-signal-alert/10 border border-signal-alert/40"
                }`}
              >
                <div className="flex items-start space-x-2">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-signal-alert flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p
                      className={`font-medium ${
                        isCorrect
                          ? "text-accent-400"
                          : "text-signal-alert"
                      }`}
                    >
                      {isCorrect
                        ? t("Correto - excelente!")
                        : t("Incorreto - tente novamente!")}
                    </p>
                    {!isCorrect && (
                      <button
                        onClick={playAudio}
                        disabled={audioLoading || isPlaying}
                        className="mt-2 text-sm text-signal-alert hover:text-signal-alert/80 flex items-center space-x-1"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>{t("Ouça novamente")}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Score Display */}
          <div className="text-center text-sm text-primary-300">
            {t("score")}: {score} / {audioClips.length}
          </div>
        </>
      ) : (
        /* Completion Screen */
        <div className="bg-accent-400/10 border border-accent-400/40 rounded-panel p-8 text-center">
          <Award className="w-16 h-16 text-accent-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-primary-50 mb-2">
            {t("challenge_complete")}
          </h3>
          <p className="text-primary-100 mb-6">
            {t("you_scored")} {score} {t("out_of")} {audioClips.length}!
          </p>

          <div className="flex justify-center space-x-4">
            <button
              onClick={resetChallenge}
              className="px-6 py-2 bg-transparent text-primary-50 border border-primary-600 rounded-control hover:border-primary-400
                       transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t("Tente Novamente")}</span>
            </button>
            {onComplete && (
              <button
                onClick={() =>
                  onComplete(Math.round((score / audioClips.length) * 100))
                }
                className="px-6 py-2 bg-accent-400 text-primary-800 rounded-control hover:bg-accent-300
                         transition-colors flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{t("continue")}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}
