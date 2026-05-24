// src/app/(site)/admin/predictions/page.js
//
// Platform-admin tool for resolving prediction steps. Workflow:
//   1. Group all submitted predictions by step_id.
//   2. For each step, derive its cards + containers from the first
//      submission's data (every user submitted against the same step
//      so any row works as a template).
//   3. Admin assigns each card to its actual containerId via dropdowns.
//   4. Submit → POST /api/predictions/resolve → backend writes the
//      canonical answer, scores every prediction, awards bonus XP.
//
// Lives at /admin/predictions. Gated by user_type === "platform_admin"
// (the API enforces the same — this UI is a courtesy gate).
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { createClient } from "@/lib/supabase/client";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";

function AdminPredictionsContent() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile(user?.id);
  const [steps, setSteps] = useState([]); // [{ step_id, cards, containers, pending, resolved, title, answer? }]
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Wait until profile loads to know whether to render.
  const isAdmin = profile?.user_type === "platform_admin";

  useEffect(() => {
    if (!user?.id) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();

      // Pull every prediction (RLS would block normal users; admin only
      // route, but Supabase RLS is per-row by player_id — so as admin
      // we'd need either a service-role read or a custom policy. For
      // simplicity, we read via /api/predictions/all-for-admin below).
      const res = await fetch("/api/predictions/all-for-admin");
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        console.error("[admin/predictions] fetch:", data);
        setSteps([]);
        setLoading(false);
        return;
      }
      setSteps(data.steps || []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, tick]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <p className="text-white/70 text-sm">Platform admins only.</p>
      </div>
    );
  }

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
          <span className="text-xs text-white/40 tracking-wide uppercase">
            Admin
          </span>
        </header>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Resolve Predictions
        </h1>

        {steps.length === 0 ? (
          <p className="text-white/60">
            No predictions have been submitted yet.
          </p>
        ) : (
          <div className="space-y-4">
            {steps.map((s) => (
              <StepResolver
                key={s.step_id}
                step={s}
                onResolved={() => setTick((t) => t + 1)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StepResolver({ step, onResolved }) {
  const cards = step.cards || [];
  const containers = step.containers || [];
  const isResolved = !!step.answer;

  // Map cardId → containerId, initialised from the existing answer if any.
  const [assignments, setAssignments] = useState(() => {
    const init = {};
    for (const c of cards) {
      init[c.id] = step.answer?.actual?.[c.id] || "";
    }
    return init;
  });
  const [xpPerCorrect, setXpPerCorrect] = useState(
    step.answer?.xp_per_correct || 10
  );
  const [xpPerfectBonus, setXpPerfectBonus] = useState(
    step.answer?.xp_perfect_bonus || 20
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const allAssigned = useMemo(
    () => cards.every((c) => assignments[c.id]),
    [cards, assignments]
  );

  const submit = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/predictions/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_id: step.step_id,
          prediction_type: "group_finish",
          actual: assignments,
          xp_per_correct: xpPerCorrect,
          xp_perfect_bonus: xpPerfectBonus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.error || "Resolve failed",
        });
      } else {
        setMessage({
          type: "ok",
          text: `Resolved ${data.resolved_count} prediction(s), awarded ${data.total_xp_awarded} XP total.`,
        });
        onResolved?.();
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-base">{step.title || step.step_id}</h3>
        <div className="text-xs text-white/60">
          <span className="font-bold text-white">
            {step.pending} pending
          </span>
          {step.resolved > 0 && (
            <>
              {" / "}
              <span className="text-white/50">{step.resolved} resolved</span>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-white/50">
        Assign each item to its actual position. Submit to score every
        user&apos;s prediction and award bonus XP.
      </p>

      <div className="space-y-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex items-center gap-3 bg-white/5 px-3 py-2 rounded-lg"
          >
            <span className="text-sm font-medium text-white flex-1">
              {card.label}
            </span>
            <select
              value={assignments[card.id] || ""}
              onChange={(e) =>
                setAssignments((prev) => ({
                  ...prev,
                  [card.id]: e.target.value,
                }))
              }
              disabled={isResolved}
              className="px-2 py-1 rounded bg-[#070707] border border-white/15 text-white text-sm"
            >
              <option value="">— position —</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-xs text-white/60 flex items-center gap-2">
          XP per correct
          <input
            type="number"
            min="0"
            value={xpPerCorrect}
            onChange={(e) =>
              setXpPerCorrect(Math.max(0, Number(e.target.value) || 0))
            }
            disabled={isResolved}
            className="ml-auto w-20 px-2 py-1 rounded bg-[#070707] border border-white/15 text-white text-sm"
          />
        </label>
        <label className="text-xs text-white/60 flex items-center gap-2">
          Perfect bonus
          <input
            type="number"
            min="0"
            value={xpPerfectBonus}
            onChange={(e) =>
              setXpPerfectBonus(Math.max(0, Number(e.target.value) || 0))
            }
            disabled={isResolved}
            className="ml-auto w-20 px-2 py-1 rounded bg-[#070707] border border-white/15 text-white text-sm"
          />
        </label>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
            message.type === "ok"
              ? "bg-emerald-500/15 text-emerald-200"
              : "bg-red-500/15 text-red-200"
          }`}
        >
          {message.type === "ok" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting || !allAssigned}
        className="w-full px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#070707] text-sm font-bold transition-colors"
      >
        {submitting
          ? "Resolving…"
          : isResolved
            ? "Re-resolve (overwrites bonus XP)"
            : "Resolve all"}
      </button>
    </div>
  );
}

export default function AdminPredictionsPage() {
  return (
    <ProtectedRoute>
      <AdminPredictionsContent />
    </ProtectedRoute>
  );
}
