// src/components/VocabularyItem.js
"use client";

import React, { useState } from "react";
import { Volume2 } from "lucide-react";
import { getTranslation } from "@/utils/translations";

export default function VocabularyItem({
  item,
  englishVariant = "british",
  voiceGender = "male",
  userLanguage = "en",
}) {
  const t = (key, fallback = "") => getTranslation(key, userLanguage, fallback);
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

  const playStoredAudio = async (url) => {
    if (!url) {
      console.warn("No audio URL provided");
      return;
    }

    try {
      // First check if the URL is valid and accessible
      if (url.startsWith("/audio/")) {
        const checkResponse = await fetch(url, { method: "HEAD" });
        if (!checkResponse.ok) {
          console.warn(`Audio file not found at ${url}, falling back to TTS`);
          // Fall back to TTS generation
          const wordText = item.word || item.english;
          await generateAudio(wordText);
          return;
        }
      }

      const audio = new Audio(url);
      await audio.play();
    } catch (error) {
      console.error("Error playing stored audio:", error);
      // Fall back to TTS generation
      const wordText = item.word || item.english;
      await generateAudio(wordText);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800  p-4 rounded-lg border border-gray-200 dark:border-gray-700">
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
          className="text-accent-600 hover:text-accent-700 hover:scale-105 disabled:opacity-50"
          onClick={async () => {
            const wordText = item.word || item.english;
            if (audioUrl) {
              await playStoredAudio(audioUrl);
            } else {
              await generateAudio(wordText);
            }
          }}
          disabled={audioLoading}
        >
          {audioLoading ? (
            <div className="w-5 h-5 border-2 border-accent-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-gray-600 dark:text-gray-300 mb-1">
        {item.translation}
      </p>
      {/* {item.example && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          {t("example")}: {item.example}
        </p>
      )} */}
      {item.tip && (
        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-black dark:text-gray-200 rounded text-sm">
          <strong>{t("tip")}:</strong> {item.tip}
        </div>
      )}
      {item.cultural_note && (
        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
          <strong>{t("cultural_note")}:</strong> {item.cultural_note}
        </div>
      )}
    </div>
  );
}
