// src/components/VocabularyItem.js
"use client";

import React, { useState } from "react";
import { Volume2 } from "lucide-react";

export default function VocabularyItem({
  item,
  englishVariant = "british",
  voiceGender = "male",
}) {
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(item.audio_url || null);

  const generateAudio = async (text) => {
    setAudioLoading(true);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          englishVariant: englishVariant,
          voiceGender: voiceGender,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Create and play audio directly
        const audio = new Audio(url);
        audio.onended = () => {
          URL.revokeObjectURL(url);
        };
        await audio.play();
      }
    } catch (error) {
      console.error("Error generating audio:", error);
    } finally {
      setAudioLoading(false);
    }
  };

  const playStoredAudio = (url) => {
    const audio = new Audio(url);
    audio.play().catch((error) => {
      console.error("Error playing audio:", error);
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-semibold text-gray-900 dark:text-white text-lg">
            {item.word || item.english}
          </span>
          {/* {item.pronunciation && (
            <span className="text-gray-500 dark:text-gray-400 ml-2 text-sm">
              {item.pronunciation}
            </span>
          )} */}
        </div>
        <button
          className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
          onClick={() => {
            const wordText = item.word || item.english;
            if (audioUrl) {
              playStoredAudio(audioUrl);
            } else {
              generateAudio(wordText);
            }
          }}
          disabled={audioLoading}
        >
          {audioLoading ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-gray-600 dark:text-gray-300 mb-1">
        {item.translation}
      </p>
      {item.example && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Example: {item.example}
        </p>
      )}
      {item.tip && (
        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-black dark:text-gray-200 rounded text-sm">
          <strong>Tip:</strong> {item.tip}
        </div>
      )}
      {item.cultural_note && (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
          <strong>Cultural Note:</strong> {item.cultural_note}
        </div>
      )}
    </div>
  );
}
