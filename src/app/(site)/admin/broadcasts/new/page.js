// src/app/(site)/admin/broadcasts/new/page.js
//
// Compose a new broadcast. Layout:
//
//   [ Name input                                        ]
//   [ Bilingual body tabs — PT / EN / (ES future)       ]
//   [   textarea for the active tab                     ]
//   [ Segment filters (edition, subscription, etc)      ]
//   [ Preview count (auto-updating)                     ]
//   [ Test send — pick recipient + language + Send      ]
//   [ Save as draft   |   Save & Send now               ]
//
// Bilingual bodies are optional per language. Empty tab = language
// not targeted for this broadcast; recipients on that language are
// skipped at dispatch time with skip_reason='no_translation'.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Send,
  Save,
  Users,
  TestTube2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { BROADCAST_LANGUAGES, TEST_RECIPIENTS } from "@/lib/broadcasts/config";
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

const PROPATH_GOAL_OPTIONS = PROPATH_GOALS.map((g) => ({
  value: g.slug,
  label: g.en.title,
}));

const POSITION_OPTIONS = POSITIONS.map((p) => ({
  value: p.code,
  label: p.code,
}));

export default function BroadcastComposePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [bodies, setBodies] = useState(
    Object.fromEntries(BROADCAST_LANGUAGES.map((l) => [l.code, ""])),
  );
  const [activeLang, setActiveLang] = useState(BROADCAST_LANGUAGES[0].code);

  // Filters — every array-typed filter starts empty (= no restriction).
  const [edition, setEdition] = useState("");
  const [subscriptionStatuses, setSubscriptionStatuses] = useState([]);
  const [nudgeFrequencies, setNudgeFrequencies] = useState([]);
  const [languagesTargeted, setLanguagesTargeted] = useState([]);
  const [positions, setPositions] = useState([]);
  const [propathGoals, setPropathGoals] = useState([]);

  const [previewCount, setPreviewCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState(null);
  const [testRecipientId, setTestRecipientId] = useState(TEST_RECIPIENTS[0].id);
  const [error, setError] = useState(null);

  const filter = useMemo(() => {
    const f = {};
    if (edition) f.edition = edition;
    if (subscriptionStatuses.length > 0) {
      f.subscription_statuses = subscriptionStatuses;
    }
    if (nudgeFrequencies.length > 0) {
      f.nudge_frequencies = nudgeFrequencies;
    }
    if (languagesTargeted.length > 0) {
      f.languages = languagesTargeted;
    }
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

  // Debounced preview fetch — refreshes 400ms after the last filter
  // change. Keeps the compose UI responsive while the admin tinkers
  // with the segments.
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

  const handleTestSend = async () => {
    if (!bodies[activeLang]?.trim()) {
      setTestMessage({
        type: "error",
        text: `Body for '${activeLang}' is empty — nothing to send.`,
      });
      return;
    }
    setTesting(true);
    setTestMessage(null);
    try {
      const res = await fetch("/api/admin/broadcasts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: bodies,
          language: activeLang,
          recipient_id: testRecipientId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTestMessage({
          type: "error",
          text: json.error || "Test send failed",
        });
      } else {
        setTestMessage({
          type: "ok",
          text: `Sent to ${json.recipient}. Message ID: ${json.messageId}`,
        });
      }
    } catch {
      setTestMessage({ type: "error", text: "Network error" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async ({ sendImmediately }) => {
    setError(null);
    setSaving(true);
    try {
      // Only include languages the admin actually filled.
      const bodyPayload = {};
      for (const lang of filledLanguages) {
        bodyPayload[lang] = bodies[lang].trim();
      }
      const createRes = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          body: bodyPayload,
          target_filter: filter,
        }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) {
        setError(createJson.error || "Save failed");
        setSaving(false);
        return;
      }

      if (sendImmediately) {
        const sendRes = await fetch(
          `/api/admin/broadcasts/${createJson.id}/send`,
          { method: "POST" },
        );
        const sendJson = await sendRes.json();
        if (!sendRes.ok) {
          setError(sendJson.error || "Send failed");
          setSaving(false);
          return;
        }
      }

      router.push(`/admin/broadcasts/${createJson.id}`);
    } catch {
      setError("Network error");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/admin/broadcasts"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          All broadcasts
        </Link>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-6">
          New broadcast
        </h1>

        {/* ── Name ─────────────────────────────────────────────── */}
        <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
          Internal name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="e.g. 5 tips — week 3"
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-accent-400 mb-6"
        />

        {/* ── Bilingual body tabs ─────────────────────────────── */}
        <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
          Message body
        </label>
        <div className="flex gap-1 mb-2">
          {BROADCAST_LANGUAGES.map((lang) => {
            const active = activeLang === lang.code;
            const filled = bodies[lang.code].trim().length > 0;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setActiveLang(lang.code)}
                className={`px-3 py-1.5 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
                  active
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
          {bodies[activeLang].length} / 3000 characters. Empty language tabs
          are skipped for recipients on that language.
        </p>

        {/* ── Test send ───────────────────────────────────────── */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <TestTube2 className="w-4 h-4 text-white/60" />
            <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
              Test send
            </p>
          </div>
          <p className="text-[11px] text-white/50 mb-3">
            Sends the currently-active language tab to one of the test
            recipients. Bypasses the DB — no broadcast row is created.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={testRecipientId}
              onChange={(e) => setTestRecipientId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white text-sm"
            >
              {TEST_RECIPIENTS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleTestSend}
              disabled={testing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send test ({activeLang.toUpperCase()})
                </>
              )}
            </button>
          </div>
          {testMessage && (
            <p
              className={`mt-2 text-xs ${
                testMessage.type === "ok"
                  ? "text-accent-300"
                  : "text-red-300"
              }`}
            >
              {testMessage.text}
            </p>
          )}
        </div>

        {/* ── Segment filters ─────────────────────────────────── */}
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
              hint="Filter recipients by their preferred language."
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
              label="Position (Pro Path)"
              values={positions}
              onChange={setPositions}
              options={POSITION_OPTIONS}
            />
            <FilterMultiSelect
              label="Pro Path goal"
              values={propathGoals}
              onChange={setPropathGoals}
              options={PROPATH_GOAL_OPTIONS}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <p className="text-sm">
              <span className="text-white/50">Will send to </span>
              <span className="font-black text-accent-300 text-lg tabular-nums">
                {previewLoading ? "…" : (previewCount ?? "?")}
              </span>
              <span className="text-white/50"> opted-in recipients</span>
            </p>
            <p className="text-[11px] text-white/40">
              Baseline: opted in · has phone · not paused
            </p>
          </div>
        </div>

        {/* ── Save / Send ─────────────────────────────────────── */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
            {error}
          </div>
        )}
        {previewCount === 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/40 text-amber-200 text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            No recipients match your filters. Adjust filters or save as draft
            for later.
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => handleSave({ sendImmediately: false })}
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-bold disabled:opacity-40 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save as draft
          </button>
          <button
            type="button"
            onClick={() => handleSave({ sendImmediately: true })}
            disabled={!canSave || previewCount === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 disabled:opacity-40 text-primary-900 text-sm font-bold transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Save & send now
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

function FilterMultiSelect({ label, values, onChange, options, hint }) {
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
      {hint && <p className="text-[10px] text-white/40 mt-1">{hint}</p>}
    </div>
  );
}
