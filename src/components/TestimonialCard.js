// src/components/TestimonialCard.js
import React from "react";
import { Star } from "lucide-react";

const TestimonialCard = ({ name, role, image, quote, rating = 5 }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Rating Stars */}
      <div className="flex items-center mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-gray-700 dark:text-gray-300 mb-6 italic">
        &quot;{quote}&quot;
      </blockquote>

      {/* Author Info */}
      <div className="flex items-center">
        <img
          src={image}
          alt={name}
          className="w-12 h-12 rounded-full mr-4"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const initials = name
              .split(" ")
              .map((n) => n[0])
              .join("");
            e.target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23e5e7eb'/%3E%3Ctext x='24' y='28' text-anchor='middle' fill='%236b7280' font-size='12'%3E${initials}%3C/text%3E%3C/svg%3E`;
          }}
        />
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {name}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{role}</div>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
