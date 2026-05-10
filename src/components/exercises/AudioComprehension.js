// components/exercises/AudioComprehension.js
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Trophy,
  Loader2,
} from "lucide-react";

/**
 * AudioComprehension Step
 *
 * Renders an audio clip with custom player controls and a stack of comprehension
 * questions revealed one at a time below it.
 *
 * audioConfig:
 *   - audio_url: string (required)
 *   - duration_seconds: number (optional, fallback when metadata fails)
 *   - transcript: string (optional)
 *   - transcript_reveal: 'always' | 'on_request' | 'after_first_attempt' | 'after_completion'
 *   - max_replays_for_full_xp: number (default 3)
 *
 * questions: array of:
 *   - id: string
 *   - type: 'multiple_choice' | 'gap_fill'
 *   - text: string (question text; for gap_fill use ___ to mark the gap)
 *   - options: string[]
 *   - correct_answer: string
 */
export default function AudioComprehension({
  step,
  lessonId,
  onComplete,
  userLanguage = "en",
}) {
  const audioConfig = step?.audio_config || {};
  const questions = step?.questions || [];
  const transcriptReveal = audioConfig.transcript_reveal || "after_completion";
  const maxReplaysForFullXp = audioConfig.max_replays_for_full_xp || 3;
  const baseXp = step?.xp_reward || 20;

  // Audio state
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioConfig.duration_seconds || 0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [playCount, setPlayCount] = useState(0);

  // Question state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionId: { selected, correct } }
  const [showFeedback, setShowFeedback] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Transcript state
  const [transcriptVisible, setTranscriptVisible] = useState(
    transcriptReveal === "always"
  );

  const isPortuguese = userLanguage === "pt-BR" || userLanguage === "pt";
  const labels = isPortuguese
    ? {
        play: "Ouvir",
        pause: "Pausar",
        replay: "Recomeçar",
        showTranscript: "Mostrar transcrição",
        hideTranscript: "Ocultar transcrição",
        transcript: "Transcrição",
        playCount: "Reproduções",
        questionOf: (a, b) => `Pergunta ${a} de ${b}`,
        submit: "Enviar resposta",
        next: "Próxima pergunta",
        finish: "Concluir",
        correct: "Correto!",
        incorrect: "Não foi dessa vez.",
        correctAnswer: "Resposta correta",
        summary: "Resultado",
        score: "Pontuação",
        xpEarned: "XP ganho",
        completedTitle: "Atividade concluída!",
        replayHint: `Reproduza o áudio. Reproduções extras (acima de ${maxReplaysForFullXp}) reduzem o XP.`,
      }
    : {
        play: "Play",
        pause: "Pause",
        replay: "Replay",
        showTranscript: "Show transcript",
        hideTranscript: "Hide transcript",
        transcript: "Transcript",
        playCount: "Plays",
        questionOf: (a, b) => `Question ${a} of ${b}`,
        submit: "Submit answer",
        next: "Next question",
        finish: "Finish",
        correct: "Correct!",
        incorrect: "Not quite.",
        correctAnswer: "Correct answer",
        summary: "Summary",
        score: "Score",
        xpEarned: "XP earned",
        completedTitle: "Activity complete!",
        replayHint: `Replay as needed. More than ${maxReplaysForFullXp} replays reduces XP.`,
      };

  // Format time as M:SS
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setAudioLoaded(true);
    };
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(audio.duration || 0);
    };
    const handleError = () => {
      setAudioError("Failed to load audio");
      setAudioLoaded(false);
    };

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setPlayCount((prev) => prev + 1);
        })
        .catch((err) => {
          console.error("Audio playback failed:", err);
          setAudioError("Playback failed");
        });
    }
  }, [isPlaying]);

  const replayFromStart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setPlayCount((prev) => prev + 1);
      })
      .catch((err) => {
        console.error("Replay failed:", err);
      });
  }, []);

  // Transcript visibility logic based on reveal mode
  const shouldAllowTranscriptToggle = () => {
    if (transcriptReveal === "always") return false; // always shown, no toggle
    if (transcriptReveal === "on_request") return true;
    if (transcriptReveal === "after_first_attempt") return hasAttempted;
    if (transcriptReveal === "after_completion") return completed;
    return false;
  };

  // Handle question submit
  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correct_answer;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        selected: selectedOption,
        correct: isCorrect,
      },
    }));
    setShowFeedback(true);
    setHasAttempted(true);

    // Auto-reveal transcript if mode is after_first_attempt
    if (transcriptReveal === "after_first_attempt" && !transcriptVisible) {
      setTranscriptVisible(true);
    }
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    setSelectedOption(null);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // All questions answered - complete the step
      finalizeStep();
    }
  };

  const finalizeStep = () => {
    setCompleted(true);
    if (transcriptReveal === "after_completion") {
      setTranscriptVisible(true);
    }

    // Calculate XP — full XP if within replay limit, reduce by 25% per extra replay (min 50%)
    const correctCount = Object.values(answers).filter((a) => a.correct).length;
    const totalQuestions = questions.length;
    const accuracyMultiplier =
      totalQuestions > 0 ? correctCount / totalQuestions : 1;

    let replayMultiplier = 1;
    if (playCount > maxReplaysForFullXp) {
      const overage = playCount - maxReplaysForFullXp;
      replayMultiplier = Math.max(0.5, 1 - overage * 0.25);
    }

    const finalXp = Math.round(baseXp * accuracyMultiplier * replayMultiplier);
    onComplete?.(finalXp);
  };

  // Render question
  const renderQuestion = () => {
    if (questions.length === 0) return null;
    const question = questions[currentQuestionIndex];
    if (!question) return null;

    const previousAnswer = answers[question.id];
    const showQuestionFeedback = showFeedback && previousAnswer;

    // Render gap_fill text with the gap visually highlighted
    const renderQuestionText = () => {
      if (question.type === "gap_fill" && question.text.includes("___")) {
        const parts = question.text.split("___");
        return (
          <span>
            {parts[0]}
            <span className="inline-block min-w-[60px] mx-1 px-2 border-b-2 border-accent-500">
              {showQuestionFeedback ? previousAnswer.selected : "____"}
            </span>
            {parts[1]}
          </span>
        );
      }
      return question.text;
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {labels.questionOf(currentQuestionIndex + 1, questions.length)}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300">
            {question.type === "multiple_choice"
              ? "Multiple choice"
              : "Gap fill"}
          </span>
        </div>

        <p className="text-lg text-gray-900 dark:text-white mb-6">
          {renderQuestionText()}
        </p>

        <div className="grid gap-3 mb-4">
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectAnswer = option === question.correct_answer;
            let buttonClass =
              "w-full text-left px-4 py-3 rounded-lg border-2 transition-all ";

            if (showQuestionFeedback) {
              if (isCorrectAnswer) {
                buttonClass +=
                  "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200";
              } else if (isSelected && !isCorrectAnswer) {
                buttonClass +=
                  "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200";
              } else {
                buttonClass +=
                  "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 opacity-60";
              }
            } else if (isSelected) {
              buttonClass +=
                "border-accent-500 bg-accent-50 dark:bg-accent-900/20 text-gray-900 dark:text-white";
            } else {
              buttonClass +=
                "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600";
            }

            return (
              <button
                key={idx}
                onClick={() => !showFeedback && setSelectedOption(option)}
                disabled={showFeedback}
                className={buttonClass}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showQuestionFeedback && isCorrectAnswer && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {showQuestionFeedback &&
                    isSelected &&
                    !isCorrectAnswer && (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                </div>
              </button>
            );
          })}
        </div>

        {showQuestionFeedback && (
          <div
            className={`p-3 rounded-lg mb-4 ${
              previousAnswer.correct
                ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                : "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200"
            }`}
          >
            <div className="flex items-start gap-2">
              {previousAnswer.correct ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">
                  {previousAnswer.correct ? labels.correct : labels.incorrect}
                </p>
                {!previousAnswer.correct && (
                  <p className="text-sm mt-1">
                    {labels.correctAnswer}:{" "}
                    <span className="font-semibold">
                      {question.correct_answer}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          {!showFeedback ? (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedOption === null}
              className="px-6 py-2 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {labels.submit}
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors"
            >
              {currentQuestionIndex < questions.length - 1
                ? labels.next
                : labels.finish}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render summary
  const renderSummary = () => {
    const correctCount = Object.values(answers).filter((a) => a.correct).length;
    const totalQuestions = questions.length;

    return (
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center">
        <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {labels.completedTitle}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          {labels.score}: {correctCount} / {totalQuestions}
        </p>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {labels.playCount}: {playCount}
          {playCount > maxReplaysForFullXp && (
            <span className="ml-2 text-amber-600">
              (-{Math.min(50, (playCount - maxReplaysForFullXp) * 25)}% XP)
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Audio Player */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 rounded-xl p-6">
        <audio
          ref={audioRef}
          src={audioConfig.audio_url}
          preload="metadata"
        />

        {audioError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg text-sm">
            {audioError}
          </div>
        )}

        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={togglePlay}
            disabled={!!audioError}
            className="w-14 h-14 rounded-full bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white flex items-center justify-center transition-colors shadow-lg"
            aria-label={isPlaying ? labels.pause : labels.play}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          <button
            onClick={replayFromStart}
            disabled={!!audioError || !audioLoaded}
            className="w-12 h-12 rounded-full border-2 border-accent-500 text-accent-500 hover:bg-accent-500 hover:text-white disabled:opacity-50 flex items-center justify-center transition-colors"
            aria-label={labels.replay}
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 transition-all"
                style={{
                  width:
                    duration > 0
                      ? `${(currentTime / duration) * 100}%`
                      : "0%",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
            <Volume2 className="w-4 h-4" />
            <span>
              {labels.playCount}: {playCount}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          {labels.replayHint}
        </p>
      </div>

      {/* Transcript section */}
      {audioConfig.transcript && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {labels.transcript}
            </h4>
            {shouldAllowTranscriptToggle() && (
              <button
                onClick={() => setTranscriptVisible((v) => !v)}
                className="flex items-center gap-1 text-sm text-accent-600 dark:text-accent-400 hover:underline"
              >
                {transcriptVisible ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    {labels.hideTranscript}
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    {labels.showTranscript}
                  </>
                )}
              </button>
            )}
          </div>
          {transcriptVisible && (
            <div className="px-4 pb-4 text-gray-700 dark:text-gray-300 italic border-t border-gray-200 dark:border-gray-700 pt-4">
              {audioConfig.transcript}
            </div>
          )}
        </div>
      )}

      {/* Questions or Summary */}
      {!completed ? renderQuestion() : renderSummary()}
    </div>
  );
}
