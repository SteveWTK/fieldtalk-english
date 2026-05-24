// src/lib/hooks/usePlayerSquad.js
//
// Read + persist the user's squad (player_squads row, one per user).
// Hydrates the `positions` JSONB into a `stickersById` lookup so callers
// can render placed sticker cards without an extra fetch.
//
// `save(nextPositions)` performs an optimistic update + upsert. If the
// DB write fails it reverts and surfaces the error in the returned
// `saveError` slot.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function usePlayerSquad(userId) {
  const [positions, setPositions] = useState({}); // { GK: "uuid", ... }
  const [stickersById, setStickersById] = useState({}); // "uuid" → sticker row
  const [formation, setFormation] = useState("4-3-3");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Initial fetch — pulls the squad row then resolves the referenced
  // sticker rows in a single follow-up query.
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: squad, error } = await supabase
        .from("player_squads")
        .select("formation, positions")
        .eq("player_id", userId)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error("[usePlayerSquad] fetch error:", error);
        setPositions({});
        setStickersById({});
        setLoading(false);
        return;
      }

      const pos = squad?.positions || {};
      setPositions(pos);
      setFormation(squad?.formation || "4-3-3");

      const stickerIds = Object.values(pos).filter(Boolean);
      if (stickerIds.length === 0) {
        setStickersById({});
        setLoading(false);
        return;
      }
      const { data: stickers, error: stickersError } = await supabase
        .from("sticker_players")
        .select("*")
        .in("id", stickerIds);
      if (cancelled) return;
      if (stickersError) {
        console.error("[usePlayerSquad] stickers fetch error:", stickersError);
        setStickersById({});
      } else {
        const byId = {};
        for (const s of stickers || []) byId[s.id] = s;
        setStickersById(byId);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Optimistic save — flip local state immediately so the UI feels
  // instant, then upsert. Roll back on error.
  const save = useCallback(
    async (nextPositions, options = {}) => {
      if (!userId) return false;
      const prev = positions;
      setPositions(nextPositions);
      setSaving(true);
      setSaveError(null);

      const supabase = createClient();
      const payload = {
        player_id: userId,
        formation: options.formation || formation,
        positions: nextPositions,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("player_squads")
        .upsert(payload, { onConflict: "player_id" });

      setSaving(false);
      if (error) {
        console.error("[usePlayerSquad] save error:", error);
        setPositions(prev);
        setSaveError(error.message || "Could not save squad");
        return false;
      }
      return true;
    },
    [userId, positions, formation]
  );

  // Squad Value = sum of ratings across placed stickers.
  const squadValue = useMemo(() => {
    let total = 0;
    for (const stickerId of Object.values(positions)) {
      if (!stickerId) continue;
      const s = stickersById[stickerId];
      if (s?.rating) total += s.rating;
    }
    return total;
  }, [positions, stickersById]);

  // Reverse lookup: which slot does this sticker currently occupy?
  const slotOfSticker = useCallback(
    (stickerId) => {
      if (!stickerId) return null;
      const entry = Object.entries(positions).find(
        ([, id]) => id === stickerId
      );
      return entry ? entry[0] : null;
    },
    [positions]
  );

  // Apply changes locally + persist. Caller passes a function that
  // receives the current `positions` and returns the next.
  const update = useCallback(
    async (mutator) => {
      const next = mutator({ ...positions });
      // Local stickersById may be missing newly-placed stickers — caller
      // is expected to pass full sticker objects via `setSticker` (below)
      // before/after if it wants the live preview to include them.
      return save(next);
    },
    [positions, save]
  );

  // Inject a sticker into the local lookup so the UI can render its
  // card right after placement, before any refetch.
  const cacheSticker = useCallback((sticker) => {
    if (!sticker?.id) return;
    setStickersById((prev) => ({ ...prev, [sticker.id]: sticker }));
  }, []);

  return {
    positions,
    stickersById,
    formation,
    squadValue,
    loading,
    saving,
    saveError,
    save,
    update,
    cacheSticker,
    slotOfSticker,
  };
}
