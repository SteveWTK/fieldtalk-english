"use client";
import { useState, useEffect } from "react";
import { Trophy, RefreshCw, Check, X, Target } from "lucide-react";

function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function MemoryMatch({ vocabulary, onComplete, lessonId }) {
  // Create a unique storage key for this lesson's memory match game
  const storageKey = `memoryMatch_${lessonId || "default"}`;

  // Load saved state from localStorage
  const loadSavedState = () => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load saved game state:", e);
        return null;
      }
    }
    return null;
  };

  const savedState = loadSavedState();

  const [gridSize, setGridSize] = useState(savedState?.gridSize || "3x4");
  const [cards, setCards] = useState(savedState?.cards || []);
  const [flipped, setFlipped] = useState(savedState?.flipped || []);
  const [matched, setMatched] = useState(savedState?.matched || []);
  const [matchedIndices, setMatchedIndices] = useState(
    savedState?.matchedIndices || []
  );
  const [matchedPairs, setMatchedPairs] = useState(
    savedState?.matchedPairs || []
  );
  const [attempts, setAttempts] = useState(savedState?.attempts || 0);
  const [correctMatches, setCorrectMatches] = useState(
    savedState?.correctMatches || 0
  );
  const [isComplete, setIsComplete] = useState(savedState?.isComplete || false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [gameStarted, setGameStarted] = useState(
    savedState?.gameStarted || false
  );

  const initializeGame = () => {
    if (!vocabulary || vocabulary.length === 0) return;

    const size = gridSize === "3x4" ? 6 : 8;
    const shuffledVocab = shuffle([...vocabulary]);
    const selectedWords = shuffledVocab.slice(0, size);

    const pairs = selectedWords.flatMap((word) => [
      {
        id: word.id || word.english,
        text: word.english || word.en,
        lang: "en",
        matched: false,
      },
      {
        id: word.id || word.english,
        text: word.translation || word.portuguese || word.pt,
        lang: "pt",
        matched: false,
      },
    ]);

    setCards(shuffle(pairs));
    setFlipped([]);
    setMatched([]);
    setMatchedIndices([]);
    setMatchedPairs([]);
    setAttempts(0);
    setCorrectMatches(0);
    setIsComplete(false);
    setShowSuccess(false);
    setShowError(false);
    setGameStarted(true);
    // Clear saved state when starting new game
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
  };

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (gameStarted && typeof window !== "undefined") {
      const stateToSave = {
        gridSize,
        cards,
        flipped,
        matched,
        matchedIndices,
        matchedPairs,
        attempts,
        correctMatches,
        isComplete,
        gameStarted,
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    }
  }, [
    cards,
    flipped,
    matched,
    matchedIndices,
    matchedPairs,
    attempts,
    correctMatches,
    isComplete,
    gameStarted,
    gridSize,
    storageKey,
  ]);

  useEffect(() => {
    if (vocabulary && vocabulary.length > 0 && !gameStarted && !savedState) {
      initializeGame();
    }
  }, [vocabulary, gridSize]);

  const handleFlip = (index) => {
    // Check if card is already matched by comparing the specific card's ID
    const cardIsMatched = matched.some(
      (matchedId) => cards[index].id === matchedId
    );

    if (flipped.length === 2 || flipped.includes(index) || cardIsMatched) {
      return;
    }

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setAttempts((prev) => prev + 1);

      const [first, second] = newFlipped.map((i) => cards[i]);

      if (first.id === second.id && first.lang !== second.lang) {
        setMatched((m) => [...m, first.id]);
        setMatchedIndices((m) => [...m, ...newFlipped]);
        setCorrectMatches((prev) => prev + 1);
        setShowSuccess(true);

        // Add to matched pairs for display
        const englishCard = first.lang === "en" ? first : second;
        const portugueseCard = first.lang === "pt" ? first : second;
        setMatchedPairs((prev) => [
          ...prev,
          { id: first.id, en: englishCard.text, pt: portugueseCard.text },
        ]);

        setTimeout(() => {
          // Only clear the flipped array, matched cards stay visible
          setFlipped([]);
          setShowSuccess(false);
        }, 800);

        if (matched.length + 1 === cards.length / 2) {
          setTimeout(() => {
            setIsComplete(true);
            if (onComplete) {
              const xpEarned = Math.max(50, 100 - attempts * 2);
              onComplete(xpEarned);
            }
          }, 1000);
        }
      } else {
        setShowError(true);
        setTimeout(() => {
          setFlipped([]);
          setShowError(false);
        }, 1200);
      }
    }
  };

  const handleRestart = () => {
    // Clear saved state when restarting
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    initializeGame();
  };

  const handleGridSizeChange = (size) => {
    setGridSize(size);
    setGameStarted(false);
  };

  if (!vocabulary || vocabulary.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600 dark:text-gray-400">
          No vocabulary available for this lesson.
        </p>
      </div>
    );
  }

  const gridCols =
    gridSize === "3x4" ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4";
  const cardSize =
    gridSize === "3x4"
      ? "h-16 w-24 sm:h-20 sm:w-28"
      : "h-16 w-20 sm:h-20 sm:w-24";

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <div className="text-center px-4">
        <h3 className="text-xl sm:text-2xl font-bold text-primary-900 dark:text-white mb-2">
          Memory Match Challenge
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Combine as palavras em inglês com suas traduções em português
        </p>
      </div>

      {/* {!gameStarted && ( */}
      <div className="flex gap-2 sm:gap-4 mb-4">
        <button
          onClick={() => handleGridSizeChange("3x4")}
          className={`px-3 sm:px-4 py-2 rounded-2xl font-medium text-sm sm:text-base transition-colors ${
            gridSize === "3x4"
              ? "bg-gradient-to-br from-primary-500 to-accent-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          3x4 (12 cards)
        </button>
        <button
          onClick={() => handleGridSizeChange("4x4")}
          className={`px-3 sm:px-4 py-2 rounded-2xl font-medium text-sm sm:text-base transition-colors ${
            gridSize === "4x4"
              ? "bg-gradient-to-br from-primary-500 to-accent-500 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          4x4 (16 cards)
        </button>
      </div>
      {/* )} */}

      {showSuccess && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
          <div className="bg-accent-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <Check className="w-6 h-6" />
            <span className="font-bold">Perfect Match!</span>
          </div>
        </div>
      )}

      {showError && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-pulse">
          <div className="bg-[#dc2626] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <X className="w-6 h-6" />
            <span className="font-bold">Try Again!</span>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">
        {/* Game Grid */}
        <div className={`grid ${gridCols} gap-2 sm:gap-3 px-2 sm:px-0 pt-4`}>
          {cards.map((card, i) => {
            const isFlipped = flipped.includes(i) || matchedIndices.includes(i);
            const isMatched = matchedIndices.includes(i);

            return (
              <button
                key={i}
                onClick={() => handleFlip(i)}
                disabled={isFlipped}
                className={`${cardSize} relative rounded-xl shadow-md font-medium text-sm transition-all duration-500 transform-gpu ${
                  isMatched
                    ? "scale-95 opacity-90"
                    : isFlipped
                      ? "preserve-3d rotate-y-180"
                      : "preserve-3d hover:scale-105"
                }`}
                style={{
                  transformStyle: isMatched ? "flat" : "preserve-3d",
                  transform: isMatched
                    ? "none"
                    : isFlipped
                      ? "rotateY(180deg)"
                      : "rotateY(0deg)",
                }}
              >
                {/* For matched cards, show the vocabulary directly without transform */}
                {isMatched ? (
                  <div
                    className={`absolute inset-0 flex items-center justify-center rounded-xl p-2 ${"bg-gradient-to-br from-accent-600 to-accent-800 text-white"}`}
                  >
                    <span className="text-center font-semibold text-xs sm:text-sm">
                      {card.text}
                    </span>
                    <Check className="absolute top-1 right-1 w-4 h-4" />
                  </div>
                ) : (
                  <>
                    {/* Front face - Target icon */}
                    <div
                      className="absolute inset-0 flex items-center justify-center rounded-xl backface-hidden bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-500 dark:to-primary-700 text-white"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <Target className="w-6 h-6 sm:w-8 sm:h-8 text-[#dc2626]" />
                    </div>
                    {/* Back face - Vocabulary */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center rounded-xl p-2 rotate-y-180 backface-hidden ${
                        card.lang === "en"
                          ? "bg-fieldtalk-400 text-primary-900"
                          : "bg-attention-400 text-primary-900"
                      }`}
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <span className="text-center font-semibold text-xs sm:text-sm">
                        {card.text}
                      </span>
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Matched Pairs Display */}
        {matchedPairs.length > 0 && (
          <div className="flex-shrink-0 w-full lg:w-auto">
            {/* <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 text-center lg:text-left">
              Pares Combinados
            </h4> */}
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto lg:mx-0">
              {/* English column */}
              <div className="space-y-2">
                <div className="text-xs text-center text-gray-500 dark:text-gray-400 font-semibold mb-1">
                  English
                </div>
                {matchedPairs.map((pair, idx) => (
                  <div
                    key={`en-${idx}`}
                    className="bg-fieldtalk-400 text-primary-900 px-3 py-2 rounded-lg text-center text-xs sm:text-sm font-semibold animate-slideIn shadow-md"
                    style={{
                      animationDelay: `${idx * 0.1}s`,
                    }}
                  >
                    {pair.en}
                  </div>
                ))}
              </div>
              {/* Portuguese column */}
              <div className="space-y-2">
                <div className="text-xs text-center text-gray-500 dark:text-gray-400 font-semibold mb-1">
                  Português
                </div>
                {matchedPairs.map((pair, idx) => (
                  <div
                    key={`pt-${idx}`}
                    className="bg-attention-400 text-primary-900 px-3 py-2 rounded-lg text-center text-xs sm:text-sm font-semibold animate-slideIn shadow-md"
                    style={{
                      animationDelay: `${idx * 0.1}s`,
                    }}
                  >
                    {pair.pt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isComplete ? (
        <div className="text-center space-y-4 animate-fadeIn">
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 text-white p-8 rounded-xl shadow-xl">
            <Trophy className="w-20 h-20 mx-auto mb-4 animate-bounce" />
            <h3 className="text-3xl font-bold mb-2">Congratulations!</h3>
            <p className="text-xl mb-4">
              You matched all pairs in {attempts} attempts!
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-3 bg-white text-accent-600 rounded-lg font-bold hover:bg-orange-50 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Play Again
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl">
          {/* Game Grid */}
        </div>
      )}

      <div className="flex gap-4 sm:gap-8 text-center">
        <div className="bg-gray-50 dark:bg-accent-900/20 px-3 sm:px-4 py-2 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Attempts
          </p>
          <p className="text-xl sm:text-2xl font-bold text-accent-600 dark:text-accent-400">
            {attempts}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-accent-900/20 px-3 sm:px-4 py-2 rounded-lg">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Matches
          </p>
          <p className="text-xl sm:text-2xl font-bold text-accent-600 dark:text-accent-400">
            {correctMatches}/{cards.length / 2}
          </p>
        </div>
      </div>

      {!isComplete && gameStarted && (
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 px-4 py-2 bg-primary-200 dark:bg-primary-700 text-primary-700 dark:text-primary-300 rounded-2xl hover:bg-primary-300 dark:hover:bg-primary-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Start Over
        </button>
      )}
    </div>
  );
}
