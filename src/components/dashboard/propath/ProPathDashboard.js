// src/components/dashboard/propath/ProPathDashboard.js
//
// FieldTalk Pro Path 26/27 dashboard. Deliberately lean — the WC
// dashboard is a fan's storyline (collect, predict, compete); this
// is a serious player's storyline (am I getting better, am I ready
// for the moment I'll need this). Three anchors:
//
//   1. Hero strip — identity + XP + position badge
//   2. Skill Radar (flagship visual) + Trial-Ready score
//   3. Leaderboard
//
// Streak / recent-activity / certificate-download tiles are
// deliberately deferred to a follow-up — every visible tile has to
// earn its place. See the Steve-Jobs philosophy memory for the rule.
//
// Data source: usePlayerDashboard (same hook the WC dashboard uses),
// which now filters lessons + completions to the caller's edition.
// Skill Radar computation lives in useSkillRadar (kept out of this
// component so the tile can be reused / previewed).
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
// import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  ArrowRight,
  BookOpen,
  Gamepad2,
  Trophy,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePlayerDashboard } from "@/lib/hooks/usePlayerData";
import { useSkillRadar } from "@/lib/hooks/useSkillRadar";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import ProfileEditModal from "@/components/ProfileEditModal";
import Leaderboard from "@/components/Leaderboard";
import NotificationsOptIn from "@/components/notifications/NotificationsOptIn";
import NewContentBanner from "@/components/NewContentBanner";
import ProPathSkillRadar from "./ProPathSkillRadar";

// Local copy dictionary — same pattern PredictionsCentreBanner /
// ProPathOnboarding use. Kept in the component file because these
// strings are tightly coupled to this UI and don't need to be shared.
// If any string ends up needed elsewhere, promote it to
// src/locales/{en,pt}.json under a propath_* key.
const COPY = {
  en: {
    backToLessons: "Back to lessons",
    editProfile: "Edit profile",
    heroEyebrow: "Your Training Ground",
    xp: "XP",
    continueLessons: "Continue lessons",
    continueLessonsBody: "Pick up where you left off.",
    gameCentre: "Game Centre",
    gameCentreBody: "Drill vocabulary in short rounds.",
    certificateUnlockedEyebrow: "Certificate unlocked",
    certificateUnlockedTitle: "You're Trial-Ready",
    certificateUnlockedBody:
      "All 6 areas started. Your Pro Path 26/27 certificate is ready to download.",
    certificateDownload: "Download certificate",
    certificatePlaceholderAlert: "Certificate download coming soon!",
  },
  pt: {
    backToLessons: "Voltar às aulas",
    editProfile: "Editar perfil",
    heroEyebrow: "Seu Centro de Treinamento",
    xp: "XP",
    continueLessons: "Continuar aulas",
    continueLessonsBody: "Retome de onde parou.",
    gameCentre: "Game Centre",
    gameCentreBody: "Pratique vocabulário em rodadas rápidas.",
    certificateUnlockedEyebrow: "Certificado desbloqueado",
    certificateUnlockedTitle: "Você está Pronto para Peneiras",
    certificateUnlockedBody:
      "Todas as 6 áreas iniciadas. Seu certificado Pro Path 26/27 já pode ser baixado.",
    certificateDownload: "Baixar certificado",
    certificatePlaceholderAlert: "Certificado em desenvolvimento — em breve!",
  },
};

