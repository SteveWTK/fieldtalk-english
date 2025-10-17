// / src/app/(landing)/academies/page.js
"use client";

import React from "react";
import {
  Globe,
  //   Users,
  Target,
  //   BarChart3,
  Star,
  // TrendingUp,
  // Shield,
  // Award,
  // Clock,
  CheckCircle,
  // Presentation,
  Heart,
  Zap,
  BookOpen,
} from "lucide-react";
// import PlayerJourney from "@/components/PlayerJourney";
import Link from "next/link";

export default function AcademyLandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900 dark:to-accent-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-5">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              {/* <div className="flex items-center mb-6">
                <span className="text-sm font-medium text-accent-600 bg-accent-50 px-3 py-1 rounded-full">
                  Feito para Jovens Brasileiros
                </span>
              </div> */}
              <h1 className="text-4xl md:text-[42px] font-bold text-primary-900 dark:text-white mb-6">
                Inglês que Abre Portas para o
                <span className="block bg-gradient-to-r from-accent-700 to-accent-500 bg-clip-text text-transparent">
                  Futebol Internacional
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Plataforma de inglês especializada para jovens jogadores e
                profissionais do futebol que sonham em atuar fora do Brasil. Do
                primeiro treino às entrevistas na mídia - preparamos nossos
                atletas para o sucesso mundial.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signin"
                  className="bg-gradient-to-r from-primary-600 to-accent-500 text-white px-8 py-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
                >
                  Crie uma conta
                  {/* <Presentation className="w-5 h-5 ml-2" /> */}
                </Link>
                <Link
                  href="/lesson"
                  className="border-2 border-accent-600 text-accent-600 dark:text-accent-400 dark:border-accent-400 px-8 py-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
                >
                  Área do Aluno
                  {/* <Presentation className="w-5 h-5 ml-2" /> */}
                </Link>
                {/* <button className="border-2 border-accent-600 text-accent-600 dark:text-accent-400 dark:border-accent-400 px-8 py-4 rounded-lg font-semibold hover:bg-green-50 dark:hover:bg-gray-800 transition-all duration-200">
                  Aulas
                </button> */}
              </div>
              <div className="mt-8 flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-accent-500 mr-2" />
                  Metodologia Comprovada
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-accent-500 mr-2" />
                  Preços Acessíveis
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-accent-500 mr-2" />
                  Suporte em Português
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="/images/hero/hero-academies.jpg"
                alt="Jovens jogadores brasileiros aprendendo inglês para futebol"
                className="rounded-2xl shadow-2xl w-full"
                onError={(e) => {
                  e.target.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%23f3f4f6'/%3E%3Ctext x='300' y='180' text-anchor='middle' fill='%236b7280' font-size='18'%3EJovens Talentos%3C/text%3E%3Ctext x='300' y='200' text-anchor='middle' fill='%236b7280' font-size='18'%3EAprendendo Inglês%3C/text%3E%3Ctext x='300' y='230' text-anchor='middle' fill='%236b7280' font-size='14'%3EFieldTalk Academy%3C/text%3E%3C/svg%3E";
                }}
              />
              {/* <div className="absolute -top-6 -right-6 bg-gradient-to-r from-accent-500 to-primary-500 text-white rounded-xl p-4 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-xs">Taxa de Sucesso</div>
                </div>
              </div> */}
            </div>
          </div>
        </div>
      </section>

      {/* Problema que Resolvemos */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              O Sonho Internacional Começa com o Inglês
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Sabemos que muitos talentos brasileiros perdem tempo e
              oportunidades no exterior porque não conseguem se comunicar em
              inglês. Nós mudamos essa realidade.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl bg-red-50 dark:bg-gray-800">
              <Heart className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Sonhos Interrompidos
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Jovens talentos perdem contratos no exterior por não conseguirem
                se comunicar com técnicos e companheiros
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-yellow-50 dark:bg-gray-800">
              <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Adaptação Difícil
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Jogadores que conseguem contratos levam muito tempo para se
                adaptar, perdendo meses preciosos de desenvolvimento
              </p>
            </div>
            <div className="text-center p-6 rounded-xl bg-green-50 dark:bg-gray-800">
              <BookOpen className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Nossa Solução
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Inglês específico para futebol que prepara jovens para o sucesso
                internacional desde o início
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Três Pilares - Adaptado para Academias */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Três Módulos para o Sucesso Internacional
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Nossa metodologia comprovada leva jovens jogadores desde as
              primeiras palavras até a fluência profissional
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Sobrevivência */}
            <div className="group relative">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-red-500">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  1. Inglês de Sobrevivência
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Comunicação essencial para os primeiros dias na Europa - do
                  aeroporto ao primeiro treino.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    Apresentar-se no clube
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    Pedir ajuda e direções
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    Situações de emergência
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                    Vida cotidiana básica
                  </li>
                </ul>
              </div>
            </div>

            {/* Precisão */}
            <div className="group relative">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-blue-500">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  2. Inglês de Precisão
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Linguagem técnica do futebol para performance profissional e
                  entendimento tático.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Instruções táticas
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Comunicação em campo
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Feedback de treinos
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    Relatórios médicos
                  </li>
                </ul>
              </div>
            </div>

            {/* Fluência */}
            <div className="group relative">
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border-t-4 border-green-500">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Star className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  3. Inglês de Fluência
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Comunicação avançada para liderança, mídia e sucesso na
                  carreira internacional.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Entrevistas na mídia
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Liderança no time
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Negociações de contrato
                  </li>
                  <li className="flex items-center text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Engajamento comunitário
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Benefícios para Academias */}
          {/* <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                ROI Comprovado para Academias
              </h3>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  85% Mais Contratos
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Jogadores fluentes em inglês recebem mais ofertas da Europa
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  6 Meses Mais Rápido
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Adaptação acelerada em clubes internacionais
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Menos Riscos
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Redução de problemas de comunicação que prejudicam performance
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Valor de Transferência
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Jogadores bilíngues têm valores de mercado superiores
                </p>
              </div>
            </div>
          </div> */}
        </div>
      </section>

      {/* Jornada do Jogador - Adaptada */}
      {/* <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Da Academia Brasileira para o Futebol Europeu
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Veja como transformamos jovens talentos brasileiros em jogadores
              preparados para o mercado internacional
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                História de Sucesso: De São Paulo para Londres
              </h3>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-xl">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Março 2024
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  João, 16 anos, lateral-esquerdo de uma academia em São Paulo.
                  Zero inglês, mas muito talento.
                </p>
              </div>

              <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-xl">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Setembro 2024
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Após 6 meses com FieldTalk, João se comunica confiante em
                  inglês e impressiona olheiros europeus.
                </p>
              </div>

              <div className="text-center p-6 bg-white dark:bg-gray-900 rounded-xl">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Janeiro 2025
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Contrato assinado com clube da Championship inglesa. Adaptação
                  perfeita graças ao inglês.
                </p>
              </div>
            </div>

            <div className="text-center">
              <blockquote className="text-lg italic text-gray-700 dark:text-gray-300 mb-4">
                &quot;O FieldTalk não só me ensinou inglês, me preparou para
                realizar meu sonho. Hoje me comunico perfeitamente com meus
                companheiros ingleses.&quot;
              </blockquote>
              <cite className="text-sm text-gray-600 dark:text-gray-400">
                - João Silva, Chelsea FC Academy
              </cite>
            </div>
          </div>
        </div>
      </section> */}

      {/* Planos de Investimento */}
      {/* <section id="planos" className="py-16 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Planos de Investimento Acessíveis
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Opções flexíveis para diferentes tamanhos de academias e
              orçamentos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8"> */}
      {/* Plano Básico */}
      {/* <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Academia Básica
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  R$ xxx
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  por mês
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Até 15 jogadores
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Conteúdo personalizado
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Relatórios mensais
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Suporte em português
                  </span>
                </li>
              </ul>
              <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                Começar Agora
              </button>
            </div> */}

      {/* Plano Profissional */}
      {/* <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl border-2 border-green-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Mais Popular
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Academia Profissional
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  R$ xxx
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  por mês
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Até 30 jogadores
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Avaliações individuais
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Treinamento para técnicos
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Preparação para tryouts
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Suporte prioritário
                  </span>
                </li>
              </ul>
              <button className="w-full bg-gradient-to-r from-green-600 to-blue-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
                Escolher Profissional
              </button>
            </div> */}

      {/* Plano Elite */}
      {/* <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Academia Elite
                </h3>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  Customizado
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  entre em contato
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Jogadores ilimitados
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Conteúdo exclusivo
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Consultoria especializada
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Conexões internacionais
                  </span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Suporte 24/7
                  </span>
                </li>
              </ul>
              <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
                Falar com Especialista
              </button>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              🇧🇷 Todos os planos incluem suporte em português | 📊 Relatórios de
              progresso | 🔒 Segurança de dados
            </p>
          </div>
        </div>
      </section> */}

      {/* Call to Action Final */}
      <section className="pt-8 pb-4 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-4xl font-bold text-white">
            Transforme o Futuro dos Seus Jogadores
          </h2>
          <p className="text-xl text-green-100 mb-4">
            Dê aos seus atletas a vantagem competitiva que eles precisam para
            brilhar globalmente
          </p>
          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Agendar Demonstração Gratuita
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-green-600 transition-colors">
              Baixar Material Informativo
            </button>
          </div>
          <div className="mt-8 text-green-100 text-sm">
            ⚽ Usado por +50 academias no Brasil | 🏆 92% de taxa de sucesso em
            transferências
          </div> */}
        </div>
      </section>

      {/* Footer */}
      {/* <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-blue-500 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">FieldTalk Academy</span>
            </div>
            <p className="text-gray-400 mb-4">
              Inglês especializado para jovens talentos do futebol brasileiro
            </p>
            <p className="text-sm text-gray-500">
              © 2025 FieldTalk English. Construído para academias e jovens
              sonhadores.
            </p>
          </div>
        </div>
      </footer> */}
    </>
  );
}

