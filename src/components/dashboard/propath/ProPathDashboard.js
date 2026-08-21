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

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
// import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  ArrowRight,
  Gamepad2,
  Trophy,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePlayerDashboard } from "@/lib/hooks/usePlayerData";
import { useSkillRadar } from "@/lib/hooks/useSkillRadar";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { listResumes } from "@/lib/lessons/resume";
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
    // Level-aware certificate copy. Functions interpolate the level
    // number so a Level-2 unlock reads "Level 2 complete" without
    // needing separate keys per level.
    certificateUnlockedEyebrow: (level) => `Level ${level} complete`,
    certificateUnlockedTitle: (level) =>
      `Your Pro Path Level ${level} certificate`,
    certificateUnlockedBody:
      "Every skill mastered at this level. Time to celebrate — and to keep going into the next 4 units.",
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
    certificateUnlockedEyebrow: (level) => `Nível ${level} concluído`,
    certificateUnlockedTitle: (level) =>
      `Seu certificado Pro Path Nível ${level}`,
    certificateUnlockedBody:
      "Todas as habilidades dominadas neste nível. Hora de celebrar — e seguir para as próximas 4 unidades.",
    certificateDownload: "Baixar certificado",
    certificatePlaceholderAlert: "Certificado em desenvolvimento — em breve!",
  },
};

