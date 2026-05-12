// src/components/VocabularyList.js
// Wrapper around VocabularyItem that coordinates the "attention shake"
// across cards: when the user activates one card, the next one starts
// shaking to invite the next click.
"use client";

import React, { useState } from "react";
import VocabularyItem from "./VocabularyItem";

export default function VocabularyList({ items, ...itemProps }) {
  // Index of the card currently inviting attention. Starts at 0 so the very
  // first card shakes on mount.
  const [activeShakeIndex, setActiveShakeIndex] = useState(0);

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
