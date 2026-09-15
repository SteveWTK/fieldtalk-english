// src/components/HeaderBase.js
//
// The Global Player header. Two variants behind the existing `type`
// prop (kept for compatibility with landing + site routes):
//   type="landing" → marketing-nav items (Lessons, Dashboard,
//                    About, Pricing)
//   type="site"    → in-app nav items (Lessons, Dashboard,
//                    Vocabulary, Mental, Pricing)
//
// Both variants render the same visual language per the design
// system (docs/brand/handoff/HANDOFF.md §3):
//
//   - Dark panel background `#0b1220`, 1px `#1e293b` bottom hairline
//   - No frost/blur, no shadow
//   - Open-bars mark (22px) + wordmark "GLOBAL PLAYER" in Archivo
//     900, 15px, 0.15em tracking, primary-50
//   - Active nav item: primary-50 text + 2px accent-400 underline
//     placed 4px below the label. Inactive: primary-400.
//   - Locale switcher: pill, 1px primary-700 border, primary-500 text
//   - Dark mode is the default; the light toggle is preserved for
//     the eventual club-portal / white-label surface.
//
// All auth / profile / locale / dark-mode / mobile-menu logic from
// the previous header is preserved verbatim — only visual styling
// and the logo lockup have changed.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Menu, X, ShieldCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useState } from "react";
import PartnerLogo from "@/components/branding/PartnerLogo";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";
import { usePlayerAccess } from "@/lib/access/usePlayerAccess";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";
import { PRODUCT_NAME } from "@/lib/brand/name";

