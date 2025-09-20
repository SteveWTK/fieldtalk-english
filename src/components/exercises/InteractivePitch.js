// components/exercises/InteractivePitch.js
import React, { useState, useRef, useEffect } from "react";
import { Volume2, MapPin, Info } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/components/AuthProvider";

export default function InteractivePitch({
  interactiveConfig,
  lessonId,
  onComplete,
}) {
  const { user } = useAuth();
  const { t } = useTranslation(user);
  // Create unique localStorage key for this lesson and component
  const STORAGE_KEY = `lesson-${lessonId}-interactivePitch-progress`;

  // Initialize state with localStorage data if available
  const [clickedAreas, setClickedAreas] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return new Set(data.clickedAreas || []);
        } catch (e) {
          console.error("Error loading saved progress:", e);
        }
      }
    }
    return new Set();
  });

  const [currentArea, setCurrentArea] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.currentArea || null;
        } catch {}
      }
    }
    return null;
  });

  const [showTranslations, setShowTranslations] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          return data.showTranslations || false;
        } catch {}
      }
    }
    return false;
  });

  const [audioLoading, setAudioLoading] = useState(false);
  const [hoveredArea, setHoveredArea] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const audioRef = useRef(null);

  // Save progress to localStorage whenever relevant state changes
  useEffect(() => {
    if (typeof window !== "undefined" && !isCompleted) {
      const progressData = {
        clickedAreas: Array.from(clickedAreas),
        currentArea,
        showTranslations,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
    }
  }, [clickedAreas, currentArea, showTranslations, STORAGE_KEY, isCompleted]);

  // Clear localStorage when component completes
  useEffect(() => {
    if (isCompleted) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [isCompleted, STORAGE_KEY]);

  const handleAreaClick = async (area) => {
    // Mark as clicked
    setClickedAreas((prev) => new Set([...prev, area.id]));

    // Show area info
    setCurrentArea(area);

    // Play audio automatically when clicking
    await playAreaAudio(area);

    // Check completion
    if (clickedAreas.size + 1 >= interactiveConfig.click_areas.length) {
      setIsCompleted(true);
      setTimeout(() => {
        if (onComplete) onComplete(20); // 20 XP for completion
      }, 1000);
    }
  };

  const playAreaAudio = async (area) => {
    if (!area) return;

    setAudioLoading(true);
    try {
      // Use label or description for TTS if no audio URL
      const textForAudio = area.label || area.description;
      const audioUrl = await generateOrFetchAudio(area.audio_url, textForAudio);

      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error("Audio playback failed:", error);
    } finally {
      setAudioLoading(false);
    }
  };

  return (
    <div className="interactive-pitch-container">
      {/* Main instruction text */}
      <div className="mb-4">
        <p className="text-lg text-gray-700 dark:text-gray-300">
          {interactiveConfig.instruction || t("click_areas_to_learn")}
        </p>
      </div>

      <div className="pitch-wrapper relative">
        <svg
          viewBox="0 0 400 600"
          className="w-full max-w-md mx-auto border-2 border-green-600 bg-green-100"
        >
          {/* Football pitch SVG */}
          <rect width="400" height="600" fill="#16a34a" />

          {/* Penalty areas */}
          <rect
            x="80"
            y="520"
            width="240"
            height="80"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />
          <rect
            x="80"
            y="0"
            width="240"
            height="80"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />

          {/* Goal areas */}
          <rect
            x="160"
            y="560"
            width="80"
            height="40"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />
          <rect
            x="160"
            y="0"
            width="80"
            height="40"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />

          {/* Center circle */}
          <circle
            cx="200"
            cy="300"
            r="50"
            fill="none"
            stroke="white"
            strokeWidth="2"
          />

          {/* Center line */}
          <line
            x1="0"
            y1="300"
            x2="400"
            y2="300"
            stroke="white"
            strokeWidth="2"
          />

          {/* Interactive click areas */}
          {interactiveConfig.click_areas?.map((area) => {
            const x = parseFloat(area.x.replace("%", "")) * 4; // Convert % to SVG coords
            const y = parseFloat(area.y.replace("%", "")) * 6;
            const isClicked = clickedAreas.has(area.id);
            const isHovered = hoveredArea === area.id;

            return (
              <g
                key={area.id}
                onMouseEnter={() => setHoveredArea(area.id)}
                onMouseLeave={() => setHoveredArea(null)}
                onClick={() => handleAreaClick(area)}
                className="cursor-pointer"
              >
                {/* Outer glow for clicked items */}
                {isClicked && (
                  <circle
                    cx={x}
                    cy={y}
                    r="20"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    opacity="0.5"
                    className="animate-pulse"
                  />
                )}

                {/* Main circle */}
                <circle
                  cx={x}
                  cy={y}
                  r="15"
                  fill={isClicked ? "#065f46" : "#0284c7"}
                  stroke="white"
                  strokeWidth="2"
                  transform={isHovered ? `scale(1.1)` : "scale(1)"}
                  style={{
                    transformOrigin: `${x}px ${y}px`,
                    transition: "transform 0.2s ease-in-out",
                  }}
                />

                {/* Audio indicator icon */}
                <text
                  x={x}
                  y={y + 5}
                  textAnchor="middle"
                  className="text-xs fill-white pointer-events-none"
                  fontSize="12"
                >
                  🔊
                </text>

                {/* Label below */}
                <text
                  x={x}
                  y={y - 25}
                  textAnchor="middle"
                  className="text-xs font-semibold pointer-events-none"
                  fill="black"
                  stroke="#000"
                  strokeWidth="0.1"
                >
                  {area.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Area Information Panel */}
      {currentArea && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              <h4 className="font-semibold text-primary-900 dark:text-primary-50">
                {currentArea.label}
              </h4>
            </div>
            <button
              onClick={() => setShowTranslations(!showTranslations)}
              className="font-bold text-accent-600 dark:text-accent-400 hover:text-accent-800 dark:hover:text-accent-300 text-sm flex items-center space-x-1"
            >
              <Info className="w-4 h-4" />
              <span>
                {showTranslations
                  ? t("hide_translation")
                  : t("show_translation")}
              </span>
            </button>
          </div>

          {/* <p className="text-gray-700 dark:text-gray-300 mb-3">
            {currentArea.description || "Click to learn more about this area."}
          </p> */}

          {showTranslations && currentArea.translation && (
            <div className="bg-white dark:bg-primary-800 p-3 rounded mb-3">
              <p className="text-sm text-primary-600 dark:text-primary-400 mb-1">
                Português:
              </p>
              <p className="text-primary-600 dark:text-primary-400 font-medium">
                {currentArea.translation}
              </p>
            </div>
          )}

          <button
            onClick={() => playAreaAudio(currentArea)}
            disabled={audioLoading}
            className="flex items-center space-x-2 bg-accent-600 text-white px-4 py-2 rounded-lg hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {audioLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span>{audioLoading ? t("loading") : t("play_audio_again")}</span>
          </button>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("explored")}: {clickedAreas.size} /{" "}
          {interactiveConfig.click_areas?.length || 0} {t("areas")}
        </p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
          <div
            className="bg-accent-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(clickedAreas.size / (interactiveConfig.click_areas?.length || 1)) * 100}%`,
            }}
          ></div>
        </div>

        {clickedAreas.size === interactiveConfig.click_areas?.length && (
          <div className="mt-3 p-3 bg-green-100 dark:bg-accent-900/20 text-accent-800 dark:text-accent-200 rounded-lg">
            <p className="font-semibold">{t("all_areas_explored")}</p>
          </div>
        )}
      </div>

      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}

async function generateOrFetchAudio(audioUrl, text) {
  // First try to use pre-recorded audio if it exists and is a valid path
  if (audioUrl && audioUrl.startsWith("/audio/")) {
    // Check if the audio file actually exists
    try {
      const response = await fetch(audioUrl, { method: "HEAD" });
      if (response.ok) {
        return audioUrl;
      }
    } catch {
      console.log("Pre-recorded audio not found, falling back to TTS");
    }
  }

  // Fallback to TTS generation if we have text
  if (!text) {
    console.warn("No text provided for TTS generation");
    return null;
  }

  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        englishVariant: "british",
        voiceGender: "female",
      }),
    });

    if (response.ok) {
      const audioBlob = await response.blob();
      return URL.createObjectURL(audioBlob);
    } else {
      console.error("TTS API error:", response.status);
    }
  } catch (error) {
    console.error("TTS generation failed:", error);
  }

  return null;
}
