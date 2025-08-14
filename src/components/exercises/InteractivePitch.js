// components/exercises/InteractivePitch.js
import React, { useState, useRef } from "react";
import { Volume2, MapPin, Info } from "lucide-react";

export default function InteractivePitch({ interactiveConfig, onComplete }) {
  const [clickedAreas, setClickedAreas] = useState(new Set());
  const [currentArea, setCurrentArea] = useState(null);
  const [showTranslations, setShowTranslations] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [hoveredArea, setHoveredArea] = useState(null);
  const audioRef = useRef(null);

  const handleAreaClick = async (area) => {
    // Mark as clicked
    setClickedAreas((prev) => new Set([...prev, area.id]));

    // Show area info
    setCurrentArea(area);

    // Play audio automatically when clicking
    await playAreaAudio(area);

    // Check completion
    if (clickedAreas.size + 1 >= interactiveConfig.click_areas.length) {
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
          {interactiveConfig.instruction ||
            "Click on each highlighted area to learn more about the football pitch."}
        </p>
      </div>

      <div className="pitch-wrapper relative">
        <svg
          viewBox="0 0 400 600"
          className="w-full max-w-md mx-auto border-2 border-green-600 bg-green-100"
        >
          {/* Football pitch SVG */}
          <rect width="400" height="600" fill="#4ade80" />

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
                  fill={isClicked ? "#22c55e" : "#14438e"}
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
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {currentArea.label}
              </h4>
            </div>
            <button
              onClick={() => setShowTranslations(!showTranslations)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center space-x-1"
            >
              <Info className="w-4 h-4" />
              <span>{showTranslations ? "Hide" : "Show"} Translation</span>
            </button>
          </div>

          <p className="text-gray-700 dark:text-gray-300 mb-3">
            {currentArea.description || "Click to learn more about this area."}
          </p>

          {showTranslations && currentArea.translation && (
            <div className="bg-white dark:bg-gray-800 p-3 rounded mb-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Portuguese:
              </p>
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                {currentArea.translation}
              </p>
            </div>
          )}

          <button
            onClick={() => playAreaAudio(currentArea)}
            disabled={audioLoading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {audioLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span>{audioLoading ? "Loading..." : "Play Audio Again"}</span>
          </button>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Explored: {clickedAreas.size} /{" "}
          {interactiveConfig.click_areas?.length || 0} areas
        </p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(clickedAreas.size / (interactiveConfig.click_areas?.length || 1)) * 100}%`,
            }}
          ></div>
        </div>

        {clickedAreas.size === interactiveConfig.click_areas?.length && (
          <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg">
            <p className="font-semibold">🎉 All areas explored! Well done!</p>
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
