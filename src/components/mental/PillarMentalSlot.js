// src/components/mental/PillarMentalSlot.js
//
// Renders the "7th slot" on an expanded pillar in /lesson. Fetches
// the assigned mental_activity for the given unit_id. When present,
// shows a differentiated card (colour-coded to the activity type)
// that opens the MeditationPlayer overlay on click.
//
// Renders NOTHING when there's no assigned activity — so units that
// haven't been authored yet don't show a placeholder.

"use client";

import { useEffect, useState } from "react";
import { Sparkles, Play, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import MentalActivityPlayer from "@/components/mental/MentalActivityPlayer";
import {
  ACTIVITY_TONES,
  pickLang,
} from "@/lib/mental/constants";

export default function PillarMentalSlot({ unitId }) {
  const { lang } = useLanguage();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);

  useEffect(() => {
    if (!unitId) return;
    let cancelled = false;
    (async () => {
      try {
        const [slotRes, actsRes] = await Promise.all([
          fetch(`/api/mental/unit-slot/${unitId}`),
          fetch(`/api/mental/activities`),
        ]);
        const slotJson = await slotRes.json();
        const actsJson = await actsRes.json();
        if (cancelled) return;
        setActivity(slotJson.activity || null);
        // Find completion state for this activity via the activities
        // list (already has per-activity completion metadata).
        const match = (actsJson.activities || []).find(
          (a) => a.id === slotJson.activity?.id,
        );
        const today = new Date().toISOString().slice(0, 10);
        setCompletedToday(match?.completion?.day_key === today);
      } catch {
        setActivity(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  if (loading) return null;
  if (!activity) return null;

  const tone = ACTIVITY_TONES[activity.activity_type] || ACTIVITY_TONES.meditation;
  const title = pickLang(activity.title, lang);
  const subtitle = pickLang(activity.subtitle, lang);
  const durationMin = activity.duration_seconds
    ? Math.round(activity.duration_seconds / 60)
    : null;
  const hasCover =
    typeof activity.cover_image_url === "string" &&
    activity.cover_image_url.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full text-left mt-2 rounded-card border-2 ${tone.border} bg-primary-panel hover:bg-primary-800 p-4 group relative overflow-hidden transition-colors`}
      >
        {/* Cover image — thumbnail on the left, replacing the icon
            square. Falls back to the type-signal glow when no cover
            is set (a blurred signal-tinted wash, not a gradient — DS
            "no brand-mix gradients"). */}
        {hasCover ? (
          <div
            className="absolute inset-y-0 left-0 w-24 sm:w-28 opacity-40 group-hover:opacity-70 transition-opacity"
            aria-hidden="true"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activity.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary-panel" />
          </div>
        ) : (
          <div
            className={`absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-30 group-hover:opacity-60 transition-opacity ${tone.glow} blur-3xl`}
            aria-hidden="true"
          />
        )}
        <div className="relative flex items-center gap-3">
          <div className={`shrink-0 w-11 h-11 rounded-control flex items-center justify-center ${tone.chip}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}
              >
                {pickLang(tone.label, lang)}
              </span>
              {completedToday && (
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-400" />
              )}
            </div>
            <h4 className="font-bold text-primary-50 text-sm leading-tight">
              {title}
            </h4>
            {subtitle && (
              <p className="text-xs text-primary-400 mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2 text-xs text-primary-400">
            {durationMin && (
              <span className="tabular-nums">
                {durationMin} min
              </span>
            )}
            <span className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center group-hover:scale-110 transition-transform text-primary-100">
              <Play className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </button>

      {open && (
        <MentalActivityPlayer
          activity={activity}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