// "use client";

// import Image from "next/image";
// import Link from "next/link";

// export default function landingPageHome() {
//   return (
//     // <div className="w-full flex justify-center bg-white dark:bg-primary-950">
//     //   <img src="/landing/Habitat-landing-slogan.png" alt="Hero" className="" />
//     // </div>
//     <div className="relative transform-3d bg-white dark:bg-primary-900">
//       <div className="top-1/2 left-1/2 flex justify-center rounded-b-xl bg-white dark:bg-primary-900">
//         <Image
//           src="/images/hero/FieldTalk-landing.png"
//           alt="FieldTalk Hero Image"
//           width={1920} // actual image width
//           height={1080} // actual image height
//           className="lg:px-32"
//           priority
//         />
//         {/* <img
//           src="/images/hero/FieldTalk-landing.png"
//           alt="FieldTalk Hero Image"
//           className="lg:px-32"
//         /> */}
//         {/* <img
//           src="/landing/Habitat-landing-mobile-5.png"
//           alt="Hero"
//           className="object-top h-10/12 overflow-hidden sm:hidden"
//         /> */}
//       </div>
//       <div className="flex justify-center gap-8 pt-4 pb-4">
//         <Link href="/schools">
//           <p className="block sm:invisible text-[10px] md:text-[12px] xl:text-sm  text-primary-900 hover:text-accent-600 dark:text-white dark:hover:text-accent-200 border-b-1 px-2 py-1 border-primary-900 hover:border-accent-600 dark:border-white dark:hover:border-accent-200 rounded-xl hover:translate-z-192">
//             {" "}
//             FOR SCHOOLS
//           </p>
//         </Link>
//         <Link href="/explorers">
//           <p className="block sm:invisible text-[10px] md:text-[12px] xl:text-sm  text-primary-900 hover:text-accent-600 dark:text-white dark:hover:text-accent-200 border-b-1 px-2 py-1 border-primary-900 hover:border-accent-600 dark:border-white dark:hover:border-accent-200 rounded-xl hover:translate-z-192">
//             {" "}
//             SOLO EXPLORERS
//           </p>
//         </Link>
//       </div>
//     </div>
//   );
// }
