// src/app/(site)/admin/sticker-mapping/page.js
//
// Admin tool to map each sticker_player to its API-Football
// player_id. Once mapped, the daily cron at /api/cron/recompute-
// sticker-ratings keeps that sticker's rating in lockstep with
// real-world performance.
//
// Workflow:
//   1. Page loads with the list of UNMAPPED stickers (the gap-
//      filling default). Filter pills switch to mapped / all.
//   2. Click a sticker row → modal opens, auto-runs an API-Football
//      search using the sticker's name. Click a candidate to save.
//   3. Mapped stickers can be un-mapped (Clear button) or re-mapped.
//
// Gated by user_type === "platform_admin" both client-side (this
// page) and server-side (the API routes use requireAdmin).
"use client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";

function AdminStickerMappingContent() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile(user?.id);
  const isAdmin = profile?.user_type === "platform_admin";

  const [filter, setFilter] = useState("unmapped"); // unmapped | mapped | all
  const [query, setQuery] = useState("");
  const [stickers, setStickers] = useState([]);
  const [counts, setCounts] = useState({ mapped: 0, unmapped: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null); // sticker being mapped

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/sticker-mapping?filter=${filter}${
        query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setStickers(json.stickers || []);
      setCounts(json.counts || { mapped: 0, unmapped: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter, query]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <p className="text-white/70 text-sm">Platform admins only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to admin
          </Link>
        </div>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-2">
            Dynamic ratings
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Sticker → API-Football mapping
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            Map each sticker to its API-Football player_id so the daily cron can
            keep the rating in sync with real-world performance. Unmapped
            stickers retain their current static rating until you map them.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <FilterPill
            active={filter === "unmapped"}
            onClick={() => setFilter("unmapped")}
            label="Unmapped"
            count={counts.unmapped}
            tone="amber"
          />
          <FilterPill
            active={filter === "mapped"}
            onClick={() => setFilter("mapped")}
            label="Mapped"
            count={counts.mapped}
            tone="emerald"
          />
          <FilterPill
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
            count={counts.mapped + counts.unmapped}
            tone="neutral"
          />
          <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/45" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or country…"
                className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <button
              type="button"
              onClick={load}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/25 text-white/70 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : stickers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/60">
            No stickers match this filter.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-white/40">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Player</th>
                  <th className="text-left px-3 py-2 font-semibold">Country</th>
                  <th className="text-left px-3 py-2 font-semibold">Pos</th>
                  <th className="text-left px-3 py-2 font-semibold">Rating</th>
                  <th className="text-left px-3 py-2 font-semibold">Mapping</th>
                  <th className="text-right px-3 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {stickers.map((s) => (
                  <StickerRow
                    key={s.id}
                    sticker={s}
                    onMap={() => setActive(s)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {active && (
        <MappingModal
          sticker={active}
          onClose={() => setActive(null)}
          onSaved={() => {
            setActive(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function FilterPill({ active, onClick, label, count, tone }) {
  const palette =
    tone === "emerald"
      ? active
        ? "bg-emerald-500 text-[#062013] border-emerald-500"
        : "border-emerald-400/40 text-emerald-200 hover:border-emerald-400/70"
      : tone === "amber"
        ? active
          ? "bg-amber-300 text-[#1e1500] border-amber-300"
          : "border-amber-300/40 text-amber-200 hover:border-amber-300/70"
        : active
          ? "bg-white/15 text-white border-white/30"
          : "border-white/15 text-white/70 hover:border-white/30";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${palette}`}
    >
      {label}
      <span className="ml-2 opacity-70 tabular-nums">{count}</span>
    </button>
  );
}

function StickerRow({ sticker, onMap }) {
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.02]">
      <td className="px-3 py-2 font-semibold text-white">{sticker.name}</td>
      <td className="px-3 py-2 text-white/70">{sticker.country || "—"}</td>
      <td className="px-3 py-2 text-white/60 text-xs">
        {sticker.position || "—"}
      </td>
      <td className="px-3 py-2 text-white/70 tabular-nums">
        {"★".repeat(sticker.rating || 0)}
        {sticker.previous_rating != null &&
          sticker.previous_rating !== sticker.rating && (
            <span className="ml-1 text-[10px] text-white/40">
              (was {sticker.previous_rating})
            </span>
          )}
      </td>
      <td className="px-3 py-2">
        {sticker.api_football_player_id ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />#
            {sticker.api_football_player_id}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-300/80">
            <XCircle className="w-3.5 h-3.5" />
            Not mapped
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          type="button"
          onClick={onMap}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 hover:border-emerald-400/60 hover:bg-emerald-500/25 transition-colors"
        >
          {sticker.api_football_player_id ? "Re-map" : "Map"}
        </button>
      </td>
    </tr>
  );
}

function MappingModal({ sticker, onClose, onSaved }) {
  // Auto-search defaults to the last word of the sticker name.
  // API-Football's /players/profiles search behaves better with a
  // distinctive surname ("Mbappé", "Bellingham", "Vinícius") than
  // with a full name string. The admin can always edit the query
  // and re-search.
  const initialQuery = useMemo(() => {
    const full = (sticker.name || "").trim();
    if (!full) return "";
    const parts = full.split(/\s+/);
    return parts[parts.length - 1];
  }, [sticker.name]);
  const [query, setQuery] = useState(initialQuery);
  const [candidates, setCandidates] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const runSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 4) {
      setCandidates([]);
      setSearchError("Type at least 4 characters.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `/api/admin/sticker-mapping/search?q=${encodeURIComponent(q.trim())}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      setCandidates(json.candidates || []);
      if ((json.candidates || []).length === 0) {
        setSearchError("No candidates found — try a different spelling.");
      }
    } catch (err) {
      setSearchError(err.message);
      setCandidates([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Auto-search on open with the sticker's name.
  useEffect(() => {
    runSearch(initialQuery);
  }, [initialQuery, runSearch]);

  const save = async (apiFootballPlayerId) => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/sticker-mapping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sticker_id: sticker.id,
          api_football_player_id: apiFootballPlayerId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      onSaved();
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-3 sm:p-6">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0d0d] text-white shadow-2xl">
        <div className="sticky top-0 bg-[#0d0d0d] border-b border-white/10 p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-1">
              Mapping
            </p>
            <h2 className="text-lg font-bold">{sticker.name}</h2>
            <p className="text-xs text-white/55 mt-0.5">
              {sticker.country} · {sticker.position || "—"}
              {sticker.api_football_player_id
                ? ` · currently mapped to #${sticker.api_football_player_id}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white text-sm"
          >
            Close
          </button>
        </div>

        <div className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/45" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-emerald-400"
                placeholder="Search API-Football by name…"
              />
            </div>
            <button
              type="submit"
              className="text-xs font-bold px-3 py-2 rounded-lg bg-emerald-500 text-[#062013]"
              disabled={searching}
            >
              {searching ? "…" : "Search"}
            </button>
          </form>

          {searching && (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
            </div>
          )}
          {searchError && !searching && (
            <p className="text-sm text-amber-300/80 mb-3">{searchError}</p>
          )}

          {!searching && candidates.length > 0 && (
            <ul className="space-y-2">
              {candidates.map((c) => (
                <li
                  key={c.api_football_player_id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-emerald-400/40 transition-colors"
                >
                  {c.photo && (
                    <img
                      src={c.photo}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover bg-white/10"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{c.name}</p>
                    <p className="text-[11px] text-white/55 truncate">
                      {[
                        c.nationality,
                        c.position,
                        c.birth_date
                          ? `b. ${c.birth_date}`
                          : c.age != null
                            ? `${c.age}y`
                            : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => save(c.api_football_player_id)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 hover:border-emerald-400/70 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                  >
                    Select #{c.api_football_player_id}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {saveError && (
            <p className="text-sm text-red-300 mt-3">{saveError}</p>
          )}

          {sticker.api_football_player_id && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-xs text-white/50">
                Currently mapped to #{sticker.api_football_player_id}.
              </p>
              <button
                type="button"
                onClick={() => save(null)}
                disabled={saving}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-400/40 text-red-200 hover:bg-red-500/10 transition-colors"
              >
                Clear mapping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminStickerMappingPage() {
  return (
    <ProtectedRoute>
      <AdminStickerMappingContent />
    </ProtectedRoute>
  );
}
