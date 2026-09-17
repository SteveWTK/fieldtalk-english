// src\app\(landing)\clubs\page.js

"use client";

import React from "react";
import {
  // ChevronRight,
  Globe,
  Users,
  Target,
  BarChart3,
  // Trophy,
  Star,
  // Play,
  TrendingUp,
  Shield,
  Award,
  // MessageSquare,
  Clock,
  CheckCircle,
  Presentation,
} from "lucide-react";
import PlayerJourney from "@/components/PlayerJourney";
// import TestimonialCard from "@/components/TestimonialCard";
// import PhotoGallery from "@/components/PhotoGallery";
import Link from "next/link";

export default function EnhancedClubLandingPage() {
  return (
    <>
      {/* Hero Section with Professional Image */}
      <section className="py-20 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* <div className="flex items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    Trusted by Premier League Clubs
                  </span>
                </div>
              </div> */}
              <h1 className="text-4xl md:text-5xl font-bold text-primary-50 mb-6">
                Elite English Training for
                <span className="block bg-accent-400 bg-clip-text text-transparent">
                  Football Professionals
                </span>
              </h1>
              <p className="text-xl text-primary-300 mb-8">
                Custom-built English learning platform designed specifically for
                international football players. From matchday communication to
                media interviews - we help players excel on and off the pitch.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/presentation"
                  className="bg-accent-400 hover:bg-accent-300 text-primary-900 px-8 py-4 rounded-control font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
                >
                  View Full Presentation{" "}
                  <Presentation className="w-5 h-5 ml-2" />
                </Link>
                <button className="border-2 border-accent-400 text-accent-400 px-8 py-4 rounded-control font-semibold hover:bg-primary-800 transition-all duration-200">
                  Schedule Partnership Call
                </button>
              </div>
              <div className="mt-8 flex items-center space-x-6 text-sm text-primary-300">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-accent-400 mr-2" />
                  Highly experienced team
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-accent-400 mr-2" />
                  Proven ROI
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-accent-400 mr-2" />
                  Custom Club Integration
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="/images/hero/hero-clubs.jpg"
                alt="Professional football training with English communication focus"
                className="rounded-card shadow-2xl w-full"
                onError={(e) => {
                  e.target.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f3f4f6'/%3E%3Ctext x='300' y='180' text-anchor='middle' fill='%236b7280' font-size='18'%3EProfessional Training%3C/text%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%236b7280' font-size='18'%3ESession Integration%3C/text%3E%3Ctext x='300' y='230' text-anchor='middle' fill='%236b7280' font-size='14'%3EGlobal Player%3C/text%3E%3C/svg%3E";
                }}
              />
              {/* <div className="absolute -bottom-6 -left-6 text-gray-950 dark:text-white bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    200+ Players Trained
                  </span>
                </div>
              </div> */}
              <div className="absolute -top-6 -right-6 bg-accent-400 text-primary-900 rounded-card p-4 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">15%</div>
                  <div className="text-xs">Performance Boost</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Focus */}
      <section className="py-16 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary-50 mb-4">
              Built for Partnership, Not Just Sales
            </h2>
            <p className="text-lg text-primary-300 max-w-2xl mx-auto">
              We don&apos;t offer generic solutions. We research your club,
              understand your players&apos; needs, and create custom content
              that fits your specific requirements.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-card bg-primary-panel">
              <Target className="w-12 h-12 text-signal-english mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary-50 mb-2">
                Club-Specific Content
              </h3>
              <p className="text-primary-300">
                Custom lessons based on your playing style, tactics, and club
                culture
              </p>
            </div>
            <div className="text-center p-6 rounded-card bg-primary-panel">
              <Users className="w-12 h-12 text-accent-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary-50 mb-2">
                Player-Centered Approach
              </h3>
              <p className="text-primary-300">
                Adapted for each player&apos;s position, experience level, and
                learning style
              </p>
            </div>
            <div className="text-center p-6 rounded-card bg-primary-panel">
              <BarChart3 className="w-12 h-12 text-signal-mental mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary-50 mb-2">
                Real-Time Adaptation
              </h3>
              <p className="text-primary-300">
                Quick content updates based on your feedback and player progress
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section - Professional Focus */}
      <section id="features" className="py-20 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary-50 mb-6">
              The Three Pillars of Football English Success
            </h2>
            <p className="text-xl text-primary-300 max-w-3xl mx-auto">
              Our proven framework ensures complete player integration - from
              day one survival to elite-level fluency
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Survival Pillar */}
            <div className="group relative">
              <div className="bg-primary-panel rounded-card p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-signal-alert">
                <div className="w-16 h-16 bg-signal-alert rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary-50 mb-4">
                  1. Survival English
                </h3>
                <p className="text-primary-300 mb-6">
                  Essential daily communication for immediate integration into
                  UK life and football culture.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-alert rounded-full mr-3"></div>
                    First day at training essentials
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-alert rounded-full mr-3"></div>
                    Banking, housing & healthcare
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-alert rounded-full mr-3"></div>
                    Emergency situations & help-seeking
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-alert rounded-full mr-3"></div>
                    Shopping, restaurants & transportation
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-primary-700">
                  {/* <span className="text-sm font-medium text-red-600">
                    Target: First 30 days
                  </span> */}
                </div>
              </div>
            </div>

            {/* Precision Pillar */}
            <div className="group relative">
              <div className="bg-primary-panel rounded-card p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-signal-english">
                <div className="w-16 h-16 bg-signal-english rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary-50 mb-4">
                  2. Precision English
                </h3>
                <p className="text-primary-300 mb-6">
                  Technical football language for professional performance and
                  tactical understanding.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-english rounded-full mr-3"></div>
                    Tactical instructions & formations
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-english rounded-full mr-3"></div>
                    Match communication & calls
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-english rounded-full mr-3"></div>
                    Training drills & feedback
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-english rounded-full mr-3"></div>
                    Injury reporting & medical terms
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-primary-700">
                  {/* <span className="text-sm font-medium text-blue-600">
                    Target: First 3 months
                  </span> */}
                </div>
              </div>
            </div>

            {/* Fluency Pillar */}
            <div className="group relative">
              <div className="bg-primary-panel rounded-card p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-accent-400">
                <div className="w-16 h-16 bg-accent-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Star className="w-8 h-8 text-primary-900" />
                </div>
                <h3 className="text-2xl font-bold text-primary-50 mb-4">
                  3. Fluency English
                </h3>
                <p className="text-primary-300 mb-6">
                  Advanced communication for leadership, media, and long-term
                  career success.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-accent-400 rounded-full mr-3"></div>
                    Press interviews & media training
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-accent-400 rounded-full mr-3"></div>
                    Team leadership & motivation
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-accent-400 rounded-full mr-3"></div>
                    Contract negotiations & meetings
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-accent-400 rounded-full mr-3"></div>
                    Community engagement & charity work
                  </li>
                </ul>
                <div className="mt-6 pt-6 border-t border-primary-700">
                  {/* <span className="text-sm font-medium text-green-600">
                    Target: 6+ months
                  </span> */}
                </div>
              </div>
            </div>
          </div>

          {/* ROI Benefits for Clubs */}
          <div className="bg-primary-panel rounded-card p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-primary-50 mb-4">
                Proven ROI for Professional Clubs
              </h3>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-accent-400 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-primary-900" />
                </div>
                <h4 className="font-semibold text-primary-50 mb-2">
                  15% Performance Boost
                </h4>
                <p className="text-sm text-primary-300">
                  Measured improvement in match communication effectiveness
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-signal-english rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-primary-50 mb-2">
                  60% Faster Integration
                </h4>
                <p className="text-sm text-primary-300">
                  New signings adapt to team communication protocols
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-signal-mental rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-primary-50 mb-2">
                  Reduced Risk
                </h4>
                <p className="text-sm text-primary-300">
                  Better communication prevents costly tactical
                  misunderstandings
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-signal-performance rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-primary-50 mb-2">
                  Higher Transfer Values
                </h4>
                <p className="text-sm text-primary-300">
                  English-fluent players command premium market prices
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Gallery - Club Context */}
      {/* <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              FieldTalk English in Action
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              See how professional clubs integrate English training into their
              development programs
            </p>
          </div>
          <PhotoGallery clubContext={true} />
        </div>
      </section> */}

      {/* Testimonials - Club Officials & Players */}
      {/* <section className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Trusted by Professional Football
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Hear from club executives, coaches, and players who&apos;ve
              experienced the FieldTalk difference
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              name="James Mitchell"
              role="Head of Player Development, Championship Club"
              image="/images/testimonials/james-mitchell.jpg"
              quote="FieldTalk English transformed how our international signings integrate. What used to take 6 months now happens in 6 weeks. The ROI is undeniable."
              rating={5}
            />

            <TestimonialCard
              name="Carlos Rodríguez"
              role="Spanish Midfielder, Premier League"
              image="/images/testimonials/carlos-rodriguez.jpg"
              quote="Before FieldTalk, I was nervous in team meetings. Now I can express tactical ideas clearly and even help newer players. It changed my career."
              rating={5}
            />

            <TestimonialCard
              name="David Thompson"
              role="Academy Director, League One Club"
              image="/images/testimonials/david-thompson.jpg"
              quote="We've used FieldTalk for 18 months with our international youth players. Communication on pitch improved dramatically. It's become essential to our academy."
              rating={5}
            />
          </div>

          <div className="mt-12 bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <blockquote className="text-xl italic text-gray-700 dark:text-gray-300 mb-6">
                &quot;FieldTalk English isn&apos;t just language training -
                it&apos;s competitive advantage. In modern football,
                communication clarity can be the difference between winning and
                losing crucial matches.&quot;
              </blockquote>
              <div className="flex items-center justify-center space-x-4">
                <img
                  src="/images/testimonials/sarah-collins.jpg"
                  alt="Sarah Collins"
                  className="w-12 h-12 rounded-full"
                  onError={(e) => {
                    e.target.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23e5e7eb'/%3E%3Ctext x='24' y='28' text-anchor='middle' fill='%236b7280' font-size='12'%3ESC%3C/text%3E%3C/svg%3E";
                  }}
                />
                <div className="text-left">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    Sarah Collins
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Technical Director, Premier League Club
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Player Journey Section */}
      <section className="py-20 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary-50 mb-6">
              Sample Player Success Stories
            </h2>
            <p className="text-xl text-primary-300 max-w-3xl mx-auto">
              See how our three-pillar system can transform international
              players from nervous newcomers to confident team leaders
            </p>
          </div>

          <PlayerJourney />

          <div className="text-center mt-12">
            <p className="text-lg text-primary-300 mb-6">
              This is just one example. Every player&apos;s journey is unique,
              and we customize the experience for each individual and club.
            </p>
            <button className="bg-accent-400 hover:bg-accent-300 text-primary-900 px-8 py-4 rounded-control font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
              Schedule Player Assessment
            </button>
          </div>
        </div>
      </section>

      {/* Partnership Plans */}
      <section id="partnership" className="py-16 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary-50 mb-4">
              Partnership Investment Options
            </h2>
            <p className="text-lg text-primary-300">
              Flexible partnership models designed for different club sizes and
              ambitions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Academy Plan */}
            <div className="bg-primary-panel rounded-card p-8 shadow-lg border border-primary-700">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-primary-50 mb-2">
                  Academy Focus
                </h3>
                <div className="text-3xl font-bold text-primary-50 mb-1">
                  £x,xxx
                </div>
                <div className="text-sm text-primary-300">
                  per month
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Up to 20 academy players
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Custom club content integration
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Monthly progress reports
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Coach training workshops
                  </span>
                </li>
              </ul>
              <button className="w-full bg-primary-800 text-primary-50 py-3 rounded-control font-semibold hover:bg-primary-700 transition-colors">
                Start Academy Program
              </button>
            </div>

            {/* Professional Plan */}
            <div className="bg-primary-panel rounded-card p-8 shadow-xl border-2 border-accent-400 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-accent-400 text-primary-900 px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-primary-50 mb-2">
                  First Team
                </h3>
                <div className="text-3xl font-bold text-primary-50 mb-1">
                  £x,xxx
                </div>
                <div className="text-sm text-primary-300">
                  per month
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Full squad access (35 players)
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Individual player assessments
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Match-day communication training
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Press conference preparation
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Dedicated account manager
                  </span>
                </li>
              </ul>
              <button className="w-full bg-accent-400 hover:bg-accent-300 text-primary-900 py-3 rounded-control font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                Choose First Team
              </button>
            </div>

            {/* Elite Plan */}
            <div className="bg-primary-panel rounded-card p-8 shadow-lg border border-primary-700">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-primary-50 mb-2">
                  Elite Partnership
                </h3>
                <div className="text-3xl font-bold text-primary-50 mb-1">
                  Custom
                </div>
                <div className="text-sm text-primary-300">
                  contact us
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Unlimited player access
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    On-site training integration
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Custom content development
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    24/7 priority support
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-accent-400 mr-3" />
                  <span className="text-primary-100">
                    Revenue sharing opportunities
                  </span>
                </li>
              </ul>
              <button className="w-full bg-primary-800 text-primary-50 py-3 rounded-control font-semibold hover:bg-primary-700 transition-colors">
                Discuss Partnership
              </button>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-primary-300">
              💼 All plans include setup, training, and ongoing support | 📊 ROI
              tracking and reporting | 🔒 Data security compliance
            </p>
          </div>
        </div>
      </section>

      {/* Demo Preview */}
      <section id="demo" className="py-16 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary-50 mb-4">
              Experience the Platform
            </h2>
            <p className="text-lg text-primary-300">
              Interactive demo showing how players learn and clubs track
              progress
            </p>
          </div>
          <div className="bg-primary-panel rounded-card p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="bg-primary-800 rounded-xl shadow-lg p-6 mb-6">
                <h3 className="text-xl font-semibold text-primary-50 mb-4">
                  Sample Lesson: &quot;First Day at Training&quot;
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-primary-panel rounded-control">
                    <span className="text-primary-100">
                      🎯 Club-specific vocabulary
                    </span>
                    <span className="text-accent-400 font-medium">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary-panel rounded-control">
                    <span className="text-primary-100">
                      🗣️ Tactical communication
                    </span>
                    <span className="text-signal-english font-medium">
                      In Progress
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary-panel rounded-control">
                    <span className="text-primary-100">
                      ⚽ Match simulation
                    </span>
                    <span className="text-primary-500">Locked</span>
                  </div>
                </div>
              </div>
              <button className="bg-accent-400 hover:bg-accent-300 text-primary-900 px-6 py-3 rounded-control font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                Try Interactive Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section
        id="contact"
        className="py-20 bg-primary-900"
      >
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-50 mb-6">
            Ready to Transform Your Players&apos; English Skills?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Let&apos;s discuss how we can create a custom English learning
            solution for your club
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-accent-400 hover:bg-accent-300 text-primary-900 px-8 py-4 rounded-control font-semibold transition-colors">
              Schedule Partnership Meeting
            </button>
            <button className="border-2 border-primary-500 text-primary-50 px-8 py-4 rounded-control font-semibold hover:bg-primary-800 transition-colors">
              Download Demo Materials
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-900 text-primary-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-accent-400 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary-900" />
              </div>
              <span className="text-xl font-bold">Global Player</span>
            </div>
            <p className="text-primary-300 mb-4">
              Elite English training for football professionals
            </p>
            <p className="text-sm text-primary-400">
              © 2025 Global Player. Built for partnership with football
              clubs worldwide.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
