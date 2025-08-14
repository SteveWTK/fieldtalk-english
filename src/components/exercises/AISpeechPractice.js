// components/exercises/AISpeechPractice.js
import React, { useState, useRef } from "react";
import { Mic, MicOff, Play, RotateCcw } from "lucide-react";

export default function AISpeechPractice({
  prompt,
  expectedText,
  lessonId,
  onComplete,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

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

  const analyzeRecording = async () => {
    if (!audioBlob) return;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.wav");
      formData.append("lessonId", lessonId);
      formData.append("expectedText", expectedText);
      formData.append("language", "pt-BR"); // Get from user settings

      const response = await fetch("/api/ai-speech", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze speech");
      }

      const result = await response.json();
      setTranscript(result.transcript);
      setFeedback(result.feedback);

      // Award XP based on performance
      const xp = Math.max(20, result.feedback.overall_score);
      onComplete(xp);
    } catch (error) {
      console.error("Speech analysis failed:", error);
      alert("Failed to analyze recording. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setTranscript("");
    setFeedback(null);
    setRecordingTime(0);
  };

  return (
    <div className="ai-speech-practice">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Speaking Practice</h3>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-gray-700 mb-2">{prompt}</p>
          <div className="bg-white p-3 rounded border-l-4 border-blue-500">
            <p className="font-mono text-lg">&quot;{expectedText}&quot;</p>
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
                  ? "bg-red-500 hover:bg-red-600 animate-pulse"
                  : "bg-blue-500 hover:bg-blue-600"
              } text-white`}
            >
              {isRecording ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>

            <p className="text-sm text-gray-600">
              {isRecording
                ? `Recording... ${recordingTime}s`
                : "Click to start recording"}
            </p>

            {isRecording && (
              <div className="mt-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full mx-auto">
                  <div
                    className="h-2 bg-red-500 rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min((recordingTime / 10) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Max 10 seconds</p>
              </div>
            )}
          </div>
        )}

        {audioBlob && !feedback && (
          <div>
            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={analyzeRecording}
                disabled={loading}
                className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Play className="w-5 h-5" />
                )}
                <span>{loading ? "Analyzing..." : "Get Feedback"}</span>
              </button>

              <button
                onClick={resetRecording}
                className="bg-gray-500 text-white px-4 py-3 rounded-lg hover:bg-gray-600 flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>
            </div>

            <p className="text-sm text-gray-600">
              Recording ready! Click &quot;Get Feedback&quot; to analyze your
              pronunciation.
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
                    ? "text-green-500"
                    : feedback.pronunciation_score >= 60
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {feedback.pronunciation_score}
              </div>
              <div className="text-sm text-gray-600">Pronunciation</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  feedback.accuracy_score >= 80
                    ? "text-green-500"
                    : feedback.accuracy_score >= 60
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {feedback.accuracy_score}
              </div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  feedback.overall_score >= 80
                    ? "text-green-500"
                    : feedback.overall_score >= 60
                      ? "text-yellow-500"
                      : "text-red-500"
                }`}
              >
                {feedback.overall_score}
              </div>
              <div className="text-sm text-gray-600">Overall</div>
            </div>
          </div>

          {transcript && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-1">What we heard:</h4>
              <p className="font-mono">&quot;{transcript}&quot;</p>
            </div>
          )}

          <div className="space-y-4">
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
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={resetRecording}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Practice Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
