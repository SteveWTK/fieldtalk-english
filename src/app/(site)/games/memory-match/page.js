"use client";
import { useState, useEffect } from "react";

const words = [
  { en: "Centre forward", pt: "Centro-avante" },
  { en: "Striker, Forward", pt: "Atacante" },
  { en: "Right winger", pt: "Ponta direita" },
  { en: "Left winger", pt: "Ponta esquerda" },
  { en: "Playmaker", pt: "Armador" },
  { en: "Midfielder", pt: "Meio-campista" },
  { en: "Defensive midfielder", pt: "Volante" },
  { en: "Attacking midfielder", pt: "Meia atacante" },
  { en: "Full back", pt: "Zaqueiro Central" },
  { en: "Left back", pt: "Lateral esquerdo" },
  { en: "Right back", pt: "Lateral direito" },
  { en: "Goalkeeper", pt: "Goleiro" },
];

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

export default function MemoryMatch() {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);

  useEffect(() => {
    const pairs = words.flatMap((w) => [
      { id: w.en, text: w.en, lang: "en" },
      { id: w.en, text: w.pt, lang: "pt" },
    ]);
    setCards(shuffle(pairs));
  }, []);

  const handleFlip = (index) => {
    if (flipped.length === 2 || flipped.includes(index)) return;
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped.map((i) => cards[i]);
      if (first.id === second.id && first.lang !== second.lang) {
        setMatched((m) => [...m, first.id]);
      }
      setTimeout(() => setFlipped([]), 1000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 my-12">
      <h2 className="text-2xl text-primary-900 dark:text-white font-bold mb-12">
        🌿 Football Memory Match
      </h2>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {cards.map((card, i) => {
          const isFlipped = flipped.includes(i) || matched.includes(card.id);
          return (
            <button
              key={i}
              onClick={() => handleFlip(i)}
              className={`w-28 h-20 flex items-center justify-center rounded-2xl shadow-md font-medium text-lg transition
                ${
                  isFlipped
                    ? "bg-growth-200 text-gray-800"
                    : "bg-gray-700 text-white"
                }`}
            >
              {isFlipped ? card.text : "❓"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
