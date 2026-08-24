// src/app/(site)/admin/broadcasts/[id]/page.js
//
// Broadcast detail view. Shows:
//   - Header (name, status badge, timeline)
//   - Body preview (each language)
//   - Recipient breakdown (counts + first 200 recipient rows)
//   - Cancel button (for draft/sending)
//   - Send-now button (for draft, if not yet sent)
//
// Auto-refreshes every 10s while status='sending' so the admin can
// watch the counters climb without hitting reload.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Send,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

const STATUS_META = {
  draft: { label: "Draft", tone: "bg-white/10 text-white/70", Icon: Clock },
  sending: {
    label: "Sending",
    tone: "bg-blue-500/15 text-blue-300",
    Icon: Send,
  },
  complete: {
    label: "Complete",
    tone: "bg-accent-400/15 text-accent-300",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-red-500/15 text-red-300",
    Icon: XCircle,
  },
};

export default function BroadcastDetailPage() {
  const { id } = useParams();
  const [broadcast, setBroadcast] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to load");
        return;
      }
      setBroadcast(json.broadcast);
      setRecipients(json.recipients || []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh every 10s while sending — cheap way to watch progress
  // without a websocket. Stops as soon as status flips to complete
  // or cancelled.
  useEffect(() => {
    if (broadcast?.status !== "sending") return;
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [broadcast?.status, load]);

  const handleSendNow = async () => {
    if (!confirm(`Send this broadcast now? (${broadcast.recipient_count || 0} recipients will be queued)`)) {
      return;
    }
    setSending(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}/send`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: json.error || "Send failed",
        });
        setSending(false);
        return;
      }
      setActionMessage({
        type: "ok",
        text: `Queued ${json.recipient_count} recipients. Dispatcher will process at ~7/minute.`,
      });
      await load();
    } catch {
      setActionMessage({ type: "error", text: "Network error" });
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this broadcast? Remaining pending recipients will be skipped.")) {
      return;
    }
    setCancelling(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMessage({
          type: "error",
          text: json.error || "Cancel failed",
        });
        setCancelling(false);
        return;
      }
      setActionMessage({ type: "ok", text: "Broadcast cancelled." });
      await load();
    } catch {
      setActionMessage({ type: "error", text: "Network error" });
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || !broadcast) {
    return (
      <div className="min-h-screen bg-[#070707] text-white p-8">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/admin/broadcasts"
            className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            All broadcasts
          </Link>
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200">
            {error || "Not found"}
          </div>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[broadcast.status] || STATUS_META.draft;
  const StatusIcon = meta.Icon;
  const canSend = broadcast.status === "draft";
  const canCancel =
    broadcast.status === "draft" || broadcast.status === "sending";

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

        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight truncate">
              {broadcast.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs text-white/50">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.tone}`}
              >
                <StatusIcon className="w-3 h-3" />
                {meta.label}
              </span>
              <span>Created {formatDate(broadcast.created_at)}</span>
              {broadcast.sent_started_at && (
                <span>· Started {formatDate(broadcast.sent_started_at)}</span>
              )}
              {broadcast.completed_at && (
                <span>· Finished {formatDate(broadcast.completed_at)}</span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {canSend && (
              <button
                type="button"
                onClick={handleSendNow}
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-bold disabled:opacity-40 transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send now
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-red-500/20 hover:border-red-400/60 text-white text-sm font-semibold border border-white/15 disabled:opacity-40 transition-colors"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Cancel
              </button>
            )}
          </div>
        </div>

        {actionMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              actionMessage.type === "ok"
                ? "bg-accent-400/10 border border-accent-400/40 text-accent-200"
                : "bg-red-500/15 border border-red-500/40 text-red-200"
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* ── Counters ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Counter label="Recipients" value={broadcast.recipient_count} />
          <Counter
            label="Sent"
            value={broadcast.sent_count}
            tone="text-accent-300"
          />
          <Counter
            label="Failed"
            value={broadcast.failed_count}
            tone={
              (broadcast.failed_count || 0) > 0
                ? "text-red-300"
                : "text-white/60"
            }
          />
          <Counter
            label="Skipped"
            value={broadcast.skipped_count}
            tone="text-white/60"
          />
        </div>

        {/* ── Body preview ────────────────────────────────────── */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-3">
            Message body
          </p>
          {Object.entries(broadcast.body || {}).map(([lang, text]) => (
            <div key={lang} className="mb-4 last:mb-0">
              <p className="text-[10px] uppercase tracking-wider text-accent-300/80 font-bold mb-1">
                {lang}
              </p>
              <p className="text-sm text-white/85 whitespace-pre-wrap break-words">
                {text}
              </p>
            </div>
          ))}
        </section>

        {/* ── Filter summary ──────────────────────────────────── */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-2">
            Audience filter
          </p>
          {Object.keys(broadcast.target_filter || {}).length === 0 ? (
            <p className="text-sm text-white/50">
              No restrictions (all opted-in players).
            </p>
          ) : (
            <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono">
              {JSON.stringify(broadcast.target_filter, null, 2)}
            </pre>
          )}
        </section>

        {/* ── Schedule + timing summary ───────────────────────── */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 mb-6">
          <p className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-3">
            Schedule &amp; timing
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <ScheduleField
              label="Starts at"
              value={
                broadcast.scheduled_for
                  ? formatDate(broadcast.scheduled_for)
                  : "Immediately on Send"
              }
            />
            <ScheduleField
              label="Interval between sends"
              value={`${broadcast.interval_seconds || 8}s`}
            />
            <ScheduleField
              label="Send window (BRT)"
              value={`${String(broadcast.window_start_hour_brt ?? 8).padStart(2, "0")}:00 – ${String(broadcast.window_end_hour_brt ?? 21).padStart(2, "0")}:00`}
            />
            <ScheduleField
              label="Allowed days"
              value={(broadcast.send_on_days || [])
                .map((d) => d[0].toUpperCase() + d.slice(1))
                .join(", ")}
            />
          </div>
          {broadcast.generated_from_template_id && (
            <p className="text-[11px] text-white/40 mt-3">
              Auto-generated from a recurring template.
            </p>
          )}
        </section>

        {/* ── Recipients list ─────────────────────────────────── */}
        <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-4">
          <p className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-3">
            Recipients ({recipients.length}{" "}
            {recipients.length >= 200 ? "shown, more in DB" : "total"})
          </p>
          {recipients.length === 0 ? (
            <p className="text-sm text-white/50">
              No recipients yet — fan-out happens when you click Send.
            </p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto pr-2">
              {recipients.map((r) => (
                <RecipientRow key={r.id} recipient={r} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ScheduleField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
        {label}
      </p>
      <p className="text-sm text-white/90 mt-0.5">{value}</p>
    </div>
  );
}

function Counter({ label, value, tone = "text-white/90" }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
        {label}
      </p>
      <p className={`text-xl font-black tabular-nums ${tone}`}>
        {Number(value ?? 0).toLocaleString()}
      </p>
    </div>
  );
}

function RecipientRow({ recipient }) {
  const statusColor =
    recipient.status === "sent"
      ? "text-accent-300"
      : recipient.status === "failed"
        ? "text-red-300"
        : recipient.status === "skipped"
          ? "text-white/40"
          : "text-blue-300";
  const slotIsFuture =
    recipient.status === "pending" &&
    recipient.scheduled_slot &&
    new Date(recipient.scheduled_slot).getTime() > Date.now();
  return (
    <div className="flex items-center gap-3 text-xs py-1.5 border-b border-white/[0.04] last:border-b-0">
      <span className="text-white/70 font-mono truncate flex-1">
        {recipient.phone_e164}
      </span>
      <span className="text-white/40 uppercase tracking-wider text-[10px]">
        {recipient.language}
      </span>
      <span
        className={`uppercase tracking-wider text-[10px] font-bold ${statusColor}`}
      >
        {recipient.status}
      </span>
      {slotIsFuture && (
        <span className="text-blue-200/70 text-[10px]">
          <Clock className="w-3 h-3 inline mr-1" />
          {formatDate(recipient.scheduled_slot)}
        </span>
      )}
      {recipient.error && (
        <span className="text-red-300/60 text-[10px] truncate max-w-[200px]">
          <AlertTriangle className="w-3 h-3 inline mr-1" />
          {recipient.error}
        </span>
      )}
      {recipient.skip_reason && (
        <span className="text-white/40 text-[10px] truncate max-w-[200px]">
          {recipient.skip_reason}
        </span>
      )}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
