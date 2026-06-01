// src/lib/access/usePlayerAccess.js
//
// Client-side hook wrapping GET /api/access/me. Returns the caller's
// access status for an edition + the set of preview lesson ids that
// non-paying users can still view.
//
// One call per (userId, edition) combo; refetches if either changes.
// No SWR / react-query dependency — the data is small and stable so
// a plain useState/useEffect is fine.
"use client";

import { useEffect, useState } from "react";

export function usePlayerAccess(edition = null) {
  const [state, setState] = useState({
    loading: true,
    hasAccess: false,
    expiresAt: null,
    edition: edition || null,
    previewLessonIds: [],
    isAdmin: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const fetchAccess = async () => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const params = edition
          ? `?edition=${encodeURIComponent(edition)}`
          : "";
        const res = await fetch(`/api/access/me${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState((s) => ({
            ...s,
            loading: false,
            error: data.error || "Could not load access",
          }));
          return;
        }
        setState({
          loading: false,
          hasAccess: !!data.hasAccess,
          expiresAt: data.expiresAt || null,
          edition: data.edition || edition || null,
          previewLessonIds: Array.isArray(data.previewLessonIds)
            ? data.previewLessonIds
            : [],
          isAdmin: !!data.isAdmin,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err?.message || "Network error",
        }));
      }
    };
    fetchAccess();
    return () => {
      cancelled = true;
    };
  }, [edition]);

  return state;
}

/**
 * Convenience: does the caller have access to this specific lesson?
 * Combines hasAccess with the preview-list lookup so a lesson page
 * can render its paywall with one boolean.
 */
export function canViewLesson(access, lessonId) {
  if (!access) return false;
  if (access.hasAccess) return true;
  if (!lessonId) return false;
  return access.previewLessonIds.includes(lessonId);
}
