// src/lib/soundEffects.js
// Lightweight sound utility — uses the Web Audio API for procedural success
// and error tones (no audio files needed), plus a helper for playing external
// audio file URLs (e.g. vocabulary word pronunciations).
"use client";

let audioContext = null;
let currentAudioFile = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  try {
    if (!audioContext) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioContext = new Ctor();
    }
    // iOS Safari often starts AudioContext suspended until a user gesture
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  } catch {
    return null;
  }
}

// Generic tone with attack/decay envelope. Sine for pure, triangle for brighter.
function playTone(
  ctx,
  { freq, delay = 0, duration = 0.2, vol = 0.12, type = "sine" }
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

  const start = ctx.currentTime + delay;
  // Fast attack (5ms), exponential decay over the duration
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration);
}

/**
 * Success: ascending C major triad arpeggio (C5 → E5 → G5). The top note uses
 * a triangle wave for a brighter, more triumphant timbre. Total ~440ms.
 */
export function playSuccessSound() {
  const ctx = getCtx();
  if (!ctx) return;
  playTone(ctx, { freq: 523.25, delay: 0, duration: 0.18, vol: 0.12 });
  playTone(ctx, { freq: 659.25, delay: 0.06, duration: 0.2, vol: 0.12 });
  playTone(ctx, {
    freq: 783.99,
    delay: 0.12,
    duration: 0.32,
    vol: 0.14,
    type: "triangle",
  });
}

/**
 * Cheer: triumphant ascending fanfare (C5 → E5 → G5 → C6) plus a sparkle
 * trill on top. Used to signal completion of a full round / final command.
 */
export function playCheerSound() {
  const ctx = getCtx();
  if (!ctx) return;
  // Main fanfare
  playTone(ctx, { freq: 523.25, delay: 0, duration: 0.18, vol: 0.13 });
  playTone(ctx, { freq: 659.25, delay: 0.08, duration: 0.18, vol: 0.13 });
  playTone(ctx, { freq: 783.99, delay: 0.16, duration: 0.22, vol: 0.14 });
  playTone(ctx, {
    freq: 1046.5,
    delay: 0.26,
    duration: 0.45,
    vol: 0.16,
    type: "triangle",
  });
  // Sparkle trill above
  playTone(ctx, { freq: 1318.5, delay: 0.4, duration: 0.1, vol: 0.09 });
  playTone(ctx, { freq: 1567.98, delay: 0.5, duration: 0.1, vol: 0.09 });
  playTone(ctx, {
    freq: 1975.53,
    delay: 0.6,
    duration: 0.18,
    vol: 0.11,
    type: "triangle",
  });
}

/**
 * Goal cheer: plays a recorded stadium-crowd-roar audio file. Used by
 * InteractiveGameFormation when the user successfully selects a slot
 * whose id is "GOAL". Drop the file at /public/audio/effects/goal-cheer.mp3
 * (any web-playable format is fine — adjust the path if needed).
 *
 * If the file is missing or fails to load, we fall back to playCheerSound()
 * so the user still gets a celebratory sound.
 */
export function playGoalCheerSound() {
  if (typeof window === "undefined") return;
  try {
    if (currentAudioFile) {
      currentAudioFile.pause();
      currentAudioFile.currentTime = 0;
    }
    const audio = new Audio("/audio/effects/goal-cheer.mp3");
    currentAudioFile = audio;
    audio.volume = 0.85;
    audio.onerror = () => playCheerSound();
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => playCheerSound());
    }
  } catch {
    playCheerSound();
  }
}

/**
 * Error: soft descending pair (A3 → F#3) at low volume. Brief and unobtrusive.
 */
export function playErrorSound() {
  const ctx = getCtx();
  if (!ctx) return;
  playTone(ctx, { freq: 220, delay: 0, duration: 0.1, vol: 0.1 });
  playTone(ctx, { freq: 185, delay: 0.06, duration: 0.14, vol: 0.1 });
}

/**
 * Play an external audio file (e.g. vocabulary word pronunciation).
 * If a previous file is still playing, it's stopped first so plays don't pile up.
 */
export function playAudioFile(url) {
  if (typeof window === "undefined" || !url) return;
  try {
    if (currentAudioFile) {
      currentAudioFile.pause();
      currentAudioFile.currentTime = 0;
    }
    const audio = new Audio(url);
    currentAudioFile = audio;
    audio.volume = 0.85;
    const p = audio.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        // Autoplay blocked or file failed to load — fail silently
      });
    }
  } catch {
    // ignore
  }
}
