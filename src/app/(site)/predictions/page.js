// src/app/(site)/predictions/page.js
//
// Match Predictions Centre — the user-facing page where players see
// upcoming WC2026 matches and submit their picks. Linked from the
// dashboard banner and from push notifications.
//
// Auth: signed-in only (ProtectedRoute). The list API enforces
// the same — this is just for a friendlier bounce.
//
// Two tabs: Upcoming (predictable now, plus locked/awaiting matches
// you've already picked on) and Results (resolved matches with
// your scoreline of correct/wrong picks + XP earned).
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Trophy, Sparkles, Loader2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { getPredictionsCopy } from "@/lib/predictions/copy";
import MatchCard from "@/components/predictions/MatchCard";

function PredictionsCentreContent() {
  const { lang } = useLanguage();
  const copy = getPredictionsCopy(lang);

  const [data, setData] = useState(null); // { upcoming, results, now }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("upcoming");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/match-predictions/list");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to load");
        setData(null);
      } else {
        setError(null);
        setData(json);
      }
    } catch (err) {
      setError(err?.message || "Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upcoming = data?.upcoming || [];
  const results = data?.results || [];

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      {/* Ambient glows match the dashboard / pricing aesthetic. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.18), rgba(16,185,129,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full blur-3xl opacity-50"
          style={{
            background:
              "radial-gradient(circle at center, rgba(234,179,8,0.10), rgba(234,179,8,0) 70%)",
          }}
        />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            {copy.cta.backToDashboard}
          </Link>
        </div>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-2">
            {copy.pageEyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {copy.pageTitle}
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            {copy.pageSubtitle}
          </p>
        </header>

        <Tabs
          tab={tab}
          setTab={setTab}
          upcomingCount={upcoming.length}
          resultsCount={results.length}
          copy={copy}
        />

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : tab === "upcoming" ? (
          upcoming.length === 0 ? (
            <EmptyState
              icon={<Trophy className="w-6 h-6 text-emerald-300" />}
              title={copy.emptyUpcomingTitle}
              body={copy.emptyUpcomingBody}
            />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {upcoming.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  mode="upcoming"
                  copy={copy}
                  lang={lang}
                  onSaved={refresh}
                />
              ))}
            </div>
          )
        ) : results.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6 text-amber-300" />}
            title={copy.emptyResultsTitle}
            body={copy.emptyResultsBody}
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {results.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                mode="resolved"
                copy={copy}
                lang={lang}
                onSaved={refresh}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Tabs({ tab, setTab, upcomingCount, resultsCount, copy }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-5 sm:mb-6 w-fit">
      <TabButton
        active={tab === "upcoming"}
        onClick={() => setTab("upcoming")}
      >
        {copy.tabUpcoming}
        {upcomingCount > 0 && (
          <span className="ml-1.5 text-[10px] font-bold bg-emerald-500/25 text-emerald-200 rounded-full px-1.5 py-0.5">
            {upcomingCount}
          </span>
        )}
      </TabButton>
      <TabButton active={tab === "results"} onClick={() => setTab("results")}>
        {copy.tabResults}
        {resultsCount > 0 && (
          <span className="ml-1.5 text-[10px] font-bold bg-white/15 text-white/70 rounded-full px-1.5 py-0.5">
            {resultsCount}
          </span>
        )}
      </TabButton>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors flex items-center ${
        active
          ? "bg-emerald-500 text-[#062013]"
          : "text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h2 className="font-bold text-white text-base mb-1">{title}</h2>
      <p className="text-sm text-white/55 leading-relaxed max-w-md mx-auto">
        {body}
      </p>
    </div>
  );
}

export default function PredictionsCentrePage() {
  return (
    <ProtectedRoute>
      <PredictionsCentreContent />
    </ProtectedRoute>
  );
}
