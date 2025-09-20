// pages/about-us/page.js
"use client";

import { useLanguage } from "@/lib/contexts/LanguageContext";
import { motion } from "framer-motion";
// import Image from "next/image";

export default function AboutUsPage() {
  const { lang } = useLanguage();

  const t = {
    en: {
      title: "About FieldTalk",
      subtitle: "Empowering Football Players Through Professional English",
      missionTitle: "Our Mission",
      missionText:
        "We empower football players from Brazil and other non-English speaking countries to achieve their dreams of playing internationally by providing specialized English training tailored to the professional football environment.",
      visionTitle: "Our Vision",
      visionText:
        "A world where language is never a barrier to football talent—where every aspiring player has the English skills needed to communicate confidently with coaches, teammates, and media in the UK, Europe, and international football markets.",
      whatMakesUsSpecial: "What Makes Us Special",
      feature1Title: "Football-Specific English",
      feature1Text:
        "Every lesson focuses on real football scenarios: tactics discussions, press conferences, contract negotiations, and team communication.",
      feature2Title: "Interactive Training",
      feature2Text:
        "Gamified experiences simulating real match situations, locker room conversations, and media interviews.",
      feature3Title: "Career Advancement",
      feature3Text:
        "Learning that directly improves players' opportunities for trials, transfers, and success in English-speaking leagues.",
      feature4Title: "Native Language Support",
      feature4Text:
        "Content available with Portuguese translations and support, specifically designed for Brazilian and Latin American players.",
      teamTitle: "Meet Our Team",
      teamSubtitle:
        "Passionate educators and football experts working together to break language barriers in professional football",
      founder1Title: "Technical Director",
      founder1Bio:
        "With expertise in technology and language learning platforms combined with over 30 years of experience running English language schools, including experience teaching players and coaches in the Premier League, Stephen ensures that players have access to cutting-edge tools to master football English.",
      founder2Title: "Director of Content and Strategic Parnterships",
      founder2Bio:
        "Paul has been teaching English for 30 years and specializes in language training and effective, student-centered techniques, including sports-specific language. With connections in professional soccer, Paul ensures players learn the exact English they need for success.",
      founder3Title: "Marketing Director",
      founder3Bio:
        "David has over 25 years of experience in ESL as a teacher and director. He has been the director of Cultura Inglesa Teresina since 2008, leading it to a peak of 1,750 students and over 100 employees. Specializing in business strategy and management processes, David is passionate about leading strong, united teams and creating a highly positive company culture.",
      founder4Title: "Academic Consultant",
      founder4Bio:
        "With nearly 50 years of experience teaching English as a second language, Michael holds a BA in Modern Languages ​​from the University of Oxford, an MA in Language Science from the University of Reading, and a PhD in Second Language Acquisition from UFSC, Brazil. Michael specializes in EFL materials design and has published extensively.",
      valuesTitle: "Our Values",
      value1Title: "Player-First Approach",
      value1Text:
        "Every aspect of our platform is designed with the professional footballer's schedule and needs in mind.",
      value2Title: "Professional Excellence",
      value2Text:
        "We maintain the highest standards in sports-specific language training and professional communication.",
      value3Title: "Football Community",
      value3Text:
        "We connect players worldwide, creating a network of football professionals who support each other's language journey.",
      value4Title: "Continuous Improvement",
      value4Text:
        "We constantly update our content based on the latest football terminology, tactics, and industry requirements.",
      value5Title: "English for everyone",
      value5Text:
        "Developing special programs for soccer schools in underprivileged communities.",

      joinUsTitle: "Start Your Journey",
      joinUsText:
        "Whether you're an aspiring professional player, a youth academy talent, or already playing professionally and looking to make the jump to international football, FieldTalk is your pathway to success.",
      getStartedBtn: "Start Training Today",
      contactBtn: "Contact Us",
    },
    pt: {
      title: "Sobre o FieldTalk",
      subtitle: "Capacitando Jogadores de Futebol com Inglês Profissional",
      missionTitle: "Nossa Missão",
      missionText:
        "Capacitamos jogadores de futebol do Brasil e outros países não falantes de inglês a alcançar seus sonhos de jogar internacionalmente, fornecendo treinamento especializado em inglês adaptado ao ambiente do futebol profissional.",
      visionTitle: "Nossa Visão",
      visionText:
        "Um mundo onde o idioma nunca é uma barreira para o talento do futebol - onde cada jogador aspirante, não importando seu país de origem ou destino, tem as habilidades necessárias para se comunicar com confiança com treinadores, companheiros de equipe e mídia no Reino Unido, Europa e mercados internacionais do futebol.",
      whatMakesUsSpecial: "O Que Nos Torna Especiais",
      feature1Title: "Inglês Específico para Futebol",
      feature1Text:
        "Cada lição foca em cenários reais do futebol: discussões táticas, coletivas de imprensa, negociações de contrato e comunicação com a equipe.",
      feature2Title: "Treinamento Interativo",
      feature2Text:
        "Experiências gamificadas simulando situações reais de jogo, conversas no vestiário e entrevistas com a mídia.",
      feature3Title: "Avanço na Carreira",
      feature3Text:
        "Aprendizado que melhora diretamente as oportunidades dos jogadores para testes, transferências e sucesso em ligas de língua inglesa.",
      feature4Title: "Suporte em Língua Nativa",
      feature4Text:
        "Conteúdo disponível com traduções e suporte em português, especialmente projetado para jogadores brasileiros e latino-americanos.",
      teamTitle: "Conheça Nossa Equipe",
      teamSubtitle:
        "Educadores experientes trabalhando para quebrar barreiras linguísticas no futebol profissional",
      founder4Title: "Consultor Acadêmico",
      founder4Bio:
        "Com quase 50 anos de experiência no ensino de inglês como segunda língua, Michael é graduado em Línguas Modernas na Universidade de Oxford e possui Mestrado em Ciência da Linguagem (Universidade de Reading) e Doutorado em Aquisição de Segunda Língua (UFSC, Brasil). Michael é especialista em design de materiais para EFL, com diversas publicações.",
      founder1Title: "Diretor de Tecnologia",
      founder1Bio:
        "Com expertise em tecnologia e plataformas de aprendizado de idiomas aliado a mais de 30 anos de envolvimento na gerência de escolas de inglês, incluindo experiência lecionando jogadores e treinadores na Premier League, Stephen garante que os jogadores tenham acesso a ferramentas de ponta para dominar o inglês do futebol.",
      founder2Title: "Diretor de Conteúdo e Parcerias Estratégicas",
      founder2Bio:
        "Envolvido com o ensino de inglês há 30 anos, Paul é especialista em treinamento de idiomas e técnicas eficazes centradas no aluno, inclusive em linguagem específica para esportes. Com conexões no futebol profissional, Paul garante que os jogadores aprendam exatamente o inglês necessário para o sucesso.",
      founder3Title: "Diretor de Marketing",
      founder3Bio:
        "David possui mais de 25 anos de experiência em ESL como professor e diretor. Ele é diretor da Cultura Inglesa Teresina desde 2008, levando-a ao pico de 1.750 alunos e mais de 100 colaboradores. Especializado em estratégia de negócios e processos de gestão, David tem uma paixão por liderar equipes fortes e unidas e criar uma cultura empresarial altamente positiva.",
      valuesTitle: "Nossos Valores",
      value1Title: "Abordagem Focada no Jogador",
      value1Text:
        "Cada aspecto de nossa plataforma é projetado pensando na agenda e nas necessidades do jogador profissional.",
      value2Title: "Excelência Profissional",
      value2Text:
        "Mantemos os mais altos padrões em treinamento de idiomas específico para esportes e comunicação profissional.",
      value3Title: "Comunidade do Futebol",
      value3Text:
        "Conectamos jogadores mundialmente, criando uma rede de profissionais do futebol que apoiam a jornada linguística uns dos outros.",
      value4Title: "Melhoria Contínua",
      value4Text:
        "Atualizamos constantemente nosso conteúdo com base na terminologia, táticas e requisitos mais recentes da indústria do futebol.",
      value5Title: "Inglês para todos",
      value5Text:
        "Desenvolver programas especiais para escolinhas de futebol em comunidades carentes.",
      joinUsTitle: "Comece Sua Jornada",
      joinUsText:
        "Seja você um jogador profissional aspirante, um talento de academia juvenil, ou já jogando profissionalmente e buscando dar o salto para o futebol internacional, o FieldTalk é seu caminho para o sucesso.",
      getStartedBtn: "Comece a Treinar Hoje",
      contactBtn: "Contate-nos",
    },
  };

  const copy = t[lang];

  // Placeholder team data - you can fill this in with actual team information
  const teamMembers = [
    {
      id: 1,
      name: "Stephen Watkins",
      title: copy.founder1Title,
      bio: copy.founder1Bio,
      image: "/team/stephen-watkins.JPEG",
    },
    {
      id: 2,
      name: "Paul Watkins",
      title: copy.founder2Title,
      bio: copy.founder2Bio,
      image: "/team/paul-watkins-lake.jpg",
    },
    {
      id: 3,
      name: "David Watkins",
      title: copy.founder3Title,
      bio: copy.founder3Bio,
      image: "/team/David.jpg",
    },
    {
      id: 4,
      name: "Dr Michael Alan Watkins",
      title: copy.founder4Title,
      bio: copy.founder4Bio,
      image: "team/MAW-2.JPG",
    },
  ];

  return (
    <div className="min-h-screen bg-accent-50 dark:bg-gray-900">
      {/* Hero Section */}
      {/* <section className="relative py-6 px-6 text-center">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-green-600/10 dark:from-blue-800/20 dark:to-green-800/20"></div>
        <div className="relative max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-gray-800 dark:text-white mb-6">
            {copy.teamTitle}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-light leading-relaxed">
            {copy.teamSubtitle}
          </p>
        </div>
      </section> */}

      {/* Team Section */}
      <section className="py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-orbitron font-bold text-gray-800 dark:text-white mb-4">
              {copy.teamTitle}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {copy.teamSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700"
              >
                <div className="relative mb-6">
                  <div className="w-32 h-32 md:w-36 md:h-36 mx-auto rounded-full bg-gradient-to-br from-accent-400 to-primary-400 p-1">
                    {/* <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-4xl">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="object-cover"
                      />
                    </div> */}
                    <motion.img
                      src={member.image}
                      alt="team"
                      className="w-full h-full rounded-full object-cover  shadow-lg"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
                <h3 className="text-xl font-orbitron font-bold text-center text-gray-800 dark:text-white mb-2">
                  {member.name}
                </h3>
                <p className="text-sm font-medium text-center text-accent-600 dark:text-accent-200 mb-4">
                  {member.title}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed text-center">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-blue-100 dark:border-gray-700">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl font-orbitron font-bold text-gray-800 dark:text-white">
                  {copy.missionTitle}
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                {copy.missionText}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-green-100 dark:border-gray-700">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl font-orbitron font-bold text-gray-800 dark:text-white">
                  {copy.visionTitle}
                </h2>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                {copy.visionText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-orbitron font-bold text-center text-gray-800 dark:text-white mb-12">
            {copy.whatMakesUsSpecial}
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: copy.feature1Title,
                text: copy.feature1Text,
                icon: "⚽",
                image: "/images/journey/week8-tactics.jpeg",
                color: "green",
              },
              {
                title: copy.feature2Title,
                text: copy.feature2Text,
                icon: "🎮",
                image: "/images/hero/hero-clubs.jpg",
                color: "blue",
              },
              {
                title: copy.feature3Title,
                text: copy.feature3Text,
                icon: "🌍",
                image: "/images/journey/week16-goal.webp",
                color: "indigo",
              },
              {
                title: copy.feature4Title,
                text: copy.feature4Text,
                icon: "🗣️",
                image: "/images/journey/week2-laughing.jpeg",
                color: "purple",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="text-center group hover:transform hover:scale-105 transition-all duration-300"
              >
                <div
                  className={`w-24 h-20 mx-auto mb-3 bg-${feature.color}-100 dark:bg-${feature.color}-900 rounded-xl flex items-center justify-center text-4xl group-hover:shadow-lg transition-shadow`}
                >
                  <motion.img
                    src={feature.image}
                    alt="team"
                    className="w-full h-full rounded-xl object-cover  shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                  />
                </div>
                {/* <div
                  className={`w-20 h-20 mx-auto mb-6 bg-${feature.color}-100 dark:bg-${feature.color}-900 rounded-full flex items-center justify-center text-4xl group-hover:shadow-lg transition-shadow`}
                >
                  {feature.icon}
                </div> */}
                <h3 className="text-xl font-orbitron font-semibold text-gray-800 dark:text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-6 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-orbitron font-bold text-center text-gray-800 dark:text-white mb-12">
            {copy.valuesTitle}
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: copy.value1Title, text: copy.value1Text, icon: "🌿" },
              { title: copy.value2Title, text: copy.value2Text, icon: "🎓" },
              // { title: copy.value3Title, text: copy.value3Text, icon: "🌐" },
              { title: copy.value4Title, text: copy.value4Text, icon: "🚀" },
              { title: copy.value5Title, text: copy.value5Text, icon: "" },
            ].map((value, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 p-6 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border-t-2 border-accent-400 hover:transform hover:scale-[1.02] transition-all duration-300"
              >
                {/* <div className="text-3xl flex-shrink-0">{value.icon}</div> */}
                <div>
                  <h3 className="text-xl font-orbitron font-semibold text-gray-800 dark:text-white mb-2">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {value.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      {/* <section className="py-16 px-6 bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-800 dark:to-green-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-orbitron font-bold text-white mb-6">
            {copy.joinUsTitle}
          </h2>
          <p className="text-xl text-blue-100 leading-relaxed mb-8">
            {copy.joinUsText}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-lg">
              {copy.getStartedBtn}
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-blue-600 transform hover:scale-105 transition-all duration-200">
              {copy.contactBtn}
            </button>
          </div>
        </div>
      </section> */}
    </div>
  );
}
