"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Target,
  Star,
  Users,
  Trophy,
  TrendingUp,
  //   BarChart3,
  //   Play,
  //   Calendar,
  //   MessageSquare,
  CheckCircle,
  //   ArrowRight,
  Menu,
} from "lucide-react";

export default function FieldTalkPresentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSlideMenu, setShowSlideMenu] = useState(false);

  const slides = [
    {
      id: "title",
      title: "FieldTalk English",
      subtitle: "Elite Language Training for Football Professionals",
      content: "Partnership Opportunity Presentation",
      footer: "The WTK Team • 2025",
    },
    {
      id: "challenge",
      title: "The Challenge",
      subtitle: "Why International Players Struggle with English Integration",
      bullets: [
        "70% of Premier League players are international",
        "Average adaptation time: 6-12 months for basic communication",
        "Lost opportunities due to miscommunication in crucial moments",
        "Poor media presence affects club reputation",
        "Language barriers impact team chemistry and performance",
      ],
    },
    {
      id: "pillars",
      title: "The Three-Pillar Solution",
      subtitle: "Survival → Precision → Fluency",
      pillars: [
        {
          title: "Survival English",
          subtitle: "Days 1-30",
          description:
            "Essential daily communication for immediate integration",
          items: [
            "Banking & housing basics",
            "Emergency situations",
            "Training ground essentials",
            "UK life navigation",
          ],
          color: "from-red-500 to-orange-500",
          icon: Globe,
        },
        {
          title: "Precision English",
          subtitle: "Months 1-3",
          description:
            "Technical football language for professional performance",
          items: [
            "Tactical instructions",
            "Match communication",
            "Training feedback",
            "Injury reporting",
          ],
          color: "from-blue-500 to-cyan-500",
          icon: Target,
        },
        {
          title: "Fluency English",
          subtitle: "Months 3+",
          description: "Advanced communication for leadership and media",
          items: [
            "Press interviews",
            "Team leadership",
            "Contract negotiations",
            "Community engagement",
          ],
          color: "from-green-500 to-emerald-500",
          icon: Star,
        },
      ],
    },
    {
      id: "team",
      title: "The WTK Team",
      subtitle: "Four Decades of Language Education Excellence",
      team: [
        {
          name: "Dr Michael Watkins",
          role: "Academic Consultant",
          experience: "50+ years in language education",
          expertise:
            "Curriculum development, pedagogical frameworks, academic oversight",
          highlight:
            "Former university lecturer, educational psychology specialist",
        },
        {
          name: "Stephen Watkins",
          role: "Technical Director",
          experience: "30+ years in education",
          expertise:
            "Full-stack development, learning management systems, AI integration",
          highlight: "Built Neptune's Tribe eco-English platform from scratch",
        },
        {
          name: "Paul Watkins",
          role: "Corporate Sales Director",
          experience: "30+ years in language instruction",
          expertise:
            "B2B partnerships, client relationship management, sports industry knowledge",
          highlight: "Direct experience teaching Premier League footballers",
        },
        {
          name: "David Watkins",
          role: "Communications Director",
          experience: "30+ years in language instruction",
          expertise:
            "Content creation, cultural adaptation, multilingual communication",
          highlight: "Specialist in cross-cultural communication for athletes",
        },
      ],
    },
    {
      id: "advantage",
      title: "The Watford Advantage",
      subtitle: "Custom Partnership, Not Generic Product",
      advantages: [
        {
          title: "Deep Research",
          description:
            "We study your tactical system, club culture, and local area to create Watford-specific content",
          icon: Target,
        },
        {
          title: "Custom Content Creation",
          description:
            "Position-specific modules, club terminology, and integration with your match schedule",
          icon: Users,
        },
        {
          title: "Real-Time Adaptation",
          description:
            "Quick content updates based on your feedback and player progress data",
          icon: TrendingUp,
        },
        {
          title: "Proven Experience",
          description:
            "Extensive experience teaching Premier League players gives us unique insight into footballer needs",
          icon: Trophy,
        },
      ],
    },
    {
      id: "technology",
      title: "Technology That Engages",
      subtitle: "FIFA Career Mode for Language Learning",
      features: [
        "Gamified progression system with XP and levels",
        "Interactive scenarios with real football situations",
        "Audio pronunciation with crowd noise for realistic conditions",
        "Progress tracking like player development in football games",
        "Mobile-first design for use during training and travel",
      ],
      tech: [
        "Built with Next.js and TypeScript for scalability",
        "Real-time progress tracking with Supabase",
        "Responsive design for all devices",
        "Advanced analytics and reporting",
      ],
    },
    {
      id: "journey",
      title: "Real Player Success Story",
      subtitle: "João's 32-Week Transformation",
      milestones: [
        {
          week: "Week 1",
          title: "First Day Nerves",
          progress: "15%",
          description: "Couldn't ask for directions to changing room",
        },
        {
          week: "Week 4",
          title: "Breaking the Ice",
          progress: "45%",
          description: "First successful joke during lunch break",
        },
        {
          week: "Week 8",
          title: "Tactical Breakthrough",
          progress: "55%",
          description: "Understanding complex formations and calls",
        },
        {
          week: "Week 16",
          title: "Match Day Hero",
          progress: "80%",
          description: "Organizing defense, scoring winning goal",
        },
        {
          week: "Week 24",
          title: "Media Confidence",
          progress: "90%",
          description: "First post-match Sky Sports interview",
        },
        {
          week: "Week 32",
          title: "Team Leader",
          progress: "95%",
          description: "Appointed vice-captain, mentoring new players",
        },
      ],
    },
    {
      id: "roi",
      title: "Measurable Return on Investment",
      subtitle: "From Cost Center to Competitive Advantage",
      metrics: [
        {
          label: "Player Integration Time",
          before: "6-12 months",
          after: "4-8 weeks",
          improvement: "70% faster",
        },
        {
          label: "Match Communication Errors",
          before: "15-20 per game",
          after: "2-5 per game",
          improvement: "75% reduction",
        },
        {
          label: "Media Confidence Score",
          before: "3/10",
          after: "8/10",
          improvement: "167% increase",
        },
        {
          label: "Team Chemistry Rating",
          before: "6/10",
          after: "9/10",
          improvement: "50% improvement",
        },
      ],
      benefits: [
        "Faster player integration = better performance sooner",
        "Reduced miscommunication = fewer tactical errors",
        "Professional media presence = positive club image",
        "Player satisfaction = retention and attraction",
      ],
    },
    {
      id: "implementation",
      title: "Implementation Timeline",
      subtitle: "Getting Started with Watford FC",
      phases: [
        {
          phase: "Phase 1",
          duration: "Weeks 1-2",
          title: "Setup & Customization",
          tasks: [
            "Player assessments and goal setting",
            "Custom Watford content creation",
            "Platform setup and training",
          ],
        },
        {
          phase: "Phase 2",
          duration: "Weeks 3-4",
          title: "Pilot Program",
          tasks: [
            "Start with 3-5 players needing most support",
            "Daily feedback and rapid iteration",
            "Measure initial progress",
          ],
        },
        {
          phase: "Phase 3",
          duration: "Month 2+",
          title: "Full Rollout",
          tasks: [
            "Expand to full squad",
            "Integration with match preparation",
            "Advanced features and analytics",
          ],
        },
      ],
    },
    {
      id: "next-steps",
      title: "Ready to Transform Your Players' English Skills?",
      subtitle: "Let's Create Success Together",
      cta: [
        "Schedule a 30-minute partnership discussion",
        "See live demo of the FieldTalk platform",
        "Discuss custom Watford content development",
        "Plan pilot program with priority players",
      ],
      contact: "Contact: paul@fieldtalkenglish.com",
      guarantee: "Money-back guarantee on player engagement metrics",
    },
  ];

  const currentSlideData = slides[currentSlide];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setShowSlideMenu(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setShowSlideMenu(false);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setShowSlideMenu(false);
  };

  const renderSlideContent = () => {
    switch (currentSlideData.id) {
      case "title":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="mb-8">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                {/* <Globe className="w-8 h-8 md:w-12 md:h-12 text-white" /> */}
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent mb-4">
                {currentSlideData.title}
              </h1>
              <h2 className="text-lg md:text-2xl lg:text-3xl text-gray-600 dark:text-gray-300 mb-6">
                {currentSlideData.subtitle}
              </h2>
              <p className="text-base md:text-lg lg:text-xl text-gray-500 dark:text-gray-400">
                {currentSlideData.content}
              </p>
            </div>
          </div>
        );

      case "challenge":
        return (
          <div className="h-full flex flex-col justify-center px-4 py-8">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
              {currentSlideData.title}
            </h1>
            <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 md:mb-12">
              {currentSlideData.subtitle}
            </h2>
            <div className="space-y-4 md:space-y-6">
              {currentSlideData.bullets.map((bullet, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 md:space-x-4"
                >
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white font-bold text-xs md:text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-sm md:text-lg lg:text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                    {bullet}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );

      case "pillars":
        return (
          <div className="h-full flex flex-col px-4 py-8">
            <div className="text-center mb-8 md:mb-12">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
                {currentSlideData.title}
              </h1>
              <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300">
                {currentSlideData.subtitle}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 flex-grow">
              {currentSlideData.pillars.map((pillar, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg border-t-4 border-transparent"
                  style={{
                    borderTopColor: `rgb(${pillar.color.includes("red") ? "239 68 68" : pillar.color.includes("blue") ? "59 130 246" : "34 197 94"})`,
                  }}
                >
                  <div
                    className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r ${pillar.color} rounded-xl flex items-center justify-center mb-4 md:mb-6`}
                  >
                    <pillar.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-sm md:text-base lg:text-lg font-medium text-gray-600 dark:text-gray-300 mb-3 md:mb-4">
                    {pillar.subtitle}
                  </p>
                  <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 mb-3 md:mb-4">
                    {pillar.description}
                  </p>
                  <ul className="space-y-1 md:space-y-2">
                    {pillar.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center text-xs md:text-sm text-gray-600 dark:text-gray-400"
                      >
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full mr-2 md:mr-3"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );

      case "team":
        return (
          <div className="h-full flex flex-col px-4 py-8">
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
                {currentSlideData.title}
              </h1>
              <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300">
                {currentSlideData.subtitle}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 flex-grow">
              {currentSlideData.team.map((member, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg"
                >
                  <div className="flex items-start space-x-3 md:space-x-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm md:text-lg">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                        {member.name}
                      </h3>
                      <p className="text-blue-600 font-medium mb-2 text-sm md:text-base">
                        {member.role}
                      </p>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {member.experience}
                      </p>
                      <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 mb-3">
                        {member.expertise}
                      </p>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 md:p-3 rounded-lg">
                        <p className="text-xs md:text-sm font-medium text-blue-800 dark:text-blue-200">
                          {member.highlight}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "advantage":
        return (
          <div className="h-full flex flex-col justify-center px-4 py-8">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
              {currentSlideData.title}
            </h1>
            <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 md:mb-12">
              {currentSlideData.subtitle}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              {currentSlideData.advantages.map((advantage, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 md:space-x-4"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <advantage.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {advantage.title}
                    </h3>
                    <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
                      {advantage.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "technology":
        return (
          <div className="h-full flex flex-col px-4 py-8">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
              {currentSlideData.title}
            </h1>
            <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-6 md:mb-8">
              {currentSlideData.subtitle}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 flex-grow">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
                  Player Experience
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {currentSlideData.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-2 md:space-x-3"
                    >
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
                  Technical Foundation
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {currentSlideData.tech.map((tech, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-2 md:space-x-3"
                    >
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
                        {tech}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "journey":
        return (
          <div className="h-full flex flex-col px-4 py-8">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
              {currentSlideData.title}
            </h1>
            <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-6 md:mb-8">
              {currentSlideData.subtitle}
            </h2>
            <div className="flex-grow overflow-y-auto">
              <div className="relative">
                <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 via-blue-500 to-green-500"></div>
                <div className="space-y-4 md:space-y-6">
                  {currentSlideData.milestones.map((milestone, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-4 md:space-x-6"
                    >
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center flex-shrink-0 relative z-10">
                        <span className="text-white font-bold text-xs md:text-sm">
                          {milestone.progress}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4 flex-grow shadow-md">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                            {milestone.title}
                          </h3>
                          <span className="text-sm font-medium text-blue-600">
                            {milestone.week}
                          </span>
                        </div>
                        <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "roi":
        return (
          <div className="h-full flex flex-col px-4 py-8">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
              {currentSlideData.title}
            </h1>
            <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-6 md:mb-8">
              {currentSlideData.subtitle}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 flex-grow">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
                  Performance Metrics
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {currentSlideData.metrics.map((metric, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 rounded-lg p-3 md:p-4 shadow-md"
                    >
                      <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm md:text-base">
                        {metric.label}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs md:text-sm">
                        <div>
                          <span className="text-red-600">Before:</span>{" "}
                          {metric.before}
                        </div>
                        <div>
                          <span className="text-green-600">After:</span>{" "}
                          {metric.after}
                        </div>
                        <div>
                          <span className="text-blue-600 font-bold">
                            {metric.improvement}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
                  Club Benefits
                </h3>
                <div className="space-y-3 md:space-y-4">
                  {currentSlideData.benefits.map((benefit, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-2 md:space-x-3"
                    >
                      <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500 flex-shrink-0 mt-1" />
                      <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
                        {benefit}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case "implementation":
        return (
          <div className="h-full flex flex-col px-4 py-8">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
              {currentSlideData.title}
            </h1>
            <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 md:mb-12">
              {currentSlideData.subtitle}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 flex-grow">
              {currentSlideData.phases.map((phase, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg"
                >
                  <div className="text-center mb-4 md:mb-6">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                      <span className="text-white font-bold text-lg md:text-xl">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                      {phase.phase}
                    </h3>
                    <p className="text-xs md:text-sm text-blue-600 font-medium">
                      {phase.duration}
                    </p>
                  </div>
                  <h4 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-3 md:mb-4">
                    {phase.title}
                  </h4>
                  <ul className="space-y-2">
                    {phase.tasks.map((task, taskIndex) => (
                      <li
                        key={taskIndex}
                        className="flex items-start space-x-2"
                      >
                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">
                          {task}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );

      case "next-steps":
        return (
          <div className="h-full flex flex-col justify-center items-center text-center px-4 py-8">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
              {currentSlideData.title}
            </h1>
            <h2 className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-8 md:mb-12">
              {currentSlideData.subtitle}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12 max-w-4xl w-full">
              {currentSlideData.cta.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 md:space-x-4 bg-blue-50 dark:bg-blue-900/20 p-3 md:p-4 rounded-lg"
                >
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs md:text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3 md:space-y-4">
              <p className="text-lg md:text-xl font-bold text-blue-600">
                {currentSlideData.contact}
              </p>
              <p className="text-base md:text-lg text-green-600 font-medium">
                {currentSlideData.guarantee}
              </p>
            </div>

            <div className="mt-6 md:mt-8">
              <button className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 md:px-12 py-3 md:py-4 rounded-lg text-lg md:text-xl font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                Schedule Partnership Call
              </button>
            </div>
          </div>
        );

      default:
        return <div>Slide content</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile Slide Menu */}
      {showSlideMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="bg-white dark:bg-gray-800 w-64 h-full p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white">
                Slides
              </h3>
              <button
                onClick={() => setShowSlideMenu(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-full text-left p-2 rounded text-sm ${
                    index === currentSlide
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {index + 1}. {slide.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Slide Container */}
      <div className="min-h-screen p-2 md:p-4 lg:p-8">
        <div className="h-full min-h-[calc(100vh-1rem)] md:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 rounded-lg md:rounded-2xl shadow-xl md:shadow-2xl p-4 md:p-8 lg:p-12 relative overflow-hidden">
          {/* Mobile Header */}
          <div className="md:hidden flex justify-between items-center mb-4">
            <button
              onClick={() => setShowSlideMenu(true)}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300"
            >
              <Menu className="w-5 h-5" />
              <span className="text-sm">Slides</span>
            </button>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {currentSlide + 1} / {slides.length}
            </div>
          </div>

          {/* Slide Content */}
          <div className="h-full pb-16 md:pb-20">{renderSlideContent()}</div>

          {/* Footer */}
          <div className="absolute bottom-3 md:bottom-6 left-4 md:left-12 right-4 md:right-12 flex justify-between items-center">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
                <Globe className="w-3 h-3 md:w-4 md:h-4 text-white" />
              </div>
              <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">
                {currentSlideData.footer || "FieldTalk English"}
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {currentSlide + 1} / {slides.length}
              </span>
              <div className="flex space-x-1">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentSlide
                        ? "bg-blue-500"
                        : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <button
            onClick={prevSlide}
            className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 md:w-6 md:h-6 text-gray-600 dark:text-gray-300" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 md:w-12 md:h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4 md:w-6 md:h-6 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Mobile Navigation Dots */}
          <div className="md:hidden absolute bottom-3 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide
                      ? "bg-blue-500"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