// `darkMode` / `setDarkMode` used to be part of this signature; the
// toggle has been removed per the design-system rule ("dark is the
// default; light is a deliberate swap for white-label / club portal
// surfaces"). Existing callers that still pass those props keep
// working — unknown props are simply ignored by React function
// components. When the club portal ships, that surface renders its
// own light header instead of reusing this one via a runtime flag.
function HeaderBase({
  type = "landing",
  lang,
  setLang,
  languageOptions,
}) {
  const { user, signOut } = useAuth();
  const { profile } = usePlayerProfile(user?.id);
  // Subtle nav-bar Full Access indicator — a small emerald shield next
  // to the user's name for subscribers. Uses their profile edition
  // (matches the dashboard hero's badge logic). Silent for free-tier
  // users and while the access check is loading.
  const access = usePlayerAccess(profile?.edition);
  const hasFullAccess = !access.loading && access.hasAccess;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const localizedLinks = {
    landing: {
      en: [
        { href: "/lesson", label: "Lessons" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/about-us", label: "About" },
        { href: "/pricing", label: "Pricing" },
      ],
      pt: [
        { href: "/lesson", label: "Aulas" },
        { href: "/dashboard", label: "Painel" },
        { href: "/about-us", label: "Sobre" },
        { href: "/pricing", label: "Valores" },
      ],
      es: [
        { href: "/lesson", label: "Lecciones" },
        { href: "/dashboard", label: "Panel" },
        { href: "/about-us", label: "Sobre" },
        { href: "/pricing", label: "Precios" },
      ],
    },
    site: {
      en: [
        { href: "/lesson", label: "Lessons" },
        { href: "/dashboard", label: "Dashboard" },
        { href: "/vocabulary", label: "Vocabulary" },
        { href: "/mental", label: "Mental" },
        { href: "/pricing", label: "Pricing" },
      ],
      pt: [
        { href: "/lesson", label: "Aulas" },
        { href: "/dashboard", label: "Painel" },
        { href: "/vocabulary", label: "Vocabulário" },
        { href: "/mental", label: "Mental" },
        { href: "/pricing", label: "Valores" },
      ],
      es: [
        { href: "/lesson", label: "Lecciones" },
        { href: "/dashboard", label: "Panel" },
        { href: "/vocabulary", label: "Vocabulario" },
        { href: "/mental", label: "Mental" },
        { href: "/pricing", label: "Precios" },
      ],
      fr: [
        { href: "/lesson", label: "Leçons" },
        { href: "/dashboard", label: "Tableau" },
        { href: "/vocabulary", label: "Vocabulaire" },
        { href: "/mental", label: "Mental" },
        { href: "/pricing", label: "Prix" },
      ],
    },
  };

  const t = {
    en: { signIn: "Sign in", signOut: "Sign out", profile: "Profile" },
    pt: { signIn: "Entrar", signOut: "Sair", profile: "Perfil" },
    es: { signIn: "Entrar", signOut: "Salir", profile: "Perfil" },
    fr: { signIn: "Se connecter", signOut: "Se déconnecter", profile: "Profil" },
  };

  const copy = t[lang] || t.en;
  const rawLinks =
    localizedLinks[type]?.[lang] || localizedLinks[type]?.en || [];
  const links = rawLinks;

  /**
   * A nav item is "active" when the current path starts with its href.
   * Exact matching would break on nested routes (e.g. /lesson/123
   * wouldn't highlight "Lessons"). Special-cased "/" — otherwise every
   * route would show "Home" as active.
   */
  const isActive = (href) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleSignOut = async () => {
    await signOut();
    closeMobileMenu();
  };

  // Panel colour = design-system panel `#0b1220`. Inline hex — this
  // is the canonical single use in product chrome, no need to
  // token-ize until the DS `--gp-bg-panel` variable is wired in.
  const headerStyle = {
    backgroundColor: "#0b1220",
    borderBottom: "1px solid #1e293b",
  };

  return (
    <>
      <header className="sticky top-0 z-50" style={headerStyle}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + wordmark. The wordmark is the type — Archivo
                900 uppercase tracked 0.15em — set in primary-50 so
                it holds contrast on the dark panel. Sits at a fixed
                size so it doesn't compete with page content. */}
            <Link
              href="/lesson"
              className="flex items-center gap-2.5"
              aria-label={PRODUCT_NAME}
            >
              <GlobalPlayerLogo variant="open" tone="tonalDark" size={22} />
              <span
                className="font-display font-black text-primary-50 uppercase tracking-wordmark whitespace-nowrap"
                style={{ fontSize: "15px" }}
              >
                {PRODUCT_NAME}
              </span>
              {/* Partner logo placement — sits beside the wordmark for
                  users whose branch has placements.siteHeader = true
                  in branches.js. Returns null for everyone else. */}
              <PartnerLogo
                placement="siteHeader"
                profile={profile}
                size="xs"
                className="ml-2"
              />
            </Link>

            {/* Desktop nav — no pills, no rounded backgrounds. Each
                item is text with an accent-400 2px underline when
                active. Muted (primary-400) at rest; primary-50 on
                hover and when active. Underline sits 4px below the
                text baseline. */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              {links.map(({ href, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`text-sm font-medium transition-colors pb-1 border-b-2 ${
                      active
                        ? "text-primary-50 border-accent-400"
                        : "text-primary-400 border-transparent hover:text-primary-50"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop right side — auth + locale + dark toggle. */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/lesson"
                    className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline font-medium">
                      {user.user_metadata?.full_name?.split(" ")[0] ||
                        user.email?.split("@")[0] ||
                        copy.profile}
                    </span>
                    {hasFullAccess && (
                      <ShieldCheck
                        className="w-4 h-4 text-emerald-400 shrink-0"
                        aria-label="Full Access"
                      />
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-sm text-primary-400 hover:text-primary-50 transition-colors"
                  >
                    {copy.signOut}
                  </button>
                </div>
              ) : (
                <Link
                  href="/signin"
                  className="text-sm font-medium text-primary-400 hover:text-primary-50 transition-colors"
                >
                  {copy.signIn}
                </Link>
              )}

              {/* Locale switcher pill — 1px primary-700 border, small
                  primary-500 text. Native <select> for zero-JS
                  reliability + accessibility. */}
              {languageOptions && (
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="rounded-full border border-primary-700 bg-transparent px-3 py-1 text-xs font-medium text-primary-500 hover:text-primary-300 focus:outline-none focus:border-primary-500 transition-colors cursor-pointer"
                >
                  {Object.entries(languageOptions).map(([code, { label }]) => (
                    <option
                      key={code}
                      value={code}
                      className="bg-primary-800 text-primary-50"
                    >
                      {label}
                    </option>
                  ))}
                </select>
              )}

            </div>

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-primary-400 hover:text-primary-50 transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation — panel below the header, dark to match.
          No shadow, hairline top border. */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-40 md:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <div
            className="fixed top-16 left-0 right-0 z-40 md:hidden"
            style={{
              backgroundColor: "#0b1220",
              borderBottom: "1px solid #1e293b",
            }}
          >
            <div className="max-w-7xl mx-auto px-4 py-6">
              <nav className="space-y-1 mb-4">
                {links.map(({ href, label }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={closeMobileMenu}
                      className={`block py-2.5 px-3 rounded-lg text-base font-medium transition-colors ${
                        active
                          ? "text-primary-50 bg-white/[0.04]"
                          : "text-primary-400 hover:text-primary-50 hover:bg-white/[0.02]"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-primary-700 pt-4 mb-4">
                {user ? (
                  <div className="space-y-2">
                    <Link
                      href="/lesson"
                      className="flex items-center gap-3 py-2 px-3 rounded-lg text-primary-50"
                      onClick={closeMobileMenu}
                    >
                      <User className="w-5 h-5 text-primary-400" />
                      <span className="text-base font-medium">
                        {user.user_metadata?.full_name ||
                          user.email?.split("@")[0] ||
                          copy.profile}
                      </span>
                      {hasFullAccess && (
                        <ShieldCheck className="w-4 h-4 text-emerald-400 ml-auto" />
                      )}
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block w-full text-left py-2 px-3 rounded-lg text-base text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      {copy.signOut}
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/signin"
                    className="block py-2 px-3 rounded-lg text-base font-medium text-primary-50"
                    onClick={closeMobileMenu}
                  >
                    {copy.signIn}
                  </Link>
                )}
              </div>

              {languageOptions && (
                <div className="border-t border-primary-700 pt-4">
                  <label className="block text-[10px] uppercase tracking-eyebrow text-primary-500 font-semibold mb-1.5">
                    Language
                  </label>
                  <select
                    value={lang}
                    onChange={(e) => setLang(e.target.value)}
                    className="w-full rounded-lg border border-primary-700 bg-transparent px-3 py-2 text-sm text-primary-50 focus:outline-none focus:border-primary-500"
                  >
                    {Object.entries(languageOptions).map(
                      ([code, { label, flag }]) => (
                        <option
                          key={code}
                          value={code}
                          className="bg-primary-800"
                        >
                          {flag} {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default HeaderBase;
