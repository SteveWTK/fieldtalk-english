// src/app/(site)/admin/broadcasts/page.js
//
// Broadcasts list. Newest-first table of every composed broadcast
// with its status + counters. Click a row to open the detail page.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Clock,
  Repeat,
} from "lucide-react";

const STATUS_META = {
  draft: { label: "Draft", tone: "bg-primary-700 text-primary-300", Icon: Clock },
  sending: {
    label: "Sending",
    tone: "bg-signal-english/15 text-signal-english",
    Icon: Send,
  },
  complete: {
    label: "Complete",
    tone: "bg-accent-400/15 text-accent-300",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    tone: "bg-signal-alert/15 text-signal-alert",
    Icon: XCircle,
  },
};

export default function BroadcastsListPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/broadcasts");
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Failed to load");
        } else {
          setBroadcasts(json.broadcasts || []);
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-accent-400 font-bold">
              Admin
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              WhatsApp broadcasts
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/broadcasts/templates"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary-800 hover:bg-primary-700 text-primary-50 text-sm font-semibold border border-primary-600 transition-colors"
            >
              <Repeat className="w-4 h-4" />
              Recurring templates
            </Link>
            <Link
              href="/admin/broadcasts/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 font-bold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New broadcast
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-primary-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="p-4 rounded-card bg-signal-alert/15 border border-signal-alert/40 text-signal-alert">
            {error}
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="rounded-card bg-primary-panel border border-primary-700 p-8 text-center">
            <PauseCircle className="w-10 h-10 text-primary-500 mx-auto mb-3" />
            <p className="text-primary-100 font-semibold">No broadcasts yet</p>
            <p className="text-xs text-primary-400 mt-1">
              Compose your first message to see it here.
            </p>
          </div>
        ) : (
          <div className="rounded-card border border-primary-700 overflow-hidden">
            {broadcasts.map((b) => {
              const meta = STATUS_META[b.status] || STATUS_META.draft;
              const StatusIcon = meta.Icon;
              return (
                <Link
                  key={b.id}
                  href={`/admin/broadcasts/${b.id}`}
                  className="flex items-start gap-3 px-4 py-3.5 border-b border-primary-700 hover:bg-primary-800 transition-colors last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-primary-50 truncate">
                        {b.name}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.tone}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-primary-400 mt-1">
                      {formatDate(b.created_at)} · Languages:{" "}
                      {Object.keys(b.body || {}).join(", ") || "—"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-primary-300 shrink-0">
                    <p>
                      <span className="text-accent-400 font-bold">
                        {b.sent_count || 0}
                      </span>{" "}
                      / {b.recipient_count || 0} sent
                    </p>
                    {(b.failed_count || 0) > 0 && (
                      <p className="text-signal-alert mt-0.5">
                        {b.failed_count} failed
                      </p>
                    )}
                    {(b.skipped_count || 0) > 0 && (
                      <p className="text-primary-500 mt-0.5">
                        {b.skipped_count} skipped
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
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
