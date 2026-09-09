// src/app/(site)/admin/leads/sequences/page.js
//
// Sequences list — one row per drip campaign, showing step count,
// active enrollments, and last-updated. Click through to the editor.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Play, Pause, ChevronRight, Zap } from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";

export default function SequencesListPage() {
  const { lang } = useLanguage();
  const isPt = lang === "pt";
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/lead-sequences");
      const json = await res.json();
      if (!res.ok) setError(json.error || "load_failed");
      else setSequences(json.sequences || []);
    } catch {
      setError("network");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/lead-sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await res.json();
      if (res.ok) {
        window.location.assign(`/admin/leads/sequences/${json.sequence.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader
          currentView="detail"
          showNewLeadCta={false}
          showViewSwitcher={false}
          backHref="/admin/leads"
        />

        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              {isPt ? "Sequências de mensagens" : "Message sequences"}
            </h2>
            <p className="text-xs text-white/50 mt-1">
              {isPt
                ? "Campanhas de gotejamento — múltiplos toques distribuídos ao longo de dias."
                : "Drip campaigns — a run of touches spaced over days."}
            </p>
          </div>
        </div>

        {/* Quick-create */}
        <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.04] p-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-300" />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={
              isPt
                ? "Nome da nova sequência…"
                : "Name for the new sequence…"
            }
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            {isPt ? "Criar" : "Create"}
          </button>
        </div>

        {loading ? (
          <div className="inline-flex items-center gap-2 text-sm text-white/60">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isPt ? "Carregando…" : "Loading…"}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            Load failed
          </div>
        ) : sequences.length === 0 ? (
          <p className="text-sm text-white/40">
            {isPt
              ? "Nenhuma sequência ainda. Crie uma acima para começar."
              : "No sequences yet. Create one above to get started."}
          </p>
        ) : (
          <div className="space-y-2">
            {sequences.map((s) => (
              <Link
                key={s.id}
                href={`/admin/leads/sequences/${s.id}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05] p-4 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                      s.active
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-white/[0.04] text-white/40"
                    }`}
                  >
                    {s.active ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{s.name}</h3>
                    <p className="text-[11px] text-white/50 mt-0.5">
                      {s.step_count}{" "}
                      {isPt ? "passos" : "steps"} · {s.active_enrollments}{" "}
                      {isPt ? "ativos" : "active"}{" "}
                      {s.description && (
                        <span className="text-white/40"> · {s.description}</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
