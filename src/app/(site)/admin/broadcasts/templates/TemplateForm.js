// src/app/(site)/admin/broadcasts/templates/TemplateForm.js
//
// Shared compose form for templates. Used by /new (empty) and
// /[id] (pre-populated for edit). Kept as a client component with
// all state local — the parent pages are thin wrappers that decide
// what initial data to pass in and where to route on save.
//
// Structure loosely mirrors the broadcast compose form (name, body
// tabs, filters, timing panel) with the addition of a cadence panel
// (daily/weekly/monthly + day + hour) and an "Active" toggle.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Users,
  CheckCircle2,
  Repeat,
  Clock,
} from "lucide-react";
import { BROADCAST_LANGUAGES } from "@/lib/broadcasts/config";
import { POSITIONS } from "@/lib/players/positions";
import { PROPATH_GOALS } from "@/lib/players/proPathGoals";

const EDITIONS = [
  { value: "", label: "Any edition" },
  { value: "propath_26_27", label: "Pro Path 26/27" },
  { value: "wc2026", label: "WC2026" },
];

const SUBSCRIPTION_STATUSES = [
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "past_due", label: "Past due" },
  { value: "canceled", label: "Canceled" },
];

const NUDGE_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "every_3_days", label: "Every 3 days" },
  { value: "weekly", label: "Weekly" },
  { value: "off", label: "Big news only" },
];

const INTERVAL_OPTIONS = [3, 5, 8, 15, 30, 60];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_OF_WEEK = [
  { code: "mon", label: "Mon" },
  { code: "tue", label: "Tue" },
  { code: "wed", label: "Wed" },
  { code: "thu", label: "Thu" },
  { code: "fri", label: "Fri" },
  { code: "sat", label: "Sat" },
  { code: "sun", label: "Sun" },
];
const CADENCE_DAY_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

/**
 * @param {{ mode: 'create' | 'edit', initial?: object, templateId?: string }} props
 */
