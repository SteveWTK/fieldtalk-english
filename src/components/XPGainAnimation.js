"use client";

import { useState, useEffect } from "react";
import { Trophy, Star } from "lucide-react";

export default function XPGainAnimation({ xp, show, onComplete }) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState("enter");

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setAnimationPhase("enter");

      const timer1 = setTimeout(() => setAnimationPhase("celebrate"), 200);
      const timer2 = setTimeout(() => setAnimationPhase("exit"), 2000);
      const timer3 = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 2500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [show, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div
        className={`transform transition-all duration-300 ${
          animationPhase === "enter"
            ? "scale-0 opacity-0"
            : animationPhase === "celebrate"
              ? "scale-110 opacity-100"
              : "scale-75 opacity-0"
        }`}
      >
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-4 rounded-full shadow-2xl flex items-center space-x-3">
          <Trophy className="w-8 h-8 animate-bounce" />
          <div className="text-center">
            <div className="text-2xl font-bold">+{xp} XP</div>
            <div className="text-sm opacity-90">Experience Gained!</div>
          </div>
          <Star className="w-8 h-8 animate-spin" />
        </div>
      </div>

      {/* Confetti effect */}
      {animationPhase === "celebrate" && (
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-yellow-400 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 1000}ms`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
