// src/app/(site)/vocabulary/page.js
//
// Personal vocabulary page. Lists every word the user has bookmarked
// from a lesson (vocabulary step or memory-match pair), with search,
// sort, filter, and delete. Feeds the future Game Centre — Vocabulary
// Speed Match will draw from this list.
//
// Adapted from Habitat's equivalent page, but rewritten with:
//   - Bilingual PT/EN copy via useLanguage context (Habitat is EN-only).
//   - FieldTalk's dark theme + lime-accent styling matching the
//     Pro Path dashboard.
//   - FieldTalk-specific fields (tip, cultural_note, skill_axis)
//     surfaced on each card.
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookmarkCheck,
  Trash2,
  Loader2,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Volume2,
  Sparkles,
  Gamepad2,
  Target,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { SKILL_AXES, skillAxisLabel } from "@/lib/lessons/skillAxes";

const COPY = {
  en: {
    back: "Dashboard",
    eyebrow: "My vocabulary",
    title: "Words you've saved",
    loading: "Loading your vocabulary…",
    empty: {
      title: "No words saved yet",
      body: "Tap the bookmark icon on any vocabulary card or matched memory-game pair to save it here. Great for later practice.",
      cta: "Go to lessons",
    },
    searchPlaceholder: "Search…",
    sort: {
      label: "Sort",
      newest: "Newest",
      alphabetical: "A → Z",
      mostPracticed: "Most practiced",
      leastPracticed: "Least practiced",
    },
    filter: {
      label: "Filter",
      all: "All",
      needsPractice: "Needs practice",
      practiced: "Practiced",
    },
    skillFilter: {
      label: "Skill",
      all: "All skills",
    },
    gameCentre: "Practice in Game Centre",
    deleteConfirm: "Remove this word from your vocabulary?",
    countLabel: (n) => (n === 1 ? "1 word" : `${n} words`),
    savedFrom: "From",
    practicedCount: (n) =>
      n === 0
        ? "Not practiced yet"
        : n === 1
          ? "Practiced once"
          : `Practiced ${n} times`,
  },
  pt: {
    back: "Painel",
    eyebrow: "Meu vocabulário",
    title: "Palavras que você salvou",
    loading: "Carregando seu vocabulário…",
    empty: {
      title: "Nenhuma palavra salva ainda",
      body: "Toque no ícone de marcador em qualquer palavra ou par do jogo de memória para salvá-la aqui. Ótimo para praticar depois.",
      cta: "Ir para as aulas",
    },
    searchPlaceholder: "Buscar…",
    sort: {
      label: "Ordenar",
      newest: "Mais recentes",
      alphabetical: "A → Z",
      mostPracticed: "Mais praticadas",
      leastPracticed: "Menos praticadas",
    },
    filter: {
      label: "Filtro",
      all: "Todas",
      needsPractice: "Precisam praticar",
      practiced: "Já praticadas",
    },
    skillFilter: {
      label: "Habilidade",
      all: "Todas as habilidades",
    },
    gameCentre: "Praticar no Game Centre",
    deleteConfirm: "Remover essa palavra do seu vocabulário?",
    countLabel: (n) => (n === 1 ? "1 palavra" : `${n} palavras`),
    savedFrom: "De",
    practicedCount: (n) =>
      n === 0
        ? "Ainda não praticada"
        : n === 1
          ? "Praticada 1 vez"
          : `Praticada ${n} vezes`,
  },
};

