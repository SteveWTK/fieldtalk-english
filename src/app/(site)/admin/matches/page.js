// src/app/(site)/admin/matches/page.js
//
// Admin matches console — one place to:
//   - See matches whose kickoff has passed but haven't been graded
//   - Enter the final score (+ optional first-scorer team) and
//     resolve a match in one click
//   - Spot-check upcoming + already-resolved matches for sanity
//
// Auth: platform_admin only. The /api routes enforce this; we mirror
// the gate client-side so non-admins get a friendly bounce.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";

function AdminMatchesContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = usePlayerProfile(user?.id);

  // Client-side admin gate — server enforces too.
  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.user_type !== "platform_admin") {
      router.replace("/lesson");
    }
  }, [profile, profileLoading, router]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/matches/list");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to load");
      } else {
        setError(null);
        setData(json);
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707] text-white">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to admin
          </Link>
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70 font-semibold mb-1">
            FieldTalk · admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Matches
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-xl leading-relaxed">
            Enter results for finished matches; the system grades every
            user&apos;s picks and awards XP atomically. Already-resolved matches
            at the bottom are read-only.
          </p>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <>
            <Section
              title="Needs result"
              subtitle="Kickoff has passed and these matches haven't been graded yet."
              items={data?.needsResolution || []}
              empty="Nothing waiting — every past match has a result."
              renderItem={(m) => (
                <ResolveForm key={m.id} match={m} onResolved={refresh} />
              )}
            />

            <Section
              title="Upcoming"
              subtitle={`${(data?.upcoming || []).length} match${
                (data?.upcoming || []).length === 1 ? "" : "es"
              } scheduled.`}
              items={data?.upcoming || []}
              empty="No upcoming matches in the schedule."
              renderItem={(m) => <UpcomingRow key={m.id} match={m} />}
            />

            <Section
              title="Recently resolved"
              subtitle="Most recent 20 — for spot-checking."
              items={data?.resolved || []}
              empty="Nothing resolved yet."
              renderItem={(m) => <ResolvedRow key={m.id} match={m} />}
            />
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, subtitle, items, empty, renderItem }) {
  return (
    <section>
      <h2 className="text-base font-bold text-white mb-1">{title}</h2>
      <p className="text-[11px] text-white/50 mb-3">{subtitle}</p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
          {empty}
        </div>
      ) : (
        <div className="space-y-2.5">{items.map(renderItem)}</div>
      )}
    </section>
  );
}

function MatchHeader({ match }) {
  const kickoff = match.kickoff_at
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(match.kickoff_at))
    : "";
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-semibold mb-0.5">
          {match.stage}
        </p>
        <p className="font-bold text-sm text-white truncate">
          {match.home_team} vs {match.away_team}
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-white/50">
        <Calendar className="w-3 h-3" />
        {kickoff}
      </span>
    </div>
  );
}

function ResolveForm({ match, onResolved }) {
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  const [first, setFirst] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Auto-fill first_scorer_team to "none" if the score is 0–0 so
  // the admin doesn't need to pick anything for a draw.
  useEffect(() => {
    if (home === 0 && away === 0 && first === "") {
      setFirst("none");
    }
  }, [home, away, first]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/matches/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: Number(home),
          awayScore: Number(away),
          firstScorerTeam: first || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed");
      } else {
        setResult(json);
        setTimeout(onResolved, 1200);
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-amber-300/40 bg-amber-300/[0.04] p-4"
    >
      <MatchHeader match={match} />

      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end mb-3">
        <NumberField
          label={match.home_team}
          value={home}
          onChange={setHome}
          disabled={submitting}
        />
        <span className="pb-3 text-white/40 font-black text-base">×</span>
        <NumberField
          label={match.away_team}
          value={away}
          onChange={setAway}
          disabled={submitting}
        />
        <FirstScorerSelect
          value={first}
          onChange={setFirst}
          disabled={submitting}
          homeTeam={match.home_team}
          awayTeam={match.away_team}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-200 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result ? (
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4" />
          Resolved · {result.predictionsResolved} picks ·{" "}
          {result.totalXpAwarded} XP · {result.notified} notified
        </div>
      ) : (
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-300 hover:bg-amber-200 disabled:opacity-60 text-[#1a0e00] text-xs font-bold"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Resolving…
            </>
          ) : (
            "Resolve match"
          )}
        </button>
      )}
    </form>
  );
}

function NumberField({ label, value, onChange, disabled }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold truncate mb-1">
        {label}
      </p>
      <input
        type="number"
        min="0"
        max="20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-center font-black text-lg focus:outline-none focus:border-amber-300"
      />
    </div>
  );
}

function FirstScorerSelect({ value, onChange, disabled, homeTeam, awayTeam }) {
  return (
    <div className="w-full">
      <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-1">
        First scorer
      </p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-amber-300"
      >
        <option value="">— optional —</option>
        <option value="home">{homeTeam}</option>
        <option value="away">{awayTeam}</option>
        <option value="none">No goals (0–0)</option>
      </select>
    </div>
  );
}

function UpcomingRow({ match }) {
  const kickoff = match.kickoff_at
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(match.kickoff_at))
    : "";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-semibold mb-0.5">
          {match.stage}
        </p>
        <p className="font-bold text-sm text-white truncate">
          {match.home_team} vs {match.away_team}
        </p>
      </div>
      <span className="shrink-0 text-[11px] text-white/55 inline-flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {kickoff}
      </span>
    </div>
  );
}

function ResolvedRow({ match }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.2em] text-white/45 font-semibold mb-0.5">
          {match.stage}
        </p>
        <p className="font-bold text-sm text-white truncate">
          {match.home_team} {match.home_score}–{match.away_score}{" "}
          {match.away_team}
        </p>
      </div>
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200">
        Resolved
      </span>
    </div>
  );
}

export default function AdminMatchesPage() {
  return (
    <ProtectedRoute>
      <AdminMatchesContent />
    </ProtectedRoute>
  );
}
