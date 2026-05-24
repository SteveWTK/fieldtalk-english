// src/lib/hooks/useAppSettings.js
//
// Reads the single-row public.app_settings table, which holds tunable
// runtime knobs (pack_xp_cost today; more later). Cached per-mount; no
// real-time subscription — settings change rarely.
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const DEFAULTS = {
  pack_xp_cost: 200,
};

export function useAppSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("app_settings")
          .select("*")
          .eq("id", "singleton")
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          setSettings(DEFAULTS);
        } else {
          setSettings({ ...DEFAULTS, ...data });
        }
      } catch {
        if (!cancelled) setSettings(DEFAULTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading };
}
