// components/exercises/AudioComprehension.js
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { getStepXp } from "@/lib/xp/stepTypeDefaults";
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
  // Loader2,
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
  // lessonId,
  onComplete,
  userLanguage = "en",
}) {
  const audioConfig = step?.audio_config || {};
  const questions = step?.questions || [];
  const transcriptReveal = audioConfig.transcript_reveal || "after_completion";
  const maxReplaysForFullXp = audioConfig.max_replays_for_full_xp || 3;
  const baseXp = getStepXp(step);

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

  const isPortuguese = userLanguage === "pt";
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
            <span className="inline-block min-w-[60px] mx-1 px-2 border-b-2 border-accent-400">
              {showQuestionFeedback ? previousAnswer.selected : "____"}
            </span>
            {parts[1]}
          </span>
        );
      }
      return question.text;
    };

    return (
      <div className="bg-primary-panel rounded-panel p-6 border border-primary-700">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-primary-400">
            {labels.questionOf(currentQuestionIndex + 1, questions.length)}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-accent-400/15 text-accent-400">
            {question.type === "multiple_choice"
              ? "Multiple choice"
              : "Gap fill"}
          </span>
        </div>

        <p className="text-lg text-primary-50 mb-6">
          {renderQuestionText()}
        </p>

        <div className="grid gap-3 mb-4">
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectAnswer = option === question.correct_answer;
            let buttonClass =
              "w-full text-left px-4 py-3 rounded-control border-2 transition-all ";

            if (showQuestionFeedback) {
              if (isCorrectAnswer) {
                buttonClass +=
                  "border-accent-400 bg-accent-400/10 text-accent-400";
              } else if (isSelected && !isCorrectAnswer) {
                buttonClass +=
                  "border-signal-alert bg-signal-alert/10 text-signal-alert";
              } else {
                buttonClass +=
                  "border-primary-700 text-primary-400 opacity-60";
              }
            } else if (isSelected) {
              buttonClass +=
                "border-accent-400 bg-accent-400/10 text-primary-50";
            } else {
              buttonClass +=
                "border-primary-700 text-primary-100 hover:border-primary-600";
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
                    <CheckCircle className="w-5 h-5 text-accent-400" />
                  )}
                  {showQuestionFeedback && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-5 h-5 text-signal-alert" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {showQuestionFeedback && (
          <div
            className={`p-3 rounded-control mb-4 ${
              previousAnswer.correct
                ? "bg-accent-400/10 text-accent-400"
                : "bg-signal-performance/10 text-signal-performance"
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
              className="px-6 py-2 bg-accent-400 hover:bg-accent-300 disabled:bg-primary-700 disabled:text-primary-500 disabled:cursor-not-allowed text-primary-800 font-medium rounded-control transition-colors"
            >
              {labels.submit}
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="px-6 py-2 bg-accent-400 hover:bg-accent-300 text-primary-800 font-medium rounded-control transition-colors"
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
      <div className="bg-accent-400/10 border border-accent-400/40 rounded-panel p-6 text-center">
        <Trophy className="w-12 h-12 text-signal-performance mx-auto mb-3" />
        <h3 className="text-xl font-bold text-primary-50 mb-2">
          {labels.completedTitle}
        </h3>
        <p className="text-primary-100 mb-4">
          {labels.score}: {correctCount} / {totalQuestions}
        </p>
        <div className="text-sm text-primary-300">
          {labels.playCount}: {playCount}
          {playCount > maxReplaysForFullXp && (
            <span className="ml-2 text-signal-performance">
              (-{Math.min(50, (playCount - maxReplaysForFullXp) * 25)}% XP)
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Optional step-level image — full width on phones, constrained
          and centred on laptops/desktops so it doesn't dominate the step.
          Mirrors the ai_gap_fill image_url pattern. */}
      {step?.image_url && (
        <div className="rounded-panel overflow-hidden border border-primary-700 sm:max-w-md sm:mx-auto">
          <Image
            src={step.image_url}
            alt=""
            width={800}
            height={500}
            sizes="(max-width: 640px) 100vw, 448px"
            className="w-full h-64 sm:h-128 object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        </div>
      )}

      {/* Audio Player */}
      <div className="bg-primary-panel border border-primary-700 rounded-panel p-6">
        {/* preload="auto" tells the browser to start downloading the
            audio as soon as the step appears, so the user doesn't wait
            for the file when they click play. */}
        <audio ref={audioRef} src={audioConfig.audio_url} preload="auto" />

        {audioError && (
          <div className="mb-4 p-3 bg-signal-alert/10 border border-signal-alert/40 text-signal-alert rounded-control text-sm">
            {audioError}
          </div>
        )}

        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={togglePlay}
            disabled={!!audioError}
            className="w-14 h-14 rounded-full bg-accent-400 hover:bg-accent-300 disabled:opacity-50 text-primary-800 flex items-center justify-center transition-colors"
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
            className="w-12 h-12 rounded-full border-2 border-primary-600 text-primary-100 hover:border-primary-400 hover:text-primary-50 disabled:opacity-50 flex items-center justify-center transition-colors"
            aria-label={labels.replay}
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <div className="h-2 bg-primary-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-400 transition-all"
                style={{
                  width:
                    duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-primary-300 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm text-primary-300">
            <Volume2 className="w-4 h-4" />
            <span>
              {labels.playCount}: {playCount}
            </span>
          </div>
        </div>

        <p className="text-xs text-primary-400 italic">
          {labels.replayHint}
        </p>
      </div>

      {/* Transcript section */}
      {audioConfig.transcript && (
        <div className="bg-primary-900 rounded-panel border border-primary-700 overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <h4 className="font-semibold text-primary-50">
              {labels.transcript}
            </h4>
            {shouldAllowTranscriptToggle() && (
              <button
                onClick={() => setTranscriptVisible((v) => !v)}
                className="flex items-center gap-1 text-sm text-accent-400 hover:underline"
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
            <div className="px-4 pb-4 text-primary-100 italic border-t border-primary-700 pt-4">
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
