// src/lib/lessons/resume.js
//
// Lightweight localStorage helpers so a user can leave a lesson mid-way
// (e.g. to open an unlocked sticker pack on the dashboard) and come
// back to the same step they were on.
//
// The XP itself is committed on the server when the user leaves —
// look up player_xp_events with source="lesson_partial" to see what
// has already been credited. This file only tracks the *step* + a
// quick echo of the committed amount so the resume restore is cheap.
"use client";

const KEY = (userId, lessonId) => `ft_lesson_resume_${userId}_${lessonId}`;

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
      savedAt: Number.isFinite(parsed.savedAt) ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export function setResume(userId, lessonId, { currentStep, committedXp }) {
  if (typeof window === "undefined" || !userId || !lessonId) return;
  try {
    window.localStorage.setItem(
      KEY(userId, lessonId),
      JSON.stringify({
        currentStep: Number(currentStep) || 0,
        committedXp: Number(committedXp) || 0,
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
