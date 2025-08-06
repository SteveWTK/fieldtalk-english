// src/app/demo/academy-trial/page.js
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Star, 
  Trophy, 
  Target, 
  Heart,
  Globe,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import academyDemoLesson from '@/data/academyDemoLesson';
import { getAcademyDemoLessonId } from '@/lib/supabase/academyDemo';

export default function AcademyTrialDemo() {
  const router = useRouter();
  const [language, setLanguage] = useState('pt-BR');
  const [lessonId, setLessonId] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Toggle between Portuguese and English
  const toggleLanguage = () => {
    setLanguage(language === 'pt-BR' ? 'en' : 'pt-BR');
  };

  // Fetch the actual lesson UUID
  useEffect(() => {
    async function fetchLessonId() {
      try {
        const id = await getAcademyDemoLessonId();
        setLessonId(id);
      } catch (error) {
        console.error('Error fetching lesson ID:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchLessonId();
  }, []);

  const lesson = academyDemoLesson;

  const handleStartLesson = () => {
    if (lessonId) {
      router.push(`/lesson/${lessonId}`);
    } else {
      // Fallback - show error or redirect to setup
      alert(language === 'pt-BR' 
        ? 'Demo lesson não encontrada. Execute a migração do banco de dados primeiro.' 
        : 'Demo lesson not found. Please run the database migration first.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Language Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleLanguage}
          className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg 
                   flex items-center space-x-2 hover:shadow-xl transition-all"
        >
          <Globe className="w-5 h-5" />
          <span className="font-medium">
            {language === 'pt-BR' ? '🇧🇷 PT' : '🇬🇧 EN'}
          </span>
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-yellow-500/20"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="text-center mb-6">
            <span className="inline-flex items-center px-4 py-2 rounded-full 
                         bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300
                         text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              {language === 'pt-BR' ? 'DEMO GRATUITO' : 'FREE DEMO'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-center mb-6">
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {language === 'pt-BR' ? lesson.title_pt : lesson.title}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-center text-gray-700 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {language === 'pt-BR' 
              ? lesson.description_pt 
              : lesson.description}
          </p>

          {/* Brazilian Players Inspiration */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto mb-8">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {language === 'pt-BR' 
                  ? 'Siga os Passos dos Campeões' 
                  : 'Follow the Champions\' Path'}
              </h2>
              <Star className="w-6 h-6 text-yellow-500" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4">
                <div className="text-3xl mb-2">⚽</div>
                <p className="font-bold text-gray-900 dark:text-white">Neymar Jr.</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'pt-BR' ? 'Santos → Barcelona' : 'Santos → Barcelona'}
                </p>
              </div>
              <div className="p-4">
                <div className="text-3xl mb-2">🌟</div>
                <p className="font-bold text-gray-900 dark:text-white">Vinicius Jr.</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'pt-BR' ? 'Flamengo → Real Madrid' : 'Flamengo → Real Madrid'}
                </p>
              </div>
              <div className="p-4">
                <div className="text-3xl mb-2">🏆</div>
                <p className="font-bold text-gray-900 dark:text-white">Gabriel Jesus</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {language === 'pt-BR' ? 'Palmeiras → Man City' : 'Palmeiras → Man City'}
                </p>
              </div>
            </div>

            <p className="text-center text-gray-700 dark:text-gray-300 mt-4 font-medium">
              {language === 'pt-BR' 
                ? '🔥 Todos começaram em academias brasileiras. Inglês abriu portas internacionais!' 
                : '🔥 All started in Brazilian academies. English opened international doors!'}
            </p>
          </div>

          {/* Lesson Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg
                        transform hover:scale-105 transition-transform">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg 
                          flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                {language === 'pt-BR' ? 'Escreva Seus Sonhos' : 'Write Your Dreams'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'pt-BR' 
                  ? 'IA ajuda você a escrever sobre seus objetivos em inglês'
                  : 'AI helps you write about your goals in English'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg
                        transform hover:scale-105 transition-transform">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg 
                          flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                {language === 'pt-BR' ? 'Dicas Inteligentes' : 'Smart Hints'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'pt-BR' 
                  ? 'Sistema de dicas que ajuda sem dar a resposta'
                  : 'Hint system that helps without giving answers'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg
                        transform hover:scale-105 transition-transform">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg 
                          flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                {language === 'pt-BR' ? 'Converse com o Coach' : 'Talk to the Coach'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'pt-BR' 
                  ? 'Pratique conversação com IA em situações reais'
                  : 'Practice conversation with AI in real situations'}
              </p>
            </div>
          </div>

          {/* What You'll Learn */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 
                      rounded-2xl p-8 max-w-4xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              {language === 'pt-BR' ? 'O Que Você Vai Aprender' : 'What You\'ll Learn'}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              {lesson.content.learning_objectives.map((objective, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{objective}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-center text-gray-700 dark:text-gray-300">
                <span className="font-bold text-green-600 dark:text-green-400">
                  {language === 'pt-BR' ? '⏱ 15-20 minutos' : '⏱ 15-20 minutes'}
                </span>
                {' • '}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {language === 'pt-BR' ? '🎯 Nível Iniciante' : '🎯 Beginner Level'}
                </span>
                {' • '}
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {language === 'pt-BR' ? '💎 100 XP' : '💎 100 XP'}
                </span>
              </p>
            </div>
          </div>

          {/* Motivational Message */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 
                      max-w-4xl mx-auto mb-12 text-white">
            <div className="text-center">
              <Heart className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">
                {language === 'pt-BR' 
                  ? 'Acreditamos em Você!' 
                  : 'We Believe in You!'}
              </h2>
              <p className="text-lg opacity-95">
                {language === 'pt-BR' 
                  ? 'Sabemos que você treina duro todos os dias. Sabemos dos sacrifícios que você e sua família fazem. Este curso foi criado especialmente para jovens como você - talentosos, dedicados e com grandes sonhos. Inglês é mais uma habilidade que vai te levar mais longe!'
                  : 'We know you train hard every day. We know the sacrifices you and your family make. This course was created especially for young players like you - talented, dedicated, with big dreams. English is another skill that will take you further!'}
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="text-center">
            <button
              onClick={handleStartLesson}
              disabled={loading || !lessonId}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white 
                       px-8 py-4 rounded-full text-lg font-bold
                       hover:shadow-2xl transform hover:scale-105 transition-all
                       inline-flex items-center space-x-3
                       disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Trophy className="w-6 h-6" />
              <span>
                {loading 
                  ? (language === 'pt-BR' ? 'Carregando...' : 'Loading...')
                  : !lessonId
                  ? (language === 'pt-BR' ? 'Demo Indisponível' : 'Demo Unavailable')
                  : (language === 'pt-BR' ? 'Começar Agora - É Grátis!' : 'Start Now - It\'s Free!')
                }
              </span>
              <ArrowRight className="w-6 h-6" />
            </button>

            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {language === 'pt-BR' 
                ? 'Não precisa cadastro • Comece imediatamente • 100% gratuito' 
                : 'No signup needed • Start immediately • 100% free'}
            </p>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex justify-center items-center space-x-8 opacity-75">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">1000+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'pt-BR' ? 'Jogadores' : 'Players'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">15+</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'pt-BR' ? 'Academias' : 'Academies'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">4.9⭐</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {language === 'pt-BR' ? 'Avaliação' : 'Rating'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}