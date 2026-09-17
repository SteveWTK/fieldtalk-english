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
import { ChevronLeft, CheckCircle, AlertCircle, Save } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { createClient } from "@/lib/supabase/client";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";
import Button from "@/components/ui/button";

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      <div className="min-h-screen bg-primary-900 text-primary-50 flex items-center justify-center">
        <p className="text-primary-300 text-sm">Platform admins only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <header className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-primary-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-xs text-primary-500 tracking-wide uppercase">
            Admin
          </span>
        </header>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Resolve Predictions
        </h1>

        {steps.length === 0 ? (
          <p className="text-primary-300">
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
    <div className="rounded-card bg-primary-panel border border-primary-700 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-base">{step.title || step.step_id}</h3>
        <div className="text-xs text-primary-300">
          <span className="font-bold text-primary-50">{step.pending} pending</span>
          {step.resolved > 0 && (
            <>
              {" / "}
              <span className="text-primary-400">{step.resolved} resolved</span>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-primary-400">
        Assign each item to its actual position. Submit to score every
        user&apos;s prediction and award bonus XP.
      </p>

      <div className="space-y-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex items-center gap-3 bg-primary-800 px-3 py-2 rounded-control"
          >
            <span className="text-sm font-medium text-primary-50 flex-1">
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
              className="px-2 py-1 rounded bg-primary-900 border border-primary-600 text-primary-50 text-sm focus:outline-none focus:border-accent-400 focus:ring-accent-400/30"
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
        <label className="text-xs text-primary-300 flex items-center gap-2">
          XP per correct
          <input
            type="number"
            min="0"
            value={xpPerCorrect}
            onChange={(e) =>
              setXpPerCorrect(Math.max(0, Number(e.target.value) || 0))
            }
            disabled={isResolved}
            className="ml-auto w-20 px-2 py-1 rounded bg-primary-900 border border-primary-600 text-primary-50 text-sm focus:outline-none focus:border-accent-400 focus:ring-accent-400/30"
          />
        </label>
        <label className="text-xs text-primary-300 flex items-center gap-2">
          Perfect bonus
          <input
            type="number"
            min="0"
            value={xpPerfectBonus}
            onChange={(e) =>
              setXpPerfectBonus(Math.max(0, Number(e.target.value) || 0))
            }
            disabled={isResolved}
            className="ml-auto w-20 px-2 py-1 rounded bg-primary-900 border border-primary-600 text-primary-50 text-sm focus:outline-none focus:border-accent-400 focus:ring-accent-400/30"
          />
        </label>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-control ${
            message.type === "ok"
              ? "bg-accent-400/15 text-accent-400"
              : "bg-signal-alert/15 text-signal-alert"
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

      <Button
        type="button"
        onClick={submit}
        variant="primary"
        fullWidth
        Icon={Save}
        loading={submitting}
        disabled={!allAssigned}
      >
        {submitting
          ? "Resolving…"
          : isResolved
            ? "Re-resolve (overwrites bonus XP)"
            : "Resolve all"}
      </Button>
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
