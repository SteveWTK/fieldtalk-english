// src/lib/hooks/usePersonalVocabulary.js
//
// Shared client-side gateway to /api/vocabulary/personal. Provides:
//
//   - savedEnglishSet   — a Set of lowercase english strings the
//                          user has already saved, so bookmark buttons
//                          can render the "saved" state without
//                          per-word lookups.
//   - saveWord({...})   — optimistic save that updates the Set first,
//                          hits the API, and rolls back on failure.
//   - refresh()         — force a fresh fetch (e.g. after removing on
//                          the /vocabulary page).
//
// One authoritative Set held in the hook's state — a hard-coded
// singleton pattern (no context provider) because saved vocab is
// small (dozens to a few hundred words per user) and refetching on
// mount is cheap. If we ever have thousands of saved words per user,
// promote this to a shared context or SWR-cached fetcher.

"use client";

import { useCallback, useEffect, useState } from "react";

export function usePersonalVocabulary(user) {
  const [saved, setSaved] = useState(() => new Set());
  const [savedById, setSavedById] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSaved(new Set());
      setSavedById(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/vocabulary/personal");
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "load_failed");
        setLoading(false);
        return;
      }
      const items = Array.isArray(json.vocabulary) ? json.vocabulary : [];
      setSaved(
        new Set(items.map((v) => String(v.english || "").toLowerCase())),
      );
      setSavedById(new Map(items.map((v) => [normalise(v.english), v.id])));
      setError(null);
    } catch {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isSaved = useCallback(
    (english) => saved.has(normalise(english)),
    [saved],
  );

  /**
   * Save a word optimistically. Returns { ok, alreadyExists } to let
   * the caller show a "already in your list" toast if desired.
   *
   * Payload shape mirrors what VocabularyItem / MemoryMatch already
   * have — english + translation are required, everything else is
   * optional context that enriches the saved row.
   */
  const saveWord = useCallback(
    async (payload) => {
      const english = String(payload?.english || "").trim();
      const translation = String(payload?.translation || "").trim();
      if (!english || !translation) {
        return { ok: false, error: "missing_fields" };
      }
      const key = normalise(english);

      // Optimistic add — bookmark flips to "saved" immediately.
      const alreadyInSet = saved.has(key);
      if (!alreadyInSet) {
        setSaved((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }

      try {
        const res = await fetch("/api/vocabulary/personal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ english, translation, ...payload }),
        });
        const json = await res.json();
        if (!res.ok) {
          // Roll back the optimistic add.
          if (!alreadyInSet) {
            setSaved((prev) => {
              const next = new Set(prev);
              next.delete(key);
              return next;
            });
          }
          return { ok: false, error: json.error || "save_failed" };
        }
        // Track the id if the server returned it.
        const returnedId = json?.vocabulary?.id ?? json?.id ?? null;
        if (returnedId) {
          setSavedById((prev) => {
            const next = new Map(prev);
            next.set(key, returnedId);
            return next;
          });
        }
        return {
          ok: true,
          alreadyExists: !!json.alreadyExists,
        };
      } catch {
        if (!alreadyInSet) {
          setSaved((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        }
        return { ok: false, error: "network_error" };
      }
    },
    [saved],
  );

  return { isSaved, saveWord, refresh, loading, error, savedById };
}

function normalise(english) {
  return String(english || "")
    .trim()
    .toLowerCase();
}
