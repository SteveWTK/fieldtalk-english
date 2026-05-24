// src/app/(site)/dashboard/predictions/page.js
//
// User-facing Predictions Centre. Two lists:
//   - Pending  → submitted, awaiting the admin's canonical answer.
//   - Resolved → shows the user's prediction alongside how many they
//                got right and the XP bonus they earned.
//
// Each row renders the user's ordering as a compact horizontal list,
// using the cards/containers metadata stored in predictions.data so we
// don't need to re-fetch the lesson JSON.
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, Crosshair, Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerPredictions } from "@/lib/hooks/usePlayerPredictions";

function PredictionsContent() {
  const { user } = useAuth();
  const { predictions, counts, loading } = usePlayerPredictions(user?.id);

  const pending = useMemo(
    () => predictions.filter((p) => !p.resolved),
    [predictions]
  );
  const resolved = useMemo(
    () => predictions.filter((p) => p.resolved),
    [predictions]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <header className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <div className="text-sm text-white/60">
            <span className="font-bold text-emerald-300">
              +{counts.totalBonusXp}
            </span>{" "}
            bonus XP earned
          </div>
        </header>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Predictions Centre
        </h1>

        {predictions.length === 0 ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
            <Crosshair className="w-10 h-10 mx-auto mb-3 text-white/40" />
            <p className="text-white/70">
              You haven&apos;t made any predictions yet. They&apos;ll appear
              here when you complete a prediction step in a lesson.
            </p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <Section title="Pending" icon={Clock} count={pending.length}>
                {pending.map((p) => (
                  <PredictionRow key={p.id} prediction={p} />
                ))}
              </Section>
            )}
            {resolved.length > 0 && (
              <Section
                title="Resolved"
                icon={CheckCircle}
                count={resolved.length}
              >
                {resolved.map((p) => (
                  <PredictionRow key={p.id} prediction={p} />
                ))}
              </Section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Section({ title, icon: Icon, count, children }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
        <Icon className="w-4 h-4" />
        {title}
        <span className="text-white/40">({count})</span>
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function PredictionRow({ prediction }) {
  const data = prediction.data || {};
  const placements = data.placements || {};
  const containers = data.containers || [];
  const cards = data.cards || [];

  // Build the user's ordering: walk containers in their declared order
  // and look up which card was assigned. Falls back to "—" if missing.
  const ordered = useMemo(() => {
    return containers.map((c) => {
      const cardId = Object.entries(placements).find(
        ([, containerId]) => containerId === c.id
      )?.[0];
      const card = cards.find((card) => card.id === cardId);
      return { container: c, card: card || null };
    });
  }, [containers, placements, cards]);

  const isResolved = prediction.resolved;
  const correct = prediction.correct_count || 0;
  const max = prediction.max_count || containers.length;
  const xp = prediction.xp_bonus || 0;

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="font-bold text-sm sm:text-base">
          {data.title || "Prediction"}
        </h3>
        {isResolved ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 font-semibold">
              {correct} / {max} correct
            </span>
            {xp > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 font-semibold">
                +{xp} XP
              </span>
            )}
          </div>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold">
            Awaiting result
          </span>
        )}
      </div>

      <ol className="space-y-1.5">
        {ordered.map(({ container, card }) => (
          <li
            key={container.id}
            className="flex items-center gap-3 text-sm bg-white/5 px-3 py-1.5 rounded-lg"
          >
            <span className="font-bold text-white/60 w-8 shrink-0">
              {container.label}
            </span>
            <span className="text-white">
              {card?.label || (
                <span className="text-white/30">—</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function PredictionsPage() {
  return (
    <ProtectedRoute>
      <PredictionsContent />
    </ProtectedRoute>
  );
}
