// src/lib/hooks/useStickerData.js
//
// Two related reads that the dashboard + album need:
//   - useFullStickerRoster:  every active sticker in the system (for the
//                            album grid; players without a card in their
//                            collection show as dimmed placeholders).
//   - usePlayerCollection:   the signed-in user's collection rows joined
//                            with sticker_players for full card data.
//   - usePackInventory:      packs opened vs available (drives the
//                            dashboard pack-vault tile).
//
// Each hook exposes a `refresh()` so the caller can force a refetch
// after writes (e.g. after opening a pack).
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useFullStickerRoster() {
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sticker_players")
        .select("*")
        .eq("is_active", true)
        .order("country")
        .order("rating", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("[useFullStickerRoster] fetch error:", error);
        setStickers([]);
      } else {
        setStickers(data || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { stickers, loading, refresh };
}

export function usePlayerCollection(userId) {
  const [collection, setCollection] = useState([]); // { quantity, sticker, first_obtained_at }
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) {
      setCollection([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("player_stickers")
        .select("quantity, first_obtained_at, sticker:sticker_id (*)")
        .eq("player_id", userId);
      if (cancelled) return;
      if (error) {
        console.error("[usePlayerCollection] fetch error:", error);
        setCollection([]);
      } else {
        setCollection(data || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  return { collection, loading, refresh };
}

export function usePackInventory(userId, packXpCost, totalXp) {
  const [packsOpened, setPacksOpened] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) {
      setPacksOpened(0);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { count, error } = await supabase
        .from("pack_openings")
        .select("*", { count: "exact", head: true })
        .eq("player_id", userId);
      if (cancelled) return;
      if (error) {
        console.error("[usePackInventory] fetch error:", error);
        setPacksOpened(0);
      } else {
        setPacksOpened(count || 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  const cost = Math.max(1, Number(packXpCost) || 200);
  const xp = Math.max(0, Number(totalXp) || 0);
  const packsEarned = Math.floor(xp / cost);
  const packsAvailable = Math.max(0, packsEarned - packsOpened);
  const xpToNextPack = Math.max(0, cost - (xp % cost));

  return {
    packsOpened,
    packsEarned,
    packsAvailable,
    xpToNextPack,
    loading,
    refresh,
  };
}
