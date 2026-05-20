// src/components/VocabularyList.js
// Wrapper around VocabularyItem that coordinates the "attention shake"
// across cards: when the user activates one card, the next one starts
// shaking to invite the next click.
"use client";

import React, { useEffect, useState } from "react";
import VocabularyItem from "./VocabularyItem";

export default function VocabularyList({ items, ...itemProps }) {
  // Index of the card currently inviting attention. Starts at 0 so the very
  // first card shakes on mount.
  const [activeShakeIndex, setActiveShakeIndex] = useState(0);

  // Prefetch every item's audio file on mount so the first click on each
  // card plays without lag. Throwaway Audio() instances with preload="auto"
  // populate the browser's media cache in the background while the user
  // reads the words. Items without a pre-recorded audio_url (which fall
  // back to /api/tts on click) are skipped.
  const audioUrlsKey = (items || [])
    .map((item) => item?.audio_url || "")
    .join("|");
  useEffect(() => {
    if (!audioUrlsKey) return;
    const urls = audioUrlsKey.split("|").filter(Boolean);
    if (urls.length === 0) return;
    const audios = urls.map((url) => {
      try {
        const a = new Audio();
        a.preload = "auto";
        a.src = url;
        try {
          a.load();
        } catch {
          // ignore — some platforms throw if load() called eagerly
        }
        return a;
      } catch {
        return null;
      }
    });
    return () => {
      audios.forEach((a) => {
        if (a) a.src = "";
      });
    };
  }, [audioUrlsKey]);

  return (
    <div className="grid gap-4">
      {items.map((item, index) => (
        <VocabularyItem
          key={index}
          item={item}
          shouldShake={index === activeShakeIndex}
          onActivated={() => {
            // Move the spotlight to the next card. If this was the last card,
            // nothing further shakes (activeShakeIndex becomes out of range).
            setActiveShakeIndex((curr) =>
              index >= curr ? index + 1 : curr
            );
          }}
          {...itemProps}
        />
      ))}
    </div>
  );
}