export default function TemplateForm({ mode = "create", initial, templateId }) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [bodies, setBodies] = useState(() => {
    const base = Object.fromEntries(
      BROADCAST_LANGUAGES.map((l) => [l.code, ""]),
    );
    if (initial?.body) {
      for (const [k, v] of Object.entries(initial.body)) {
        if (base[k] !== undefined) base[k] = v;
      }
    }
    return base;
  });
  const [activeLang, setActiveLang] = useState(BROADCAST_LANGUAGES[0].code);

  // Cadence
  const [cadence, setCadence] = useState(initial?.cadence ?? "weekly");
  const [cadenceDayOfWeek, setCadenceDayOfWeek] = useState(
    initial?.cadence_day_of_week ?? 5, // Friday
  );
  const [cadenceDayOfMonth, setCadenceDayOfMonth] = useState(
    initial?.cadence_day_of_month ?? 1,
  );
  const [cadenceHour, setCadenceHour] = useState(
    initial?.cadence_hour_brt ?? 18,
  );

  // Timing knobs
  const [intervalSeconds, setIntervalSeconds] = useState(
    initial?.interval_seconds ?? 8,
  );
  const [windowStart, setWindowStart] = useState(
    initial?.window_start_hour_brt ?? 8,
  );
  const [windowEnd, setWindowEnd] = useState(
    initial?.window_end_hour_brt ?? 21,
  );
  const [sendOnDays, setSendOnDays] = useState(
    initial?.send_on_days ?? ["mon", "tue", "wed", "thu", "fri", "sat"],
  );

  const [active, setActive] = useState(initial?.active ?? true);

  // Filters
  const initialFilter = initial?.target_filter || {};
  const [edition, setEdition] = useState(initialFilter.edition || "");
  const [subscriptionStatuses, setSubscriptionStatuses] = useState(
    initialFilter.subscription_statuses || [],
  );
  const [nudgeFrequencies, setNudgeFrequencies] = useState(
    initialFilter.nudge_frequencies || [],
  );
  const [languagesTargeted, setLanguagesTargeted] = useState(
    initialFilter.languages || [],
  );
  const [positions, setPositions] = useState(initialFilter.positions || []);
  const [propathGoals, setPropathGoals] = useState(
    initialFilter.propath_goals || [],
  );

  const [previewCount, setPreviewCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const filter = useMemo(() => {
    const f = {};
    if (edition) f.edition = edition;
    if (subscriptionStatuses.length > 0)
      f.subscription_statuses = subscriptionStatuses;
    if (nudgeFrequencies.length > 0) f.nudge_frequencies = nudgeFrequencies;
    if (languagesTargeted.length > 0) f.languages = languagesTargeted;
    if (positions.length > 0) f.positions = positions;
    if (propathGoals.length > 0) f.propath_goals = propathGoals;
    return f;
  }, [
    edition,
    subscriptionStatuses,
    nudgeFrequencies,
    languagesTargeted,
    positions,
    propathGoals,
  ]);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/broadcasts/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_filter: filter }),
        });
        const json = await res.json();
        if (cancelled) return;
        setPreviewCount(res.ok ? json.count : null);
      } catch {
        if (!cancelled) setPreviewCount(null);
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [filter]);

  const filledLanguages = Object.entries(bodies)
    .filter(([, v]) => v.trim().length > 0)
    .map(([k]) => k);

  const canSave =
    name.trim().length >= 3 && filledLanguages.length > 0 && !saving;

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const bodyPayload = {};
      for (const lang of filledLanguages) {
        bodyPayload[lang] = bodies[lang].trim();
      }
      const payload = {
        name: name.trim(),
        body: bodyPayload,
        target_filter: filter,
        cadence,
        cadence_hour_brt: cadenceHour,
        interval_seconds: intervalSeconds,
        window_start_hour_brt: windowStart,
        window_end_hour_brt: windowEnd,
        send_on_days: sendOnDays,
        active,
      };
      if (cadence === "weekly") payload.cadence_day_of_week = cadenceDayOfWeek;
      if (cadence === "monthly") payload.cadence_day_of_month = cadenceDayOfMonth;

      const url =
        mode === "edit"
          ? `/api/admin/broadcast-templates/${templateId}`
          : "/api/admin/broadcast-templates";
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Save failed");
        setSaving(false);
        return;
      }
      router.push("/admin/broadcasts/templates");
    } catch {
      setError("Network error");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/admin/broadcasts/templates"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          All templates
        </Link>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-6">
          {mode === "edit" ? "Edit template" : "New recurring template"}
        </h1>

        {/* Name */}
        <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
          Internal name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="e.g. 5 tips — every Friday"
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-accent-400 mb-6"
        />

        {/* Body */}
        <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
          Message body
        </label>
        <div className="flex gap-1 mb-2">
          {BROADCAST_LANGUAGES.map((lang) => {
            const isActive = activeLang === lang.code;
            const filled = bodies[lang.code].trim().length > 0;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setActiveLang(lang.code)}
                className={`px-3 py-1.5 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? "border-accent-400 text-accent-200 bg-white/[0.04]"
                    : "border-transparent text-white/60 hover:text-white/85"
                }`}
              >
                {lang.label}
                {filled && (
                  <CheckCircle2 className="inline-block w-3.5 h-3.5 ml-1.5 text-accent-300/80" />
                )}
              </button>
            );
          })}
        </div>
        <textarea
          value={bodies[activeLang]}
          onChange={(e) =>
            setBodies((prev) => ({ ...prev, [activeLang]: e.target.value }))
          }
          maxLength={3000}
          placeholder={
            activeLang === "pt"
              ? "Escreva a mensagem em português…"
              : "Write the message in English…"
          }
          rows={7}
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-accent-400 resize-y"
        />
        <p className="text-[11px] text-white/40 mt-1 mb-6">
          {bodies[activeLang].length} / 3000 characters.
        </p>

        {/* Cadence panel */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Repeat className="w-4 h-4 text-white/60" />
            <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
              How often
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
                Cadence
              </label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {cadence === "weekly" && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
                  Day of week
                </label>
                <select
                  value={cadenceDayOfWeek}
                  onChange={(e) => setCadenceDayOfWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm"
                >
                  {CADENCE_DAY_OF_WEEK.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {cadence === "monthly" && (
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
                  Day of month (1–28)
                </label>
                <select
                  value={cadenceDayOfMonth}
                  onChange={(e) =>
                    setCadenceDayOfMonth(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
                Hour (BRT)
              </label>
              <select
                value={cadenceHour}
                onChange={(e) => setCadenceHour(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm"
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded border-white/30 bg-white/5 text-accent-400 focus:ring-accent-400"
            />
            <span className="text-sm text-white/80">
              Active — the cron will generate broadcasts from this template
            </span>
          </label>
        </div>

        {/* Timing panel */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-white/60" />
            <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
              Send timing (for each generated broadcast)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
                Interval
              </label>
              <select
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm"
              >
                {INTERVAL_OPTIONS.map((i) => (
                  <option key={i} value={i}>
                    {i}s between sends
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
                Window start (BRT)
              </label>
              <select
                value={windowStart}
                onChange={(e) => setWindowStart(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm"
              >
                {HOUR_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
                Window end (BRT)
              </label>
              <select
                value={windowEnd}
                onChange={(e) => setWindowEnd(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
              Allowed days
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const isActive = sendOnDays.includes(d.code);
                return (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() =>
                      setSendOnDays((prev) =>
                        prev.includes(d.code)
                          ? prev.filter((x) => x !== d.code)
                          : [...prev, d.code],
                      )
                    }
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      isActive
                        ? "border-accent-400 bg-accent-400/15 text-accent-200"
                        : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-white/60" />
            <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
              Audience filters
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FilterSelect
              label="Edition"
              value={edition}
              onChange={setEdition}
              options={EDITIONS}
            />
            <FilterMultiSelect
              label="Language(s)"
              values={languagesTargeted}
              onChange={setLanguagesTargeted}
              options={BROADCAST_LANGUAGES.map((l) => ({
                value: l.code,
                label: l.label,
              }))}
            />
            <FilterMultiSelect
              label="Subscription status"
              values={subscriptionStatuses}
              onChange={setSubscriptionStatuses}
              options={SUBSCRIPTION_STATUSES}
            />
            <FilterMultiSelect
              label="Nudge frequency"
              values={nudgeFrequencies}
              onChange={setNudgeFrequencies}
              options={NUDGE_FREQUENCIES}
            />
            <FilterMultiSelect
              label="Position"
              values={positions}
              onChange={setPositions}
              options={POSITIONS.map((p) => ({ value: p.code, label: p.code }))}
            />
            <FilterMultiSelect
              label="Pro Path goal"
              values={propathGoals}
              onChange={setPropathGoals}
              options={PROPATH_GOALS.map((g) => ({
                value: g.slug,
                label: g.en.title,
              }))}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-sm">
              <span className="text-white/50">Estimated audience: </span>
              <span className="font-black text-accent-300 text-lg tabular-nums">
                {previewLoading ? "…" : (previewCount ?? "?")}
              </span>
              <span className="text-white/50"> opted-in recipients</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 disabled:opacity-40 text-primary-900 text-sm font-bold transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mode === "edit" ? "Save changes" : "Create template"}
          </button>
        </div>
      </main>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterMultiSelect({ label, values, onChange, options }) {
  const toggle = (v) => {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  };
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-white/55 mb-1.5 font-semibold">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                active
                  ? "border-accent-400 bg-accent-400/15 text-accent-200"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
