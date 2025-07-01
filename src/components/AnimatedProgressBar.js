// src/components/AnimatedProgressBar.js
"use client";

import { useState, useEffect } from "react";

export default function AnimatedProgressBar({
  value,
  maxValue = 100,
  label,
  color = "from-blue-500 to-green-500",
  showPercentage = true,
  animationDelay = 0,
}) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = (value / maxValue) * 100;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(percentage);
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [percentage, animationDelay]);

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-700 dark:text-gray-300">{label}</span>
          {showPercentage && (
            <span className="text-gray-900 dark:text-white font-medium">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`bg-gradient-to-r ${color} h-3 rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${animatedValue}%` }}
        >
          <div className="h-full bg-white bg-opacity-20 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
