// src/lib/broadcasts/segments.js
//
// Segment filter → recipient list. Two entry points:
//
//   countMatchingRecipients(supabase, filter)
//     → returns just the count. Used by the compose form's live
//        "will send to N people" preview.
//
//   fetchMatchingRecipients(supabase, filter)
//     → returns the actual rows { id, phone_e164, preferred_language }
//        Used at fan-out time (when admin clicks Send) to create
//        the whatsapp_broadcast_recipients rows.
//
// Baseline eligibility (always enforced, regardless of filter):
//   - whatsapp_opted_in = true
//   - phone_e164 IS NOT NULL
//   - whatsapp_agent_paused = false
// Any filter is layered on top of these. Rationale: someone who has
// opted out or been paused by an admin must NEVER receive a broadcast,
// full stop — filter authors can't accidentally re-include them.
//
// Filter fields (all optional; missing = no restriction):
//   edition               — string ("propath_26_27" | "wc2026")
//   subscription_statuses — array of strings ["active", "trialing", ...]
//   nudge_frequencies     — array of strings ["daily", "every_3_days", ...]
//   languages             — array of strings ["pt", "en"] — matches
//                            player.preferred_language. If the broadcast
//                            body only has {pt}, target should be
//                            ["pt"] to skip anyone else.
//   positions             — array of strings ["GK", "CB", ...]
//   propath_goals         — array of strings ["trials", "academy", ...]
//   onboarding_completed  — boolean
//
// Note on the count-vs-fetch split: the two functions build separate
// queries and each call .select() exactly ONCE. An earlier version
// tried to share a baseQuery() that pre-selected then chained a second
// .select() with { count: 'exact', head: true } — supabase-js does
// not overlay the count options cleanly on a chained select and the
// preview silently returned 0 while the fetch found rows. Keeping the
// two paths cleanly separate (with a shared filter helper that DOESN'T
// touch .select) avoids that trap.

/**
 * @typedef {{
 *   edition?: string | null,
 *   subscription_statuses?: string[] | null,
 *   nudge_frequencies?: string[] | null,
 *   languages?: string[] | null,
 *   positions?: string[] | null,
 *   propath_goals?: string[] | null,
 *   onboarding_completed?: boolean | null,
 * }} BroadcastFilter
 */

/**
 * Apply baseline eligibility + non-subscription filter clauses to a
 * PostgrestFilterBuilder. Doesn't call .select() — the caller does
 * that once with the columns/options they need.
 */
function applyFilters(q, filter) {
  q = q
    .eq("whatsapp_opted_in", true)
    .eq("whatsapp_agent_paused", false)
    .not("phone_e164", "is", null);

  if (filter?.edition) {
    q = q.eq("edition", filter.edition);
  }
  if (
    Array.isArray(filter?.nudge_frequencies) &&
    filter.nudge_frequencies.length > 0
  ) {
    q = q.in("whatsapp_nudge_frequency", filter.nudge_frequencies);
  }
  if (Array.isArray(filter?.languages) && filter.languages.length > 0) {
    q = q.in("preferred_language", filter.languages);
  }
  if (Array.isArray(filter?.positions) && filter.positions.length > 0) {
    q = q.in("position", filter.positions);
  }
  if (
    Array.isArray(filter?.propath_goals) &&
    filter.propath_goals.length > 0
  ) {
    q = q.in("propath_goal", filter.propath_goals);
  }
  if (typeof filter?.onboarding_completed === "boolean") {
    q = q.eq("onboarding_completed", filter.onboarding_completed);
  }
  return q;
}

/**
 * Fetch subscription-status → allowed player IDs. Returns null when
 * the filter doesn't restrict on subscription (no additional narrowing
 * needed). Returns an empty array when the filter DID restrict but no
 * matching subscriptions exist — caller returns 0/[] immediately.
 */
async function playerIdsMatchingSubscription(supabase, filter) {
  if (
    !Array.isArray(filter?.subscription_statuses) ||
    filter.subscription_statuses.length === 0
  ) {
    return null;
  }
  const { data, error } = await supabase
    .from("player_edition_access")
    .select("player_id")
    .in("status", filter.subscription_statuses);
  if (error) {
    console.error("[broadcasts/segments] subscription filter failed:", error);
    return [];
  }
  return [...new Set((data || []).map((r) => r.player_id).filter(Boolean))];
}

/**
 * Returns the number of players matching the filter + baseline
 * eligibility. Used by the compose preview.
 */
export async function countMatchingRecipients(supabase, filter) {
  const subIds = await playerIdsMatchingSubscription(supabase, filter);
  if (subIds !== null && subIds.length === 0) return 0;

  let q = supabase
    .from("players")
    .select("*", { count: "exact", head: true });
  q = applyFilters(q, filter);
  if (subIds !== null) {
    q = q.in("id", subIds);
  }

  const { count, error } = await q;
  if (error) {
    console.error("[broadcasts/segments] count failed:", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Fetch the actual rows to fan out. Returns players in a
 * deterministic order (created_at ASC) so re-running against the
 * same DB state produces the same recipient set.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   phone_e164: string,
 *   preferred_language: string,
 * }>>}
 */
export async function fetchMatchingRecipients(supabase, filter) {
  const subIds = await playerIdsMatchingSubscription(supabase, filter);
  if (subIds !== null && subIds.length === 0) return [];

  let q = supabase
    .from("players")
    .select("id, phone_e164, preferred_language");
  q = applyFilters(q, filter);
  if (subIds !== null) {
    q = q.in("id", subIds);
  }

  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) {
    console.error("[broadcasts/segments] fetch failed:", error);
    return [];
  }
  return (data || []).map((row) => ({
    id: row.id,
    phone_e164: row.phone_e164,
    preferred_language: row.preferred_language || "pt",
  }));
}
