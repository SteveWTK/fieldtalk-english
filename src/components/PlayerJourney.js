// src/components/PlayerJourney.js
"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Calendar,
  Trophy,
  MessageSquare,
  Target,
  Globe,
} from "lucide-react";
import AnimatedProgressBar from "./AnimatedProgressBar";

// { playerId = 1 }
export default function PlayerJourney() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Mock journey data - would come from Supabase
  const journeySteps = [
    {
      date: "Week 1",
      title: "First Day Nerves",
      pillar: "survival",
      pillarName: "Survival English",
      story:
        "João arrived at the training ground feeling anxious. He could barely ask where the changing room was.",
      quote:
        "I was so nervous, I couldn't even say 'good morning' properly to my new teammates.",
      metrics: {
        survival: 15,
        precision: 5,
        fluency: 0,
        confidence: 2,
      },
      image: "/images/journey/week1-training-ground.png",
      achievement: null,
    },
    {
      date: "Week 4",
      title: "Breaking the Ice",
      pillar: "survival",
      pillarName: "Survival English",
      story:
        "After completing basic survival lessons, João started joining conversations during lunch breaks.",
      quote:
        "Today I made my first joke in English during lunch! Everyone laughed - in a good way!",
      metrics: {
        survival: 45,
        precision: 15,
        fluency: 5,
        confidence: 4,
      },
      image: "/images/week4-lunch.jpeg",
      achievement: "First Conversation Master",
    },
    {
      date: "Week 8",
      title: "Tactical Breakthrough",
      pillar: "precision",
      pillarName: "Precision English",
      story:
        "Coach's tactical instructions finally clicked. João started understanding complex formations and calls during matches.",
      quote:
        "When the coach said 'press high and squeeze the space', I knew exactly what he meant. Game changer!",
      metrics: {
        survival: 70,
        precision: 55,
        fluency: 15,
        confidence: 6,
      },
      image: "/images/week8-tactics.jpeg",
      achievement: "Tactical Understanding",
    },
    {
      date: "Week 16",
      title: "Match Day Hero",
      pillar: "precision",
      pillarName: "Precision English",
      story:
        "João scored the winning goal and confidently communicated with teammates throughout the match.",
      quote:
        "I was shouting instructions to my teammates, organizing the defense. I felt like a real leader out there!",
      metrics: {
        survival: 85,
        precision: 80,
        fluency: 25,
        confidence: 8,
      },
      image: "/images/week16-goal.webp",
      achievement: "Match Communication Expert",
    },
    {
      date: "Week 24",
      title: "Media Confidence",
      pillar: "fluency",
      pillarName: "Fluency English",
      story:
        "First post-match interview after scoring. João spoke confidently about the team's performance.",
      quote:
        "Speaking to Sky Sports felt natural. I could express my thoughts clearly and represent the club properly.",
      metrics: {
        survival: 95,
        precision: 88,
        fluency: 65,
        confidence: 9,
      },
      image: "/images/week24-interview.jpg",
      achievement: "Media Professional",
    },
    {
      date: "Week 32",
      title: "Team Leader",
      pillar: "fluency",
      pillarName: "Fluency English",
      story:
        "Appointed as vice-captain. João now mentors new international players joining the club.",
      quote:
        "Now I help other players with their English journey. It feels amazing to give back to the club that supported me.",
      metrics: {
        survival: 98,
        precision: 95,
        fluency: 85,
        confidence: 10,
      },
      image: "/images/week32-captain.jpg",
      achievement: "Leadership Excellence",
    },
  ];

  const currentData = journeySteps[currentStep];

  const pillarColors = {
    survival: "from-red-500 to-orange-500",
    precision: "from-blue-500 to-cyan-500",
    fluency: "from-green-500 to-emerald-500",
  };

  const pillarIcons = {
    survival: Globe,
    precision: Target,
    fluency: MessageSquare,
  };

  useEffect(() => {
    let interval;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % journeySteps.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, journeySteps.length]);

  const handlePrevious = () => {
    setCurrentStep((prev) => (prev === 0 ? journeySteps.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentStep((prev) => (prev + 1) % journeySteps.length);
  };

  const PillarIcon = pillarIcons[currentData.pillar];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            João&apos;s Journey at a Professional Club
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            From nervous newcomer to confident team leader in 32 weeks
          </p>
        </div>
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isAutoPlaying
              ? "bg-red-100 text-red-700 hover:bg-red-200"
              : "bg-green-100 text-green-700 hover:bg-green-200"
          }`}
        >
          <Play className="w-4 h-4" />
          <span>{isAutoPlaying ? "Pause" : "Auto Play"}</span>
        </button>
      </div>

      {/* Progress Timeline */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Progress Timeline
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Step {currentStep + 1} of {journeySteps.length}
          </span>
        </div>
        <div className="relative">
          <div className="flex justify-between">
            {journeySteps.map((step, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? `bg-gradient-to-r ${pillarColors[step.pillar]}`
                    : "bg-gray-300 dark:bg-gray-600"
                } ${index === currentStep ? "scale-125" : ""}`}
              />
            ))}
          </div>
          <div className="absolute top-2 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-600 -z-10">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-blue-500 to-green-500 transition-all duration-1000"
              style={{
                width: `${(currentStep / (journeySteps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Story Section */}
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div
              className={`w-12 h-12 bg-gradient-to-r ${pillarColors[currentData.pillar]} rounded-lg flex items-center justify-center`}
            >
              <PillarIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {currentData.date}
                </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {currentData.pillarName}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentData.title}
              </h3>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              {currentData.story}
            </p>
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400">
              &quot;{currentData.quote}&quot;
            </blockquote>
          </div>

          {currentData.achievement && (
            <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                Achievement Unlocked: {currentData.achievement}
              </span>
            </div>
          )}
        </div>

        {/* Metrics Section */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Language Progress Metrics
          </h4>

          <div className="space-y-6">
            <div>
              <AnimatedProgressBar
                value={currentData.metrics.survival}
                label="Survival English"
                color="from-red-500 to-orange-500"
                animationDelay={200}
              />
            </div>

            <div>
              <AnimatedProgressBar
                value={currentData.metrics.precision}
                label="Precision English"
                color="from-blue-500 to-cyan-500"
                animationDelay={400}
              />
            </div>

            <div>
              <AnimatedProgressBar
                value={currentData.metrics.fluency}
                label="Fluency English"
                color="from-green-500 to-emerald-500"
                animationDelay={600}
              />
            </div>

            <div>
              <AnimatedProgressBar
                value={currentData.metrics.confidence * 10}
                label="Confidence Level"
                color="from-purple-500 to-pink-500"
                animationDelay={800}
              />
            </div>
          </div>

          {/* Image placeholder */}
          <div className="mt-6 bg-gray-200 dark:bg-gray-700 rounded-lg h-48 flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400">
              📸 {currentData.title} Photo
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={handlePrevious}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real player journey showing measurable progress over time
          </p>
        </div>

        <button
          onClick={handleNext}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