function VocabularyPageContent() {
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.pt;

  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  // Skill-axis filter. "all" means don't filter by axis; otherwise
  // it holds one of the SKILL_AXES ids ("pitch_talk", "tactics"…).
  const [skillFilter, setSkillFilter] = useState("all");

  useEffect(() => {
    fetchVocabulary();
  }, []);

  const fetchVocabulary = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vocabulary/personal");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "load_failed");
        return;
      }
      setVocabulary(json.vocabulary || []);
      setError(null);
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(copy.deleteConfirm)) return;
    setDeletingId(id);
    try {
      const res = await fetch(
        `/api/vocabulary/personal?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Delete failed");
      setVocabulary((prev) => prev.filter((w) => w.id !== id));
    } catch {
      // no-op — leave the row visible if delete failed, user can retry
    } finally {
      setDeletingId(null);
    }
  };

  // Distinct axis ids present in the current vocabulary, in the order
  // they appear on the Skill Radar. Used to populate the Skill filter
  // pill — we only surface axes the user actually has saves for, so
  // the dropdown never lists an option that returns zero results.
  const availableAxes = useMemo(() => {
    const seen = new Set(
      vocabulary.map((w) => w.skillAxis).filter((a) => typeof a === "string"),
    );
    return SKILL_AXES.filter((a) => seen.has(a.id)).map((a) => a.id);
  }, [vocabulary]);

  const filteredSorted = useMemo(() => {
    let list = [...vocabulary];

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (w) =>
          (w.english || "").toLowerCase().includes(q) ||
          (w.translation || "").toLowerCase().includes(q),
      );
    }

    if (filterBy === "needsPractice") {
      list = list.filter((w) => (w.timesPracticed || 0) < 3);
    } else if (filterBy === "practiced") {
      list = list.filter((w) => (w.timesPracticed || 0) >= 3);
    }

    if (skillFilter !== "all") {
      list = list.filter((w) => w.skillAxis === skillFilter);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return (a.english || "").localeCompare(b.english || "");
        case "mostPracticed":
          return (b.timesPracticed || 0) - (a.timesPracticed || 0);
        case "leastPracticed":
          return (a.timesPracticed || 0) - (b.timesPracticed || 0);
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });

    return list;
  }, [vocabulary, searchTerm, sortBy, filterBy, skillFilter]);

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {copy.back}
        </Link>

        <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300/80 font-bold">
          {copy.eyebrow}
        </p>
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            {copy.title}
          </h1>
          {!loading && vocabulary.length > 0 && (
            <p className="text-xs text-white/50 font-semibold">
              {copy.countLabel(vocabulary.length)}
            </p>
          )}
        </div>

        {/* Game Centre link — surfaced up top so the user knows they
            can actually PRACTICE the words they've saved, not just look
            at them. Shown even when the list is empty so first-time
            visitors discover the games section. */}
        <Link
          href="/games"
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-400/15 hover:bg-accent-400/25 border border-accent-400/40 text-accent-200 text-sm font-bold transition-colors"
        >
          <Gamepad2 className="w-4 h-4" />
          {copy.gameCentre}
        </Link>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="w-4 h-4 animate-spin" />
            {copy.loading}
          </div>
        ) : vocabulary.length === 0 ? (
          <EmptyState copy={copy} />
        ) : (
          <>
            {/* Search + filter + sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent-400"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <SelectPill
                  icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                  label={copy.filter.label}
                  value={filterBy}
                  onChange={setFilterBy}
                  options={[
                    { value: "all", label: copy.filter.all },
                    { value: "needsPractice", label: copy.filter.needsPractice },
                    { value: "practiced", label: copy.filter.practiced },
                  ]}
                />
                {availableAxes.length > 0 && (
                  <SelectPill
                    icon={<Target className="w-3.5 h-3.5" />}
                    label={copy.skillFilter.label}
                    value={skillFilter}
                    onChange={setSkillFilter}
                    options={[
                      { value: "all", label: copy.skillFilter.all },
                      ...availableAxes.map((id) => ({
                        value: id,
                        label: skillAxisLabel(id, lang, "short"),
                      })),
                    ]}
                  />
                )}
                <SelectPill
                  icon={<ArrowUpDown className="w-3.5 h-3.5" />}
                  label={copy.sort.label}
                  value={sortBy}
                  onChange={setSortBy}
                  options={[
                    { value: "newest", label: copy.sort.newest },
                    { value: "alphabetical", label: copy.sort.alphabetical },
                    { value: "mostPracticed", label: copy.sort.mostPracticed },
                    {
                      value: "leastPracticed",
                      label: copy.sort.leastPracticed,
                    },
                  ]}
                />
              </div>
            </div>

            {error && (
              <div className="mb-3 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
                {error}
              </div>
            )}

            {/* List */}
            <div className="space-y-2">
              {filteredSorted.map((word) => (
                <WordCard
                  key={word.id}
                  word={word}
                  lang={lang}
                  copy={copy}
                  onDelete={handleDelete}
                  deleting={deletingId === word.id}
                />
              ))}
              {filteredSorted.length === 0 && (
                <p className="text-sm text-white/50 text-center py-6">
                  {lang === "pt"
                    ? "Nenhum resultado para o filtro atual."
                    : "No results for the current filter."}
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({ copy }) {
  return (
    <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-accent-400/15 flex items-center justify-center mx-auto mb-3">
        <BookmarkCheck className="w-6 h-6 text-accent-300" />
      </div>
      <h2 className="text-lg font-bold text-white mb-1">{copy.empty.title}</h2>
      <p className="text-sm text-white/60 leading-relaxed max-w-sm mx-auto">
        {copy.empty.body}
      </p>
      <Link
        href="/lesson"
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-bold transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        {copy.empty.cta}
      </Link>
    </section>
  );
}

function WordCard({ word, lang, copy, onDelete, deleting }) {
  const axisLabel = word.skillAxis
    ? skillAxisLabel(word.skillAxis, lang, "short")
    : null;
  // Only render the thumbnail when englishImage is a non-empty, non-
  // whitespace string. Matches the stricter check in VocabularyItem
  // to avoid a briefly-visible bordered box for words saved without
  // an image.
  const hasImage =
    typeof word.englishImage === "string" &&
    word.englishImage.trim().length > 0;
  return (
    <article className="rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-colors p-4">
      <div className="flex items-start justify-between gap-3">
        {hasImage && (
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-white/5">
            <Image
              src={word.englishImage}
              alt={word.english || ""}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-base sm:text-lg font-bold text-white">
              {word.english}
            </p>
            <p className="text-sm text-white/60">·</p>
            <p className="text-sm sm:text-base text-white/80">
              {word.translation}
            </p>
          </div>
          {word.tip && (
            <p className="text-xs text-white/55 mt-1.5 leading-relaxed">
              <span className="font-bold text-accent-300/80">
                {lang === "pt" ? "Dica" : "Tip"}:
              </span>{" "}
              {word.tip}
            </p>
          )}
          {word.culturalNote && (
            <p className="text-xs text-white/55 mt-1 leading-relaxed">
              <span className="font-bold text-accent-300/80">
                {lang === "pt" ? "Contexto" : "Context"}:
              </span>{" "}
              {word.culturalNote}
            </p>
          )}
          <div className="flex items-center gap-x-3 gap-y-1 mt-2 flex-wrap text-[11px] text-white/45">
            {axisLabel && (
              <span className="inline-flex items-center gap-1">
                {copy.savedFrom} <span className="font-bold">{axisLabel}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              {copy.practicedCount(word.timesPracticed || 0)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(word.id)}
          disabled={deleting}
          aria-label={
            lang === "pt" ? "Remover do vocabulário" : "Remove from vocabulary"
          }
          className="text-white/40 hover:text-red-300 transition-colors disabled:opacity-40 shrink-0 p-1.5"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </article>
  );
}

function SelectPill({ icon, label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 hover:border-white/20 transition-colors cursor-pointer">
      <span className="text-white/50">{icon}</span>
      <span className="text-white/50 hidden sm:inline">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-white/90 font-semibold focus:outline-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-primary-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function VocabularyPage() {
  return (
    <ProtectedRoute>
      <VocabularyPageContent />
    </ProtectedRoute>
  );
}
