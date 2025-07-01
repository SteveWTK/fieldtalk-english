"use client";

import { useState, useEffect } from "react";

export default function AnimatedCounter({
  value,
  duration = 1000,
  prefix = "",
  suffix = "",
  className = "",
  animationDelay = 0,
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const end = parseInt(value);
      if (end === 0) {
        setCount(0);
        return;
      }

      const counter = setInterval(() => {
        start += Math.ceil(end / (duration / 50));
        if (start >= end) {
          setCount(end);
          clearInterval(counter);
        } else {
          setCount(start);
        }
      }, 50);

      return () => clearInterval(counter);
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [value, duration, animationDelay]);

  return (
    <span className={className}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}
