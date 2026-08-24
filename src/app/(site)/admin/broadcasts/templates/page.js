// src/app/(site)/admin/broadcasts/templates/page.js
//
// Templates list. Each row shows cadence + audience filter summary,
// with pause/resume toggle inline and a click-through to the edit page.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Repeat,
  PauseCircle,
  PlayCircle,
  ArrowLeft,
  Trash2,
} from "lucide-react";

const DAY_OF_WEEK_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TemplatesListPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const res = await fetch("/api/admin/broadcast-templates");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load");
      } else {
        setTemplates(json.templates || []);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleActive = async (t) => {
    setBusyId(t.id);
    try {
      await fetch(`/api/admin/broadcast-templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !t.active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t) => {
    if (!confirm(`Delete template "${t.name}"? This cannot be undone.`)) {
      return;
    }
    setBusyId(t.id);
    try {
      await fetch(`/api/admin/broadcast-templates/${t.id}`, {
        method: "DELETE",
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/admin/broadcasts"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          All broadcasts
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300/80 font-bold">
              Admin · Broadcasts
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              Recurring templates
            </h1>
          </div>
          <Link
            href="/admin/broadcasts/templates/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 font-bold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New template
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200">
            {error}
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-8 text-center">
            <Repeat className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <p className="text-white/70 font-semibold">No templates yet</p>
            <p className="text-xs text-white/45 mt-1">
              Create your first recurring broadcast — e.g. &ldquo;5 tips
              every Friday evening&rdquo;.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03]"
              >
                <Link
                  href={`/admin/broadcasts/templates/${t.id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white/95 truncate">
                      {t.name}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        t.active
                          ? "bg-accent-400/15 text-accent-300"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {t.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    {describeCadence(t)} · Languages:{" "}
                    {Object.keys(t.body || {}).join(", ") || "—"}
                    {t.last_generated_at && (
                      <>
                        {" "}
                        · Last generated{" "}
                        {new Date(t.last_generated_at).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleActive(t)}
                  disabled={busyId === t.id}
                  className="p-2 text-white/60 hover:text-white transition-colors disabled:opacity-40"
                  title={t.active ? "Pause" : "Resume"}
                >
                  {t.active ? (
                    <PauseCircle className="w-5 h-5" />
                  ) : (
                    <PlayCircle className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  disabled={busyId === t.id}
                  className="p-2 text-white/40 hover:text-red-300 transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function describeCadence(t) {
  const hour = String(t.cadence_hour_brt ?? 9).padStart(2, "0");
  if (t.cadence === "daily") return `Every day · ${hour}:00 BRT`;
  if (t.cadence === "weekly") {
    const dayIdx = t.cadence_day_of_week ?? 0;
    return `Weekly · ${DAY_OF_WEEK_LABELS[dayIdx]} · ${hour}:00 BRT`;
  }
  if (t.cadence === "monthly") {
    return `Monthly · day ${t.cadence_day_of_month ?? 1} · ${hour}:00 BRT`;
  }
  return t.cadence;
}
