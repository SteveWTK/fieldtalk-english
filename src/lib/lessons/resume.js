// src/lib/lessons/resume.js
//
// Lightweight localStorage helpers so a user can leave a lesson mid-way
// (e.g. to open an unlocked sticker pack on the dashboard) and come
// back to the same step they were on.
//
// The XP itself is committed on the server when the user leaves —
// look up player_xp_events with source="lesson_partial" to see what
// has already been credited. This file only tracks the *step* + a
// quick echo of the committed amount + the lesson title for UI labels
// so the dashboard can prompt "Resume your lesson — <title>".
"use client";

const PREFIX = (userId) => `ft_lesson_resume_${userId}_`;
const KEY = (userId, lessonId) => `${PREFIX(userId)}${lessonId}`;

function normaliseCompletedSteps(value) {
  if (!Array.isArray(value)) return null;
  const seen = new Set();
  for (const raw of value) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) seen.add(n);
  }
  return seen.size > 0 ? [...seen].sort((a, b) => a - b) : [];
}

export function getResume(userId, lessonId) {
  if (typeof window === "undefined" || !userId || !lessonId) return null;
  try {
    const raw = window.localStorage.getItem(KEY(userId, lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      currentStep: Number.isFinite(parsed.currentStep) ? parsed.currentStep : 0,
      committedXp: Number.isFinite(parsed.committedXp) ? parsed.committedXp : 0,
      lessonTitle: typeof parsed.lessonTitle === "string" ? parsed.lessonTitle : null,
      // null = legacy entry (pre-completedSteps field); caller falls
      // back to "all earlier steps". Empty array = explicitly "no
      // steps completed yet" (e.g. user opened pack on step 0).
      completedSteps: normaliseCompletedSteps(parsed.completedSteps),
      savedAt: Number.isFinite(parsed.savedAt) ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function setResume(
  userId,
  lessonId,
  { currentStep, committedXp, lessonTitle, completedSteps }
) {
  if (typeof window === "undefined" || !userId || !lessonId) return;
  try {
    window.localStorage.setItem(
      KEY(userId, lessonId),
      JSON.stringify({
        currentStep: Number(currentStep) || 0,
        committedXp: Number(committedXp) || 0,
        lessonTitle: typeof lessonTitle === "string" ? lessonTitle : null,
        // Persist the exact set of completed step indices so the
        // Next-button attempt gate doesn't re-block steps the user
        // had already finished — important for prediction steps
        // where the only completion signal is the save-button
        // onComplete callback, which doesn't re-fire when the
        // lesson reloads and the saved prediction is restored
        // from the predictions table.
        completedSteps: normaliseCompletedSteps(completedSteps) || [],
        savedAt: Date.now(),
      })
    );
  } catch {
    // localStorage may be unavailable (private mode, quota). Resume
    // is a nicety — failing silently is fine.
  }
}

export function clearResume(userId, lessonId) {
  if (typeof window === "undefined" || !userId || !lessonId) return;
  try {
    window.localStorage.removeItem(KEY(userId, lessonId));
  } catch {
    // ignore
  }
}

/**
 * List every resumable lesson for this user, newest first. Used by
 * the dashboard so we can surface a "Resume your lesson" banner /
 * post-pack-open CTA without having to know the lesson id up front.
 */
export function listResumes(userId) {
  if (typeof window === "undefined" || !userId) return [];
  const prefix = PREFIX(userId);
  const out = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const lessonId = key.slice(prefix.length);
      try {
        const parsed = JSON.parse(window.localStorage.getItem(key));
        if (!parsed || typeof parsed !== "object") continue;
        out.push({
          lessonId,
          currentStep: Number(parsed.currentStep) || 0,
          committedXp: Number(parsed.committedXp) || 0,
          lessonTitle:
            typeof parsed.lessonTitle === "string" ? parsed.lessonTitle : null,
          savedAt: Number(parsed.savedAt) || 0,
        });
      } catch {
        // Skip malformed entries.
      }
    }
  } catch {
    return [];
  }
  out.sort((a, b) => b.savedAt - a.savedAt);
  return out;
}
