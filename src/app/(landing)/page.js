// src/app/(landing)/page.js
"use client";

import React from "react";
import {
  ChevronRight,
  Globe,
  Users,
  Target,
  BarChart3,
  Trophy,
  Star,
  Play,
} from "lucide-react";

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Elite English Training for
              <span className="block bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
                Football Professionals
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Custom-built English learning platform designed specifically for
              international football players. From matchday communication to
              media interviews - we help players excel on and off the pitch.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-8 py-4 rounded-full font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center">
                See Demo <Play className="w-5 h-5 ml-2" />
              </button>
              <button className="border-2 border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 px-8 py-4 rounded-full font-semibold hover:bg-blue-50 dark:hover:bg-gray-800 transition-all duration-200">
                Schedule Partnership Call
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Focus */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Built for Partnership, Not Just Sales
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              We don&apos;t offer generic solutions. We research your club,
              understand your players&apos; needs, and create custom content
              that fits your specific requirements.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl bg-blue-50 dark:bg-gray-800">
              <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Club-Specific Content
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Custom lessons based on your playing style, tactics, and club
                culture
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-green-50 dark:bg-gray-800">
              <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Player-Centered Approach
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Adapted for each player&apos;s position, experience level, and
                learning style
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-purple-50 dark:bg-gray-800">
              <BarChart3 className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Real-Time Adaptation
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Quick content updates based on your feedback and player progress
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              The Three Pillars of Football English Success
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Our proven framework ensures complete player integration - from
              day one survival to elite-level fluency
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Survival Pillar */}
            <div className="group relative">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-red-500">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  1. Survival English
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Essential daily communication for immediate integration into
                  UK life and football culture.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    First day at training essentials
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    Banking, housing & healthcare
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    Emergency situations & help-seeking
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    Shopping, restaurants & transportation
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-red-600">
                    Target: First 30 days
                  </span>
                </div>
              </div>
            </div>

            {/* Precision Pillar */}
            <div className="group relative">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-blue-500">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  2. Precision English
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Technical football language for professional performance and
                  tactical understanding.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Tactical instructions & formations
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Match communication & calls
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Training drills & feedback
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Injury reporting & medical terms
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-blue-600">
                    Target: First 3 months
                  </span>
                </div>
              </div>
            </div>

            {/* Fluency Pillar */}
            <div className="group relative">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-green-500">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  3. Fluency English
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Advanced communication for leadership, media, and long-term
                  career success.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Press interviews & media training
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Team leadership & motivation
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Contract negotiations & meetings
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Community engagement & charity work
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-green-600">
                    Target: 6+ months
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar Benefits */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Why the Three-Pillar System Works
              </h3>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Progressive Learning
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Builds confidence step-by-step, ensuring solid foundations
                  before advancing
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Measurable Progress
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Clear milestones allow clubs to track ROI and player
                  development
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <ChevronRight className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Real-World Application
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Every lesson connects directly to situations players face
                  daily
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section id="demo" className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Experience the Platform
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Interactive demo showing how players learn and clubs track
              progress
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Sample Lesson: &quot;First Day at Training&quot;
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">
                      🎯 Learn key phrases
                    </span>
                    <span className="text-green-600 font-medium">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">
                      🗣️ Practice pronunciation
                    </span>
                    <span className="text-blue-600 font-medium">
                      In Progress
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">
                      ⚽ Situational practice
                    </span>
                    <span className="text-gray-400">Locked</span>
                  </div>
                </div>
              </div>
              <button className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                Try Interactive Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section
        id="contact"
        className="py-20 bg-gradient-to-r from-blue-600 to-green-500"
      >
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Players&apos; English Skills?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Let&apos;s discuss how we can create a custom English learning
            solution for your club
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Schedule Partnership Meeting
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">
              Download Demo Materials
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">FieldTalk English</span>
            </div>
            <p className="text-gray-400 mb-4">
              Elite English training for football professionals
            </p>
            <p className="text-sm text-gray-500">
              © 2025 FieldTalk English. Built for partnership with football
              clubs worldwide.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
