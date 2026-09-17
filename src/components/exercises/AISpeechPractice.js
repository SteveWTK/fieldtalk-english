// components/exercises/AISpeechPractice.js
import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  // MicOff,
  Play,
  RotateCcw,
  Pause,
  Volume2,
  Square,
} from "lucide-react";
import Button from "@/components/ui/button";
import { getStepXp } from "@/lib/xp/stepTypeDefaults";

export default function AISpeechPractice({
  // prompt,
  expectedText,
  lessonId,
  onComplete,
  // Grants XP without advancing the step. Fires once as soon as the
  // AI feedback arrives so users who tap the lesson-page Next arrow
  // (skipping the inline "Continue →" button) still earn the XP they
  // just recorded for. Called with a numeric delta the parent adds
  // to xpEarned; parent DOES NOT advance the step on this callback.
  onAttempt,
  step,
}) {
  // XP = step's base (from getStepXp) scaled by the AI's overall_score.
  // 50% floor so any submission still grants something; cap at base.
  const baseXp = getStepXp(step);
  // Bookkeeping for onAttempt-granted XP so the "Continue →" button's
  // onComplete only fires the REMAINING delta, never double-counting.
  const [grantedXp, setGrantedXp] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        setAudioBlob(audioBlob);

        // Create URL for audio playback
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Could not access microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(intervalRef.current);
    }
  };

  const playRecording = () => {
    if (!audioUrl) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.play();
      setIsPlaying(true);
    }
  };

  const analyzeRecording = async () => {
    if (!audioBlob) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      formData.append("lessonId", lessonId || "demo");
      formData.append("expectedText", expectedText);
      formData.append("language", "pt-BR"); // Get from user settings
      // Score-only mode: the UI currently displays just the percentage, so
      // we don't pay tokens for the verbose feedback fields. Switch back
      // to "full" when strengths/improvements are surfaced again.
      formData.append("feedback_mode", "score_only");

      const response = await fetch("/api/ai-speech", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("API Error Response:", result);
        throw new Error(result.error || "Failed to analyze speech");
      }

      setTranscript(result.transcript);
      setFeedback(result.feedback);

      // Don't call onComplete here - wait for user to click "Continue" or "Practice Again"
      // Store XP to award when user continues
      // const xp = Math.max(20, result.feedback?.overall_score || 50);
    } catch (error) {
      console.error("Speech analysis failed:", error);
      alert(`Failed to analyze recording: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Grant XP the moment feedback arrives, without waiting for the
  // inline "Continue →" click. Fires onAttempt with the delta between
  // the score-derived XP and any previously-granted amount, so a user
  // who re-records and improves gets the delta (never a decrease).
  // The parent's onAttempt handler adds XP without advancing the step
  // — advancement stays with the outer Next arrow (or Continue button).
  useEffect(() => {
    if (!feedback || typeof onAttempt !== "function") return;
    const score = Number(feedback?.overall_score) || 0;
    const scaled = Math.round(baseXp * (score / 100));
    const xp = Math.max(Math.round(baseXp * 0.5), scaled);
    const delta = xp - grantedXp;
    if (delta > 0) {
      setGrantedXp(xp);
      onAttempt(delta);
    }
  }, [feedback, baseXp, grantedXp, onAttempt]);

  const resetRecording = () => {
    // Clean up audio resources
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setTranscript("");
    setFeedback(null);
    setRecordingTime(0);
  };

  return (
    <div className="ai-speech-practice">
      <div className="mb-6">
        {/* <h3 className="text-lg font-semibold mb-2">Pratique sua Pronuncia.</h3> */}
        <p className="px-4 mb-4 text-primary-100">
          Read the words below
        </p>
        <div className="bg-signal-english/10 p-4 rounded-control">
          {/* <p className="text-gray-700 mb-2">{prompt}</p> */}
          <div className="bg-primary-panel p-3 rounded-control border-l-4 border-accent-400">
            <p className="font-mono text-lg text-primary-50">&quot;{expectedText}&quot;</p>
          </div>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="recording-controls text-center mb-6">
        {!audioBlob && (
          <div>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${
                isRecording
                  ? "bg-signal-alert hover:bg-signal-alert/90 animate-pulse text-primary-50"
                  : "bg-accent-400 hover:bg-accent-300 text-primary-800"
              }`}
            >
              {isRecording ? (
                <Square className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>

            <p className="text-sm text-primary-300">
              {isRecording
                ? `Recording... ${recordingTime}s`
                : "Click to start recording"}
            </p>

            {isRecording && (
              <div className="mt-2">
                <div className="w-32 h-2 bg-primary-700 rounded-full mx-auto">
                  <div
                    className="h-2 bg-signal-alert rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min((recordingTime / 10) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-primary-400 mt-1">Max 10 seconds</p>
              </div>
            )}
          </div>
        )}

        {audioBlob && !feedback && (
          <div>
            <div className="flex justify-center space-x-3 mb-4">
              <Button
                variant="secondary"
                onClick={playRecording}
                Icon={isPlaying ? Pause : Volume2}
              >
                {isPlaying ? "Pause" : "Play"}
              </Button>

              <Button
                variant="primary"
                onClick={analyzeRecording}
                disabled={loading}
                loading={loading}
                Icon={Play}
              >
                {loading ? "Analyzing..." : "Get Feedback"}
              </Button>

              <Button
                variant="secondary"
                onClick={resetRecording}
                Icon={RotateCcw}
              >
                Try Again
              </Button>
            </div>

            <p className="text-sm text-primary-300">
              Recording ready! Listen to review your pronunciation, then click
              &quot;Get Feedback&quot; for analysis.
            </p>
          </div>
        )}
      </div>

      {/* Feedback Display */}
      {feedback && (
        <div className="feedback-section">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  feedback.pronunciation_score >= 80
                    ? "text-accent-400"
                    : feedback.pronunciation_score >= 60
                      ? "text-signal-performance"
                      : "text-signal-alert"
                }`}
              >
                {feedback.pronunciation_score}
              </div>
              <div className="text-sm text-primary-300">Pronunciation</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  feedback.accuracy_score >= 80
                    ? "text-accent-400"
                    : feedback.accuracy_score >= 60
                      ? "text-signal-performance"
                      : "text-signal-alert"
                }`}
              >
                {feedback.accuracy_score}
              </div>
              <div className="text-sm text-primary-300">Accuracy</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  feedback.overall_score >= 80
                    ? "text-accent-400"
                    : feedback.overall_score >= 60
                      ? "text-signal-performance"
                      : "text-signal-alert"
                }`}
              >
                {feedback.overall_score}
              </div>
              <div className="text-sm text-primary-300">Overall</div>
            </div>
          </div>

          {/* {transcript && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-1">What we heard:</h4>
              <p className="font-mono">&quot;{transcript}&quot;</p>
            </div>
          )} */}

          {/* <div className="space-y-4">
            {feedback.strengths?.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">
                  ✅ Strengths
                </h4>
                <ul className="text-sm text-green-700 space-y-1">
                  {feedback.strengths.map((strength, index) => (
                    <li key={index}>• {strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.improvements?.length > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  💡 Areas to Improve
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {feedback.improvements.map((improvement, index) => (
                    <li key={index}>• {improvement}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.encouragement && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">
                  🌟 Encouragement
                </h4>
                <p className="text-sm text-blue-700">
                  {feedback.encouragement}
                </p>
              </div>
            )}

            {feedback.specific_tips?.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-800 mb-2">
                  🎯 Practice Tips
                </h4>
                <ul className="text-sm text-purple-700 space-y-1">
                  {feedback.specific_tips.map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div> */}

          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Button variant="secondary" onClick={resetRecording}>
              Practice Again
            </Button>
            {onComplete && (
              <Button
                variant="primary"
                onClick={() => {
                  // XP has already been granted via the feedback-arrival
                  // useEffect (which fires onAttempt with the delta),
                  // so Continue just advances the step. Passing 0 keeps
                  // the parent's onComplete signature unchanged while
                  // avoiding double-counting the XP.
                  onComplete(0);
                }}
              >
                Continue →
              </Button>
            )}
          </div>
          {/* Feedback details preserved for future use:
              {feedback.strengths?.length > 0 && (...) }
              {feedback.improvements?.length > 0 && (...) }
              etc. */}
        </div>
      )}
    </div>
  );
}
