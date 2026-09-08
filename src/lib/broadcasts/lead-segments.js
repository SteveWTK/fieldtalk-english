// src/lib/broadcasts/lead-segments.js
//
// Segment filter → lead recipient list. Parallel to segments.js but
// keyed on the `leads` table instead of `players`. Deliberately kept
// as a separate file rather than a mode-switch inside segments.js:
// the fields differ enough (leads have stage, source, tags,
// do_not_contact, lead_type; players have edition, subscriptions,
// nudge prefs) that a merged version would be harder to reason about.
//
// Baseline eligibility (always enforced regardless of filter):
//   - phone_e164 IS NOT NULL
//   - do_not_contact = false
//
// Filter fields (all optional; missing = no restriction):
//   stages         — string[] (e.g. ['new', 'contacted'])
//   types          — string[] of lead_type values
//   sources        — string[]
//   owner          — UUID string of players.id (or 'unassigned')
//   tag            — single tag string
//   has_email      — boolean

/**
 * @typedef {{
 *   stages?: string[] | null,
 *   types?: string[] | null,
 *   sources?: string[] | null,
 *   owner?: string | null,
 *   tag?: string | null,
 *   has_email?: boolean | null,
 * }} LeadFilter
 */

/**
 * Count matching leads. Powers the "will send to N leads" preview
 * on the compose form.
 */
export async function countMatchingLeads(supabase, filter) {
  let query = supabase
    .from("leads")
    .select("id", { count: "exact", head: true });
  query = applyLeadFilter(query, filter);
  const { count, error } = await query;
  if (error) {
    console.error("[lead-segments] count failed:", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Fetch full lead rows for fan-out. Returns just the fields the
 * dispatcher needs — one small trip per broadcast, no join fanout.
 */
export async function fetchMatchingLeads(supabase, filter) {
  let query = supabase.from("leads").select("id, phone_e164, full_name");
  query = applyLeadFilter(query, filter);
  const { data, error } = await query;
  if (error) {
    console.error("[lead-segments] fetch failed:", error);
    return [];
  }
  return data ?? [];
}

function applyLeadFilter(query, filter) {
  // Baseline: has phone + not do-not-contact.
  let q = query
    .not("phone_e164", "is", null)
    .eq("do_not_contact", false);

  if (!filter) return q;

  if (Array.isArray(filter.stages) && filter.stages.length > 0) {
    q = q.in("stage", filter.stages);
  }
  if (Array.isArray(filter.types) && filter.types.length > 0) {
    q = q.in("lead_type", filter.types);
  }
  if (Array.isArray(filter.sources) && filter.sources.length > 0) {
    q = q.in("source", filter.sources);
  }
  if (filter.owner === "unassigned") {
    q = q.is("assigned_to", null);
  } else if (filter.owner) {
    q = q.eq("assigned_to", filter.owner);
  }
  if (filter.tag) {
    q = q.contains("tags", [String(filter.tag).toLowerCase()]);
  }
  if (filter.has_email === true) q = q.not("email", "is", null);
  if (filter.has_email === false) q = q.is("email", null);
  return q;
}
