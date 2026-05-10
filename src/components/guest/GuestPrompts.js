"use client";

import { GuestPromptProvider } from "@/lib/contexts/GuestPromptContext";
import SaveProgressButton from "./SaveProgressButton";
import CoachTipReminder from "./CoachTipReminder";
import HatTrickModal from "./HatTrickModal";
import ExitIntentPrompt from "./ExitIntentPrompt";
import TimeWarningBanner from "./TimeWarningBanner";

/**
 * GuestPrompts - Wrapper component that renders all guest user CTAs.
 * Provides the GuestPromptProvider context and renders all prompt components.
 *
 * CTAs included:
 * 1. SaveProgressButton - Floating button after 1st lesson completion ("Lock in your XP")
 * 2. CoachTipReminder - Motivational coach message after 2nd lesson
 * 3. HatTrickModal - Celebration modal after 3rd lesson completion ("Hat-trick!")
 * 4. ExitIntentPrompt - Desktop-only prompt when mouse leaves viewport
 * 5. TimeWarningBanner - Banners at 30min and 10min remaining
 */
export default function GuestPrompts() {
  return (
    <GuestPromptProvider>
      <GuestPromptsInner />
    </GuestPromptProvider>
  );
}

function GuestPromptsInner() {
  return (
    <>
      {/* Floating save progress button (bottom right) */}
      <SaveProgressButton />

      {/* Coach tip reminder (modal overlay) */}
      <CoachTipReminder />

      {/* Hat-trick celebration modal */}
      <HatTrickModal />

      {/* Exit intent prompt (desktop only) */}
      <ExitIntentPrompt />

      {/* Time warning banners (bottom of screen) */}
      <TimeWarningBanner />
    </>
  );
}
