// src/app/(site)/admin/page.js
//
// Platform admin hub. Single dark-themed page that surfaces every
// admin tool as a clearly-labelled card so the FieldTalk team can
// navigate without remembering URLs.
//
// Cards are grouped loosely by purpose:
//   - Engagement     (User tracking)
//   - Partner access (Seat licences generate + dashboard, Promo
//                     codes, QR campaigns)
//   - Content        (Lessons CMS, Predictions resolution)
//   - Organisations  (Schools, Academies & clubs)
//
// Live counts where cheap to fetch (schools, academies) — gives
// the admin a quick "are we still hooked up correctly" pulse.
//
// Auth: platform_admin only (server-enforced by every admin route
// the cards link to; we mirror the check client-side so the page
// itself only renders for admins).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users2,
  KeyRound,
  BarChart3,
  Tag,
  BookOpen,
  Target,
  Swords,
  School,
  Trophy,
  QrCode,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";
import { getAllSchools } from "@/lib/supabase/schools-queries";
import { getAllAcademies } from "@/lib/supabase/academies-queries";

function AdminHubContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = usePlayerProfile(user?.id);

  // Client-side admin gate — server enforces the same; this is just
  // so the page doesn't render its UI for non-admins.
  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.user_type !== "platform_admin") {
      router.replace("/lesson");
    }
  }, [profile, profileLoading, router]);

  // Light count-up of the two existing organisation tables so the
  // matching cards show a live signal. Failure is non-fatal —
  // we just render "—" if either fetch hiccups.
  const [counts, setCounts] = useState({ schools: null, academies: null });
  useEffect(() => {
    if (profileLoading || profile?.user_type !== "platform_admin") return;
    let cancelled = false;
    (async () => {
      try {
        const [schools, academies] = await Promise.all([
          getAllSchools().catch(() => []),
          getAllAcademies().catch(() => []),
        ]);
        if (cancelled) return;
        setCounts({
          schools: Array.isArray(schools) ? schools.length : 0,
          academies: Array.isArray(academies) ? academies.length : 0,
        });
      } catch {
        if (!cancelled) setCounts({ schools: 0, academies: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, profileLoading]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707] text-white">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10">
        <header>
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70 font-semibold mb-1">
            FieldTalk
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Platform admin
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            Every admin tool in one place. Pick the section you need — the cards
            link straight in.
          </p>
        </header>

        <AdminSection title="Engagement & partners">
          <AdminCard
            href="/admin/users"
            Icon={Users2}
            title="User tracking"
            body="Live engagement snapshot — power users, lesson drop-off, recent activity."
            accent="emerald"
          />
          <AdminCard
            href="/admin/seat-licenses"
            Icon={KeyRound}
            title="Seat licences"
            body="Bulk-generate Full Access codes for partner schools and PIX cohorts."
            accent="amber"
          />
          <AdminCard
            href="/admin/seat-licenses/dashboard"
            Icon={BarChart3}
            title="Seat usage"
            body="Per-partner billing roll-up of seat redemptions."
            accent="amber"
          />
          <AdminCard
            href="/admin/promo-codes"
            Icon={Tag}
            title="Promo codes"
            body="Bulk-generate single-use Stripe discount codes for partner cohorts."
            accent="emerald"
          />
          <AdminCard
            href="/admin/qr-campaigns"
            Icon={QrCode}
            title="QR campaigns"
            body="QR-driven guest access campaigns and partner attribution."
            accent="neutral"
          />
        </AdminSection>

        <AdminSection title="Content">
          <AdminCard
            href="/admin/lessons"
            Icon={BookOpen}
            title="Lessons CMS"
            body="Author, edit and order lesson content across pillars."
            accent="neutral"
          />
          <AdminCard
            href="/admin/matches"
            Icon={Swords}
            title="Matches"
            body="Enter match results — system grades every user's picks atomically."
            accent="emerald"
          />
          <AdminCard
            href="/admin/predictions"
            Icon={Target}
            title="Lesson predictions"
            body="Resolve lesson-embedded group-finish predictions."
            accent="neutral"
          />
        </AdminSection>

        <AdminSection title="Organisations">
          <AdminCard
            href="/admin/schools"
            Icon={School}
            title="Schools"
            body="Manage partner schools, classes, teachers and students."
            accent="neutral"
            meta={
              counts.schools === null
                ? null
                : `${counts.schools} school${counts.schools === 1 ? "" : "s"}`
            }
          />
          <AdminCard
            href="/admin/academies"
            Icon={Trophy}
            title="Academies & clubs"
            body="Manage football academies, clubs and players."
            accent="neutral"
            meta={
              counts.academies === null
                ? null
                : `${counts.academies} academ${counts.academies === 1 ? "y" : "ies"}`
            }
          />
        </AdminSection>
      </main>
    </div>
  );
}

function AdminSection({ title, children }) {
  return (
    <section>
      <h2 className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {children}
      </div>
    </section>
  );
}

function AdminCard({
  href,
  Icon,
  title,
  body,
  accent = "neutral",
  meta = null,
}) {
  // Three subtle accent tones so the cards visually group by purpose
  // (emerald = engagement / paid flow, amber = partner-issued access,
  // neutral = content / organisations). Tasteful gradient, not loud.
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/30 hover:border-emerald-300/60 hover:bg-emerald-500/[0.04]"
      : accent === "amber"
        ? "border-amber-300/30 hover:border-amber-300/60 hover:bg-amber-300/[0.04]"
        : "border-white/10 hover:border-white/25 hover:bg-white/[0.04]";
  const iconBg =
    accent === "emerald"
      ? "bg-emerald-500/15 text-emerald-300"
      : accent === "amber"
        ? "bg-amber-300/15 text-amber-200"
        : "bg-white/[0.06] text-white/75";

  return (
    <Link
      href={href}
      className={`group block rounded-2xl bg-white/[0.03] border ${accentClass} p-5 transition-colors`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base text-white truncate">{title}</h3>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <p className="text-xs sm:text-sm text-white/55 mt-1 leading-relaxed">
            {body}
          </p>
          {meta && (
            <p className="text-[11px] text-white/35 mt-2 font-semibold tabular-nums">
              {meta}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function PlatformAdminDashboard() {
  return (
    <ProtectedRoute>
      <AdminHubContent />
    </ProtectedRoute>
  );
}
