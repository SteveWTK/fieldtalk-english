// src/components/HeaderBase.js
"use client";

import Link from "next/link";
import { Globe, Moon, Sun, User } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

function HeaderBase({
  type = "landing",
  darkMode,
  setDarkMode,
  lang,
  setLang,
  languageOptions,
}) {
  const { data: session } = useSession();

  const localizedLinks = {
    landing: {
      en: [
        { href: "#features", label: "Features" },
        { href: "#demo", label: "Demo" },
        { href: "#contact", label: "Contact" },
        { href: "/dashboard", label: "Dashboard" },
      ],
      pt: [
        { href: "#features", label: "Recursos" },
        { href: "#demo", label: "Demo" },
        { href: "#contact", label: "Contato" },
        { href: "/dashboard", label: "Painel" },
      ],
      es: [
        { href: "#features", label: "Características" },
        { href: "#demo", label: "Demo" },
        { href: "#contact", label: "Contacto" },
        { href: "/dashboard", label: "Panel" },
      ],
      fr: [
        { href: "#features", label: "Fonctionnalités" },
        { href: "#demo", label: "Démo" },
        { href: "#contact", label: "Contact" },
        { href: "/dashboard", label: "Tableau de bord" },
      ],
    },
    site: {
      en: [
        { href: "/", label: "Home" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/lesson", label: "Lessons" },
        { href: "/admin", label: "Admin" },
      ],
      pt: [
        { href: "/", label: "Início" },
        { href: "/dashboard", label: "Painel" },
        { href: "/lesson", label: "Lições" },
        { href: "/admin", label: "Admin" },
      ],
      es: [
        { href: "/", label: "Inicio" },
        { href: "/dashboard", label: "Panel" },
        { href: "/lesson", label: "Lecciones" },
        { href: "/admin", label: "Admin" },
      ],
      fr: [
        { href: "/", label: "Accueil" },
        { href: "/dashboard", label: "Tableau de bord" },
        { href: "/lesson", label: "Leçons" },
        { href: "/admin", label: "Admin" },
      ],
    },
  };

  const t = {
    en: {
      signIn: "Sign In",
      signOut: "Sign Out",
      profile: "Profile",
    },
    pt: {
      signIn: "Entrar",
      signOut: "Sair",
      profile: "Perfil",
    },
    es: {
      signIn: "Iniciar Sesión",
      signOut: "Cerrar Sesión",
      profile: "Perfil",
    },
    fr: {
      signIn: "Se connecter",
      signOut: "Se déconnecter",
      profile: "Profil",
    },
  };

  const copy = t[lang] || t.en;
  const links = localizedLinks[type]?.[lang] || localizedLinks[type]?.en || [];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold font-display bg-gradient-to-r from-blue-600 to-green-500 bg-clip-text text-transparent">
              FieldTalk English
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-6">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side controls */}
          <div className="flex items-center space-x-4">
            {/* Auth Section */}
            {session?.user ? (
              <div className="flex items-center space-x-3">
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline font-medium">
                    {session.user.name?.split(" ")[0] || copy.profile}
                  </span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  {copy.signOut}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                {copy.signIn}
              </Link>
            )}

            {/* Language Selector */}
            {languageOptions && (
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm border border-gray-300 dark:border-gray-600 transition-colors"
              >
                {Object.entries(languageOptions).map(
                  ([code, { label, flag }]) => (
                    <option key={code} value={code}>
                      {flag} {label}
                    </option>
                  )
                )}
              </select>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default HeaderBase;
