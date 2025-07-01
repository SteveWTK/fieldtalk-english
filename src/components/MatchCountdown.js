// src/components/MatchCountdown.js
"use client";

import { useState, useEffect } from "react";
import { Clock, Users } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

export default function MatchCountdown({
  opponent = "Brighton",
  matchDate = "2025-01-15T15:00:00",
  competition = "Premier League",
}) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(matchDate) - +new Date();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [matchDate]);

  return (
    <div className="bg-gradient-to-br from-blue-600 to-green-600 text-white p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">Next Match</h3>
          <p className="text-blue-100 text-sm">{competition}</p>
        </div>
        <Clock className="w-6 h-6 text-blue-200" />
      </div>

      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-xl font-bold">vs {opponent}</span>
        </div>
        <p className="text-blue-100 text-sm">
          {new Date(matchDate).toLocaleDateString("en-GB", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-white/20 rounded-lg p-2">
          <div className="text-2xl font-bold">
            <AnimatedCounter value={timeLeft.days} duration={500} />
          </div>
          <div className="text-xs text-blue-200">Days</div>
        </div>
        <div className="bg-white/20 rounded-lg p-2">
          <div className="text-2xl font-bold">
            <AnimatedCounter value={timeLeft.hours} duration={500} />
          </div>
          <div className="text-xs text-blue-200">Hours</div>
        </div>
        <div className="bg-white/20 rounded-lg p-2">
          <div className="text-2xl font-bold">
            <AnimatedCounter value={timeLeft.minutes} duration={500} />
          </div>
          <div className="text-xs text-blue-200">Minutes</div>
        </div>
        <div className="bg-white/20 rounded-lg p-2">
          <div className="text-2xl font-bold">
            <AnimatedCounter value={timeLeft.seconds} duration={200} />
          </div>
          <div className="text-xs text-blue-200">Seconds</div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors text-sm font-medium">
          📢 Practice Match Phrases
        </button>
      </div>
    </div>
  );
}