export default function ProPathDashboard() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.en;
  const { profile, progress, lessons, completions, loading, refetchProgress } =
    usePlayerDashboard(user?.id);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileOverride, setProfileOverride] = useState({
    full_name: null,
    avatar_url: null,
  });

  // Flatten every pillar's lessons into one array for the radar hook.
  // Kept flat because skill_axes are per-lesson, not per-pillar — a
  // "Media" lesson can live under any pillar and still contribute to
  // the Media axis.
  const allLessons = useMemo(() => {
    const out = [];
    for (const arr of Object.values(lessons || {})) {
      if (Array.isArray(arr)) out.push(...arr);
    }
    return out;
  }, [lessons]);

  const radar = useSkillRadar(allLessons, completions);

  // Identity strings — profile override wins for instant post-edit
  // updates (same pattern the WC dashboard uses).
  const fullName =
    (profileOverride.full_name ?? profile?.full_name) ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Player";
  const avatarUrl = profileOverride.avatar_url ?? profile?.avatar_url ?? "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  // Position is authoritative from Pro Path onboarding →
  // players.position only. We deliberately DON'T fall back to
  // user.user_metadata.position: legacy signup screens seeded that
  // field with a hard-coded "Forward" default, which would then show
  // up as the user's position even when they'd explicitly picked
  // "Not sure yet" on the onboarding. If profile.position is null,
  // the hero simply hides the badge — honest empty state beats
  // showing wrong data.
  const position = profile?.position || null;
  const totalXp = progress?.total_xp || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      {/* Ambient glows — lime + slate to match the /propath landing
          identity. Kept subtle so the tiles carry the visual weight. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(163,230,53,0.14), rgba(163,230,53,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full blur-3xl opacity-50"
          style={{
            background:
              "radial-gradient(circle at center, rgba(148,163,184,0.10), rgba(148,163,184,0) 70%)",
          }}
        />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Top nav row */}
        <div className="flex items-center justify-between">
          <Link
            href="/lesson"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {copy.backToLessons}
          </Link>
        </div>

        {/* New content notification banner (shared with WC) */}
        <NewContentBanner />

        {/* Push opt-in — self-nulls when browser doesn't support push,
            user's already opted in, or dismissed in last 7 days. */}
        <NotificationsOptIn />

        {/* ── Hero strip ─────────────────────────────────────────── */}
        <section className="rounded-3xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              aria-label={copy.editProfile}
              className="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 ring-2 ring-white/15 hover:ring-accent-400 transition-shadow"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={fullName}
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent-500 to-accent-300 flex items-center justify-center text-primary-900 font-black text-xl">
                  {initials || "•"}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary-800 border-2 border-[#070707] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="w-3 h-3 text-white/80" />
              </span>
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300/80 font-bold">
                {copy.heroEyebrow}
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate mt-0.5">
                {fullName}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {position && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent-400/15 border border-accent-400/30 text-accent-200 text-[11px] font-bold uppercase tracking-wider">
                    {position}
                  </span>
                )}
                <span className="text-xs text-white/55 tabular-nums">
                  {totalXp.toLocaleString()} {copy.xp}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Skill Radar — the flagship visual ─────────────────── */}
        <ProPathSkillRadar
          perAxis={radar.perAxis}
          trialReadyPct={radar.trialReadyPct}
          axesWithProgress={radar.axesWithProgress}
          lang={lang}
          lessonHref="/lesson"
        />

        {/* ── Quick links row ──────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <QuickLink
            href="/lesson"
            Icon={BookOpen}
            title={copy.continueLessons}
            body={copy.continueLessonsBody}
          />
          <QuickLink
            href="/games"
            Icon={Gamepad2}
            title={copy.gameCentre}
            body={copy.gameCentreBody}
          />
        </div>

        {/* ── Leaderboard ─────────────────────────────────────── */}
        <div>
          <Leaderboard defaultSort="xp" />
        </div>

        {/* Trial-Ready badge (celebratory) — only when unlocked. Keeps
            the dashboard focused when the milestone isn't hit yet. */}
        {radar.trialReady && (
          <section className="rounded-3xl bg-gradient-to-br from-accent-400/[0.15] via-accent-400/[0.08] to-transparent border border-accent-400/40 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent-400/25 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-accent-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300 font-bold">
                  {copy.certificateUnlockedEyebrow}
                </p>
                <h3 className="text-lg font-black mt-1">
                  {copy.certificateUnlockedTitle}
                </h3>
                <p className="text-sm text-white/75 mt-1 leading-relaxed">
                  {copy.certificateUnlockedBody}
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 transition-colors"
                  onClick={() => {
                    // TODO(propath): wire certificate download endpoint.
                    // Empty click keeps the hook obvious in UI; not
                    // showing the button pre-implementation would hide
                    // the emotional payoff from users who earned it.
                    alert(copy.certificatePlaceholderAlert);
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {copy.certificateDownload}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      <ProfileEditModal
        open={profileModalOpen}
        initialName={fullName}
        initialAvatarUrl={avatarUrl}
        onClose={() => setProfileModalOpen(false)}
        onSaved={(next) => {
          setProfileOverride({
            full_name: next.full_name ?? "",
            avatar_url: next.avatar_url ?? "",
          });
          refetchProgress?.();
        }}
      />
    </div>
  );
}

function QuickLink({ href, Icon, title, body }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 hover:border-accent-400/40 p-4 transition-colors"
    >
      <div className="w-10 h-10 rounded-xl bg-accent-400/15 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-accent-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white truncate">{title}</p>
        <p className="text-[11px] text-white/55 leading-relaxed truncate">
          {body}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-accent-300 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}
