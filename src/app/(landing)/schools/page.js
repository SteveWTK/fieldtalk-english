/* eslint-disable @typescript-eslint/no-unused-vars */
// src\app\(landing)\schools\page.js

"use client";

import React from "react";
import {
  //   ChevronRight,
  Globe,
  Users,
  Target,
  //   BarChart3,
  Trophy,
  Star,
  Play,
  BookOpen,
  Award,
  // MessageSquare,
  Zap,
  Heart,
  CheckCircle,
  LaptopMinimal,
  Smartphone,
} from "lucide-react";
// import PlayerJourney from "@/components/PlayerJourney";
// import TestimonialCard from "@/components/TestimonialCard";
// import PhotoGallery from "@/components/PhotoGallery";
import Link from "next/link";
import Image from "next/image";

export default function BrazilianLandingPage() {
  return (
    <>
      {/* Hero Section with Photo */}
      <section className="py-20 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-primary-50 mb-6">
                Uma Experiência Gamificada de Conversação para
                <span className="block bg-accent-400 bg-clip-text text-transparent">
                  Amantes do Futebol
                </span>
              </h1>
              <p className="text-xl text-primary-300 mb-8">
                Alunos empolgados. Aulas diferentes. Fácil de implementar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/lesson"
                  className="bg-accent-400 hover:bg-accent-300 text-primary-900 px-8 py-4 rounded-control font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
                >
                  Área do Aluno <Play className="w-5 h-5 ml-2" />
                </Link>
                {/* <button className="border-2 border-accent-600 text-accent-600 dark:text-accent-400 dark:border-accent-400 px-8 py-4 rounded-lg font-semibold hover:bg-green-50 dark:hover:bg-gray-800 transition-all duration-200">
                  Fale com a Cultura
                </button> */}
              </div>
              <div className="mt-8 flex items-center space-x-6 text-sm text-primary-300">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-accent-400 mr-2" />
                  Método exclusivo
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-accent-400 mr-2" />
                  Professores especializados
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-accent-400 mr-2" />
                  Resultados garantidos
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="/images/hero/hero-schools-cr3.jpg"
                alt="Jovem jogador brasileiro treinando"
                className="rounded-card shadow-2xl w-full"
                onError={(e) => {
                  e.target.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f3f4f6'/%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%236b7280' font-size='18'%3EJovem jogador brasileiro%3C/text%3E%3Ctext x='300' y='230' text-anchor='middle' fill='%236b7280' font-size='14'%3Etreinando com confiança%3C/text%3E%3C/svg%3E";
                }}
              />
              {/* <div className="absolute -bottom-6 -left-6 text-gray-950 dark:text-white bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    +1.000 alunos ativos
                  </span>
                </div>
              </div> */}
              {/* <div className="absolute -top-6 -right-6 bg-gradient-to-r from-accent-500 to-primary-500 text-white rounded-xl p-4 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">98%</div>
                  <div className="text-xs">Taxa de sucesso</div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Global Player Section */}
      <section className="pt-2 pb-16 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-primary-50 mb-4">
              Por que Global Player?
            </h2>
            {/* <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Não é apenas mais um curso de inglês. É a preparação completa para
              uma carreira internacional no futebol.
            </p> */}
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-card bg-primary-panel">
              <Smartphone className="w-12 h-12 text-accent-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary-50 mb-2">
                Experiência gameficada
              </h3>
              <p className="text-primary-300">
                Atividades para preparar o aluno de forma leve e dinâmica para a
                aula de conversação
              </p>
            </div>
            <div className="text-center p-6 rounded-card bg-primary-panel">
              <Users className="w-12 h-12 text-signal-english mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary-50 mb-2">
                Os alunos decidem
              </h3>
              <p className="text-primary-300">
                Votação semanal no tópico da próxima aula de conversação
              </p>
            </div>
            <div className="text-center p-6 rounded-card bg-primary-panel">
              <LaptopMinimal className="w-12 h-12 text-signal-mental mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary-50 mb-2">
                Painel de acompanhamento
              </h3>
              <p className="text-primary-300">
                Gestor e pais acompanham desempenho nas atividades e presença
                nas aulas
              </p>
            </div>
            <div className="text-center p-6 rounded-card bg-primary-panel">
              <Trophy className="w-12 h-12 text-signal-performance mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-primary-50 mb-2">
                Avaliações e certificados
              </h3>
              <p className="text-primary-300">
                Ao finalizar o módulo o aluno recebe um certificado digital com
                seu desempenho
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three Pillars Section - Adapted for Students */}
      <section id="metodo" className="py-16 bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-primary-50 mb-6">
              Os Três Pilares do Sucesso Internacional
            </h2>
            {/* <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Nossa metodologia exclusiva garante que seu filho domine o inglês
              necessário para uma carreira internacional - desde o primeiro dia
              até se tornar um líder.
            </p> */}
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Survival Pillar */}
            <div className="group relative">
              <div className="bg-primary-panel rounded-card p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-accent-400">
                <div className="w-16 h-16 bg-accent-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8 text-primary-900" />
                </div>
                <h3 className="text-2xl font-bold text-primary-50 mb-4">
                  1. Sobrevivência
                </h3>
                <p className="text-primary-300 mb-6">
                  O essencial para se adaptar rapidamente à vida e cultura do
                  futebol inglês.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-accent-400 rounded-full mr-3"></div>
                    Primeiro dia no clube
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-accent-400 rounded-full mr-3"></div>
                    Moradia e cuidados médicos
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-accent-400 rounded-full mr-3"></div>
                    Emergências e pedidos de ajuda
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-accent-400 rounded-full mr-3"></div>
                    Vida social e compras
                  </li>
                </ul>
                {/* <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-green-600">
                    Meta: Primeiros 30 dias
                  </span>
                </div> */}
              </div>
            </div>

            {/* Precision Pillar */}
            <div className="group relative">
              <div className="bg-primary-panel rounded-card p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-signal-english">
                <div className="w-16 h-16 bg-signal-english rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary-50 mb-4">
                  2. Precisão
                </h3>
                <p className="text-primary-300 mb-6">
                  Linguagem técnica para performance profissional e compreensão
                  tática.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-english rounded-full mr-3"></div>
                    Instruções táticas e formações
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-english rounded-full mr-3"></div>
                    Comunicação durante jogos
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-english rounded-full mr-3"></div>
                    Treinos e feedback técnico
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-english rounded-full mr-3"></div>
                    Relatórios médicos e lesões
                  </li>
                </ul>
                {/* <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-blue-600">
                    Meta: Primeiros 3 meses
                  </span>
                </div> */}
              </div>
            </div>

            {/* Fluency Pillar */}
            <div className="group relative">
              <div className="bg-primary-panel rounded-card p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-signal-mental">
                <div className="w-16 h-16 bg-signal-mental rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary-50 mb-4">
                  3. Fluência
                </h3>
                <p className="text-primary-300 mb-6">
                  Comunicação avançada para liderança, mídia e sucesso de longo
                  prazo.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-mental rounded-full mr-3"></div>
                    Entrevistas e treinamento de mídia
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-mental rounded-full mr-3"></div>
                    Liderança de equipe
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-mental rounded-full mr-3"></div>
                    Negociações de contrato
                  </li>
                  <li className="flex items-center text-primary-100">
                    <div className="w-2 h-2 bg-signal-mental rounded-full mr-3"></div>
                    Engajamento comunitário
                  </li>
                </ul>
                {/* <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-purple-600">
                    Meta: 6+ meses
                  </span>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans Section */}
      {/* <section id="planos" className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Planos e Investimento
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Escolha o plano ideal para o desenvolvimento do seu filho
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Iniciante
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  R$ 297
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  por mês
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Acesso completo à plataforma
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    15 lições interativas
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Feedback automatizado por IA
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Certificado de conclusão
                  </span>
                </li>
              </ul>
              <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                Começar Agora
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl border-2 border-green-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Mais Popular
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Profissional
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  R$ 497
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  por mês
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Tudo do plano Iniciante
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    2 aulas presenciais por semana
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Professor especializado em futebol
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Relatórios de progresso
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Simulações de entrevista
                  </span>
                </li>
              </ul>
              <button className="w-full bg-gradient-to-r from-green-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                Escolher Profissional
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Elite
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  R$ 897
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  por mês
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Tudo do plano Profissional
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Mentoria individual 1-on-1
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Preparação para testes em clubes
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Networking com scouts
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Suporte familiar completo
                  </span>
                </li>
              </ul>
              <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                Falar com Consultor
              </button>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              💳 Parcelamento em até 12x sem juros | 🛡️ Garantia de 30 dias | 📞
              Suporte dedicado
            </p>
          </div>
        </div>
      </section> */}

      {/* Call to Action */}
      {/* <section className="py-20 bg-gradient-to-r from-green-600 to-blue-500">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Invista no Futuro Internacional do Seu Filho
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Não deixe a barreira do idioma impedir o sonho de uma carreira
            internacional. Comece hoje mesmo a preparação para o sucesso.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Agendar Conversa com Consultor
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-colors">
              Baixar Material Informativo
            </button>
          </div>
          <div className="mt-8 flex items-center justify-center space-x-8 text-green-100">
            <div className="flex items-center">
              <Heart className="w-4 h-4 mr-2" />
              Satisfação garantida
            </div>
            <div className="flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Resultados em 90 dias
            </div>
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-2" />
              Certificação internacional
            </div>
          </div>
        </div>
      </section> */}

      {/* Footer */}
      {/* <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-500 rounded-full flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">FieldTalk English</span>
              </div>
              <div className="flex items-start mb-6">
                <span className="text-sm font-medium dark:text-white px-3 py-1 rounded-full">
                  Com a Cultura Inglesa
                </span>
                <img
                  src="images/logos/cultura-inglesa-lion-nb.png"
                  alt="Cultura Inglesa Lion"
                  className="h-8 mr-1 rounded-full shadow-2xl"
                />
              </div>
              <p className="text-gray-400 mb-4">
                Preparando jovens brasileiros para o sucesso internacional no
                futebol
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Curso</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#metodo" className="hover:text-white">
                    Metodologia
                  </a>
                </li>
                <li>
                  <a href="#planos" className="hover:text-white">
                    Planos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Demo Gratuito
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Parceria</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Cultura Inglesa
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Escolas Parceiras
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Seja um Parceiro
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Contato</h3>
              <ul className="space-y-2 text-gray-400">
                <li>📞 (11) 9999-9999</li>
                <li>📧 contato@fieldtalkenglish.com</li>
                <li>📍 São Paulo, SP</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-500">
              © 2025 FieldTalk English. Uma parceria Cultura Inglesa para
              transformar sonhos em realidade.
            </p>
          </div>
        </div>
      </footer> */}
    </>
  );
}