export default function ProPathDashboard() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.en;
  const {
    profile,
    progress,
    pillars,
    lessons,
    completions,
    loading,
    refetchProgress,
  } = usePlayerDashboard(user?.id);

  // Mid-lesson resume — reads localStorage so a user who left a lesson
  // partway through (e.g. to open the dashboard) can pick up EXACTLY
  // where they left off. Recomputed once per mount + user change; the
  // radar detail strip prefers this over the "first uncompleted lesson"
  // fallback when both exist.
  const [pendingResume, setPendingResume] = useState(null);
  useEffect(() => {
    if (!user?.id) {
      setPendingResume(null);
      return;
    }
    setPendingResume(listResumes(user.id)[0] || null);
  }, [user?.id]);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  // Local overrides drive instant UI feedback after the modal saves,
  // without waiting for a full profile refetch. `undefined` means "no
  // override yet — fall through to the fetched profile"; `null` on
  // position means the user picked "Not sure yet" (badge hides).
  const [profileOverride, setProfileOverride] = useState({
    full_name: null,
    avatar_url: null,
    position: undefined,
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

  // Deep-link to lessons: point the "Back to lessons" CTA at the
  // user's most-recently completed lesson (via ?completed=<id>) so
  // the lesson index auto-opens the right pillar and highlights the
  // next lesson. Matches the WC edition's post-completion routing.
  // Falls back to plain /lesson (survival pillar default) when the
  // user hasn't completed anything yet.
  const lessonsHref = useMemo(() => {
    if (!Array.isArray(completions) || completions.length === 0) {
      return "/lesson";
    }
    const last = completions[0];
    const id = last?.lessons?.id ?? last?.lesson_id;
    return id ? `/lesson?completed=${encodeURIComponent(id)}` : "/lesson";
  }, [completions]);

  // Compute the user's actual "next lesson" for the Skill Radar detail
  // strip. Two-tier resolution:
  //   1. If there's a pending mid-lesson resume in localStorage AND
  //      the underlying lesson still exists on the user's edition,
  //      that's the next lesson (they left it partway through — pick
  //      up where they left off).
  //   2. Otherwise, walk pillars in sort_order → lessons in sort_order
  //      → first lesson NOT in completions. This mirrors the actual
  //      progression path a user follows in the lesson index.
  //
  // Returns null when the user has finished every lesson (nothing
  // "next"), or when data is still loading. Consumers show the strip
  // gracefully in either case (SkillRadarDetail's empty branch).
  const nextLessonInfo = useMemo(() => {
    if (!pillars || pillars.length === 0) return null;
    const completedIds = new Set(
      (completions || [])
        .map((c) => c?.lessons?.id ?? c?.lesson_id)
        .filter(Boolean),
    );

    // Build a fast lesson-by-id lookup for the resume-match path.
    const lessonById = new Map();
    for (const p of pillars) {
      for (const l of p.lessons || []) {
        if (l?.id) lessonById.set(l.id, l);
      }
    }

    // Tier 1: honour a fresh mid-lesson resume if the lesson still
    // exists (edition switches / lesson unpublishes would leave a
    // stale resume; we ignore it if the lesson is gone).
    if (pendingResume?.lessonId) {
      const resumeLesson = lessonById.get(pendingResume.lessonId);
      if (resumeLesson) {
        return buildLessonInfo(resumeLesson, {
          isResume: true,
          resumeStep: pendingResume.currentStep,
        });
      }
    }

    // Tier 2: walk in sort order for the first uncompleted lesson.
    const sortedPillars = [...pillars].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
    );
    for (const pillar of sortedPillars) {
      const orderedLessons = [...(pillar.lessons || [])].sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
      );
      for (const lesson of orderedLessons) {
        if (!completedIds.has(lesson.id)) {
          return buildLessonInfo(lesson, { isResume: false });
        }
      }
    }

    return null;
  }, [pillars, completions, pendingResume]);

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
  //
  // Override wins over the fetched profile so the hero updates
  // instantly after the ProfileEditModal saves — no wait for a
  // profile refetch. `undefined` on override means "use fetched
  // value"; `null` means "user explicitly cleared it".
  const position =
    profileOverride.position !== undefined
      ? profileOverride.position
      : profile?.position || null;
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
            href={lessonsHref}
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
          currentLevel={radar.currentLevel}
          levelPct={radar.levelPct}
          axesFullyPassed={radar.axesFullyPassed}
          totalPassedInLevel={radar.totalPassedInLevel}
          totalPossibleInLevel={radar.totalPossibleInLevel}
          certificateReady={radar.certificateReady}
          lang={lang}
          lessonHref={lessonsHref}
          nextLessonInfo={nextLessonInfo}
        />

        {/* ── Game Centre quick link ───────────────────────────
             "Continue lessons" was removed here because the Skill
             Radar's detail strip now IS the "next lesson" link —
             having two competing CTAs muddled the visual hierarchy
             and buried the strip's clickability. Game Centre stays
             as a separate, distinct entry point. */}
        <QuickLink
          href="/games"
          Icon={Gamepad2}
          title={copy.gameCentre}
          body={copy.gameCentreBody}
        />

        {/* ── Leaderboard ─────────────────────────────────────── */}
        <div>
          <Leaderboard defaultSort="xp" />
        </div>

        {/* Certificate-unlocked hero — fires when radar.certificateReady
            is true (every axis has all 4 segments passed in the
            current Level). The radar tile shows a subtle inline
            confirmation; this section is the celebration moment
            with a real download CTA. */}
        {radar.certificateReady && (
          <section className="rounded-3xl bg-gradient-to-br from-accent-400/[0.15] via-accent-400/[0.08] to-transparent border border-accent-400/40 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent-400/25 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6 text-accent-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300 font-bold">
                  {copy.certificateUnlockedEyebrow(radar.currentLevel)}
                </p>
                <h3 className="text-lg font-black mt-1">
                  {copy.certificateUnlockedTitle(radar.currentLevel)}
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
        initialPosition={position}
        showPositionPicker={true}
        onClose={() => setProfileModalOpen(false)}
        onSaved={(next) => {
          setProfileOverride((prev) => ({
            ...prev,
            full_name: next.full_name ?? "",
            avatar_url: next.avatar_url ?? "",
            // Only overwrite the override when the modal actually
            // sent back a position field (Pro Path save path). If
            // the modal was opened by a caller who didn't touch
            // position, prev.position stays as it was.
            ...(next.position !== undefined
              ? { position: next.position }
              : {}),
          }));
          refetchProgress?.();
        }}
      />
    </div>
  );
}

/**
 * Shape a lesson row into the minimal payload the radar's detail
 * strip needs: id (for the link), title, sort_order (for "Aula N"),
 * primary skill axis (for the icon + label), maxXp (for the "passes
 * at" hint), plus flags for the resume case.
 */
function buildLessonInfo(lesson, { isResume, resumeStep } = {}) {
  if (!lesson) return null;
  const axes = Array.isArray(lesson.skill_axes) ? lesson.skill_axes : [];
  return {
    id: lesson.id,
    title: lesson.title || "",
    sortOrder: Number(lesson.sort_order) || 1,
    primaryAxisId: axes[0] || null,
    maxXp: Number(lesson.max_xp) || 0,
    isResume: Boolean(isResume),
    resumeStep:
      typeof resumeStep === "number" && Number.isFinite(resumeStep)
        ? resumeStep
        : null,
  };
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
