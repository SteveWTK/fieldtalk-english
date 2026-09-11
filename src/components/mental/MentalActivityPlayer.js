// src/components/mental/MentalActivityPlayer.js
//
// Dispatcher — decides which specialized player to render for a
// given mental_activities row. Keeps the calling code simple:
//
//   <MentalActivityPlayer activity={x} onClose={...} />
//
// The two underlying players share the completion contract
// (POST /api/mental/progress + client-side awardXp) so from the
// caller's perspective they're interchangeable.

"use client";

import MeditationPlayer from "@/components/mental/MeditationPlayer";
import InteractivePlayer from "@/components/mental/InteractivePlayer";

const MEDITATION_TYPES = new Set(["meditation", "silent_timer"]);

export default function MentalActivityPlayer({ activity, onClose, onCompleted }) {
  if (!activity) return null;
  if (MEDITATION_TYPES.has(activity.activity_type)) {
    return (
      <MeditationPlayer
        activity={activity}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }
  return (
    <InteractivePlayer
      activity={activity}
      onClose={onClose}
      onCompleted={onCompleted}
    />
  );
}