{
  /* Success Statistics */
}
//     <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
//       <div className="text-center mb-8">
//         <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
//           Resultados Comprovados
//         </h3>
//       </div>
//       <div className="grid md:grid-cols-4 gap-6">
//         <div className="text-center">
//           <div className="text-3xl font-bold text-green-600 mb-2">
//             98%
//           </div>
//           <p className="text-sm text-gray-600 dark:text-gray-300">
//             Dos alunos aprovados em testes de clubes internacionais
//           </p>
//         </div>
//         <div className="text-center">
//           <div className="text-3xl font-bold text-blue-600 mb-2">
//             6 meses
//           </div>
//           <p className="text-sm text-gray-600 dark:text-gray-300">
//             Tempo médio para fluência conversacional
//           </p>
//         </div>
//         <div className="text-center">
//           <div className="text-3xl font-bold text-purple-600 mb-2">
//             25+
//           </div>
//           <p className="text-sm text-gray-600 dark:text-gray-300">
//             Ex-alunos jogando profissionalmente na Europa
//           </p>
//         </div>
//         <div className="text-center">
//           <div className="text-3xl font-bold text-orange-600 mb-2">
//             100%
//           </div>
//           <p className="text-sm text-gray-600 dark:text-gray-300">
//             Dos pais recomendam o programa
//           </p>
//         </div>
//       </div>
//     </div>
//   </div>
// </section>

