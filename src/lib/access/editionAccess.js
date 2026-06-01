// src/lib/access/editionAccess.js
//
// Single read-side entry point for "does this player currently have
// access to edition X?". Used by API routes and server components to
// gate paywalled content (the lesson list, /api/lessons/:id, etc.).
//
// The check looks at player_edition_access — the source of truth that
// the Stripe webhook + seat-redemption flow both write into. We treat
// 'active' and 'trialing' as access; 'past_due' / 'canceled' /
// 'incomplete' as no access. The current_period_end belt-and-braces
// guard catches the rare case where a webhook missed the cancel event.
//
// This file is server-side only. It uses the admin client because the
// access table is RLS-locked and we want a single source of access
// truth that doesn't depend on the caller's role.

import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

/**
 * Does this player currently have access to this edition?
 *
 * @param {string} playerId   players.id (== auth.users.id)
 * @param {string} edition    e.g. "wc2026", "championsleague26"
 * @returns {Promise<boolean>}
 */
export async function hasEditionAccess(playerId, edition) {
  if (!playerId || !edition) return false;
  const row = await getEditionAccess(playerId, edition);
  if (!row) return false;
  if (!ACTIVE_STATUSES.has(row.status)) return false;
  if (row.current_period_end) {
    if (new Date(row.current_period_end).getTime() <= Date.now()) {
      return false;
    }
  }
  return true;
}

/**
 * Lower-level lookup that returns the full access row (or null) so
 * callers can show e.g. "your subscription renews on …" or distinguish
 * between trialing and active in the UI. Use hasEditionAccess() when
 * you only need a yes/no.
 *
 * @param {string} playerId
 * @param {string} edition
 * @returns {Promise<null | {
 *   status: string,
 *   source: string,
 *   stripe_subscription_id: string | null,
 *   stripe_price_id: string | null,
 *   current_period_end: string | null,
 *   granted_at: string,
 *   updated_at: string,
 * }>}
 */
export async function getEditionAccess(playerId, edition) {
  if (!playerId || !edition) return null;
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("player_edition_access")
    .select(
      "status, source, stripe_subscription_id, stripe_price_id, current_period_end, granted_at, updated_at"
    )
    .eq("player_id", playerId)
    .eq("edition", edition)
    .maybeSingle();
  if (error) {
    console.error("[editionAccess] lookup error:", error);
    return null;
  }
  return data || null;
}

/**
 * List every edition this player currently has *active* access to.
 * Useful for a "My subscriptions" account page later on.
 */
export async function listActiveEditions(playerId) {
  if (!playerId) return [];
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("player_edition_access")
    .select(
      "edition, status, source, stripe_subscription_id, current_period_end"
    )
    .eq("player_id", playerId)
    .in("status", ["active", "trialing"]);
  if (error) {
    console.error("[editionAccess] list error:", error);
    return [];
  }
  const nowMs = Date.now();
  return (data || []).filter(
    (r) =>
      !r.current_period_end ||
      new Date(r.current_period_end).getTime() > nowMs
  );
}
