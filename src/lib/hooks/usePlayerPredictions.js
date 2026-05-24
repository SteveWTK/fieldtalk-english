// src/lib/hooks/usePlayerPredictions.js
//
// Pulls every prediction the signed-in user has submitted. Provides
// derived counts for the dashboard tile + the full list for the
// Predictions Centre page.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function usePlayerPredictions(userId) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) {
      setPredictions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("predictions")
        .select("*")
        .eq("player_id", userId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("[usePlayerPredictions] fetch error:", error);
        setPredictions([]);
      } else {
        setPredictions(data || []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  const counts = useMemo(() => {
    const total = predictions.length;
    const pending = predictions.filter((p) => !p.resolved).length;
    const resolved = total - pending;
    const totalBonusXp = predictions.reduce(
      (sum, p) => sum + (p.xp_bonus || 0),
      0
    );
    return { total, pending, resolved, totalBonusXp };
  }, [predictions]);

  return { predictions, counts, loading, refresh };
}