// {/* Photo Gallery Section */}
// <section className="py-16 bg-white dark:bg-gray-900">
//   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//     <div className="text-center mb-12">
//       <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
//         Nossos Alunos em Ação
//       </h2>
//       <p className="text-lg text-gray-600 dark:text-gray-300">
//         Veja como nossos jovens craques estão se preparando para o sucesso
//         internacional
//       </p>
//     </div>
//     <PhotoGallery />
//   </div>
// </section>

// {/* Testimonials Section */}
// <section className="py-16 bg-gray-50 dark:bg-gray-800">
//   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//     <div className="text-center mb-12">
//       <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
//         O que Dizem os Pais e Alunos
//       </h2>
//       <p className="text-lg text-gray-600 dark:text-gray-300">
//         Depoimentos reais de famílias que investiram no futuro dos seus
//         filhos
//       </p>
//     </div>

//     <div className="grid md:grid-cols-3 gap-8">
//       <TestimonialCard
//         name="Maria Silva"
//         role="Mãe do Gabriel, 16 anos"
//         image="/images/testimonials/maria-silva.jpg"
//         quote="O Gabriel saiu da base do Flamengo direto para o Ajax. O FieldTalk English foi fundamental para ele se adaptar rapidamente. Em 3 meses já estava se comunicando perfeitamente com os técnicos."
//         rating={5}
//       />

