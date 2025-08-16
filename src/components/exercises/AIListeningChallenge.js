// src/components/exercises/AIListeningChallenge.js
"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Volume2,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  RefreshCw,
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
  const [attempts, setAttempts] = useState({});
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
      if (currentClip.audio_url && currentClip.audio_url.startsWith("/audio/")) {
        try {
          const response = await fetch(currentClip.audio_url, { method: "HEAD" });
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

    // Track attempts
    const clipId = currentClip.id || currentClipIndex;
    setAttempts(prev => ({
      ...prev,
      [clipId]: (prev[clipId] || 0) + 1
    }));

    if (correct) {
      setScore(prev => prev + 1);
      setCompletedClips(prev => new Set([...prev, currentClipIndex]));

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
      setCurrentClipIndex(prev => prev + 1);
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
    setAttempts({});
  };

  const isComplete = completedClips.size === audioClips.length && audioClips.length > 0;

  if (!currentClip && !isComplete) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">{t('no_audio_clips_available')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <div className="flex items-start space-x-3">
          <Headphones className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {t('listening_challenge')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300">
              {content || t('listen_and_select_correct_answer')}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>{t('progress')}</span>
          <span>{completedClips.size} / {audioClips.length} {t('completed')}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedClips.size / audioClips.length) * 100}%` }}
          />
        </div>
      </div>

      {!isComplete ? (
        <>
          {/* Current Clip */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400 mb-4">
                <span className="text-sm">{t('clip')} {currentClipIndex + 1} {t('of')} {audioClips.length}</span>
              </div>
              
              {/* Context hint */}
              {currentClip.context && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4">
                  {currentClip.context}
                </p>
              )}

              {/* Play Audio Button */}
              <button
                onClick={isPlaying ? stopAudio : playAudio}
                disabled={audioLoading}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                         flex items-center space-x-3 mx-auto text-lg"
              >
                {audioLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6" />
                )}
                <span>
                  {audioLoading 
                    ? t('loading') 
                    : isPlaying 
                    ? t('pause_audio') 
                    : hasPlayedCurrentClip 
                    ? t('play_again')
                    : t('play_audio')
                  }
                </span>
              </button>
            </div>

            {/* Answer Options */}
            {hasPlayedCurrentClip && (
              <div className="space-y-3 animate-fadeIn">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  {t('what_did_you_hear')}
                </h4>
                {currentClip.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={showFeedback}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all
                      ${selectedAnswer === option
                        ? showFeedback
                          ? isCorrect && option === currentClip.correct_answer
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : !isCorrect && option === selectedAnswer
                            ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                            : option === currentClip.correct_answer
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-300 dark:border-gray-600"
                          : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                      }
                      ${showFeedback ? "cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`
                        ${showFeedback && option === currentClip.correct_answer
                          ? "text-green-700 dark:text-green-300 font-medium"
                          : showFeedback && option === selectedAnswer && !isCorrect
                          ? "text-red-700 dark:text-red-300"
                          : "text-gray-900 dark:text-white"
                        }
                      `}>
                        {option}
                      </span>
                      {showFeedback && option === currentClip.correct_answer && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                      {showFeedback && option === selectedAnswer && !isCorrect && (
                        <XCircle className="w-5 h-5 text-red-600" />
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
                className="mt-6 w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 
                         transition-colors font-medium"
              >
                {t('submit_answer')}
              </button>
            )}

            {/* Feedback Message */}
            {showFeedback && (
              <div className={`mt-6 p-4 rounded-lg ${
                isCorrect 
                  ? "bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700" 
                  : "bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700"
              }`}>
                <div className="flex items-start space-x-2">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      isCorrect ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                    }`}>
                      {isCorrect ? t('correct_excellent') : t('incorrect_try_again')}
                    </p>
                    {!isCorrect && (
                      <button
                        onClick={playAudio}
                        disabled={audioLoading || isPlaying}
                        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 
                                 dark:hover:text-red-300 flex items-center space-x-1"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span>{t('listen_again')}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Score Display */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            {t('score')}: {score} / {audioClips.length}
          </div>
        </>
      ) : (
        /* Completion Screen */
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-8 text-center">
          <Award className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
            {t('challenge_complete')}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            {t('you_scored')} {score} {t('out_of')} {audioClips.length}!
          </p>
          
          <div className="flex justify-center space-x-4">
            <button
              onClick={resetChallenge}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t('try_again')}</span>
            </button>
            {onComplete && (
              <button
                onClick={() => onComplete(Math.round((score / audioClips.length) * 100))}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                         transition-colors flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{t('continue')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}