//       <TestimonialCard
//         name="Carlos Mendes"
//         role="Pai da Letícia, 15 anos"
//         image="/images/testimonials/carlos-mendes.jpg"
//         quote="Minha filha sempre sonhou jogar na Europa. O curso não só ensinou inglês, mas toda a cultura do futebol europeu. Ela se sentiu preparada desde o primeiro dia no Barcelona."
//         rating={5}
//       />

//       <TestimonialCard
//         name="Ana Costa"
//         role="Coordenadora Cultura Inglesa SP"
//         image="/images/testimonials/ana-costa.jpg"
//         quote="Como educadora, posso afirmar que o FieldTalk English é revolucionário. Une paixão pelo futebol com excelência pedagógica. Nossos alunos ficam mais motivados e aprendem mais rápido."
//         rating={5}
//       />
//     </div>

//     <div className="mt-12 bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
//       <div className="text-center">
//         <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
//           <MessageSquare className="w-10 h-10 text-white" />
//         </div>
//         <blockquote className="text-xl italic text-gray-700 dark:text-gray-300 mb-6">
//           &quot;O FieldTalk English não é apenas um curso de idiomas - é
//           um investimento no futuro internacional do seu filho. É a
//           diferença entre sonhar e realizar.&quot;
//         </blockquote>
//         <div className="flex items-center justify-center space-x-4">
//           <img
//             src="/images/testimonials/rodrigo-antunes.jpg"
//             alt="Rodrigo Antunes"
//             className="w-12 h-12 rounded-full"
//             onError={(e) => {
//               e.target.src =
//                 "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23e5e7eb'/%3E%3Ctext x='24' y='28' text-anchor='middle' fill='%236b7280' font-size='12'%3ERA%3C/text%3E%3C/svg%3E";
//             }}
//           />
//           <div className="text-left">
//             <div className="font-semibold text-gray-900 dark:text-white">
//               Rodrigo Antunes
//             </div>
//             <div className="text-sm text-gray-600 dark:text-gray-300">
//               Ex-jogador da Seleção Brasileira, fundador do FieldTalk
//               English
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   </div>

{
  /* FAQ Section */
}
// <section className="py-16 bg-white dark:bg-gray-900">
//   <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
//     <div className="text-center mb-12">
//       <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
//         Perguntas Frequentes
//       </h2>
//     </div>

//     <div className="space-y-6">
//       <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
//         <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
//           A partir de que idade meu filho pode começar?
//         </h3>
//         <p className="text-gray-600 dark:text-gray-300">
//           O curso é ideal para jovens entre 12 e 18 anos que já tenham
//           conhecimento básico de inglês. Fazemos uma avaliação inicial
//           para determinar o nível ideal de entrada.
//         </p>
//       </div>

//       <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
//         <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
//           Quanto tempo leva para ver resultados?
//         </h3>
//         <p className="text-gray-600 dark:text-gray-300">
//           Em média, os alunos demonstram conversação básica em situações
//           de futebol em 3 meses, e fluência conversacional em 6-8 meses,
//           dependendo da dedicação e nível inicial.
//         </p>
//       </div>

//       <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
//         <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
//           O curso substitui as aulas regulares de inglês?
//         </h3>
//         <p className="text-gray-600 dark:text-gray-300">
//           O FieldTalk English complementa o ensino tradicional com foco
//           específico no futebol. Recomendamos manter ambos para
//           desenvolvimento completo do idioma.
//         </p>
//       </div>

//       <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
//         <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
//           E se meu filho não quiser mais seguir carreira no futebol?
//         </h3>
//         <p className="text-gray-600 dark:text-gray-300">
//           As habilidades desenvolvidas são transferíveis para qualquer
//           área. Liderança, comunicação clara e confiança são valiosas em
//           qualquer carreira que seu filho escolher.
//         </p>
//       </div>
//     </div>
//   </div>
// </section>
