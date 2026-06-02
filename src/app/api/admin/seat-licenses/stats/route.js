// src/app/api/admin/seat-licenses/stats/route.js
//
// GET /api/admin/seat-licenses/stats?since=ISO&until=ISO
//
// Per-partner roll-up for the admin dashboard. Combines:
//   - all seat_licenses (totals, capacity, usage)
//   - seat_redemptions within the requested date range (counts +
//     timestamps for the "redemptions this billing period" column)
//
// Two queries, aggregated server-side. We expect a few partners ×
// a few hundred licences total, so a single fetch + JS reduce is
// the right shape — no SQL view needed.
//
// Response:
//   {
//     dateRange: { since, until },
//     partners: [{
//       partner_name,
//       contact_email,
//       editions: ["wc2026"],
//       license_count,
//       seats_total,
//       seats_used,
//       seats_remaining,
//       redemptions_in_range,
//       most_recent_redemption_at,
//     }],
//     totals: { license_count, seats_total, seats_used, redemptions_in_range }
//   }

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export async function GET(request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { supabase } = guard;

  const url = new URL(request.url);
  // Default: current calendar month. Convert any malformed input to
  // null so the query falls back to "all time" rather than 500ing.
  const now = new Date();
  const defaultSince = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultUntil = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59
  ).toISOString();
  const since = parseISO(url.searchParams.get("since")) || defaultSince;
  const until = parseISO(url.searchParams.get("until")) || defaultUntil;

  // ── Pull licences + in-range redemptions in parallel ──
  const [licensesRes, redemptionsRes] = await Promise.all([
    supabase
      .from("seat_licenses")
      .select(
        "id, partner_name, contact_email, edition, seats_total, seats_used, valid_until, notes, created_at"
      )
      .order("partner_name", { ascending: true }),
    supabase
      .from("seat_redemptions")
      .select("license_id, redeemed_at")
      .gte("redeemed_at", since)
      .lte("redeemed_at", until),
  ]);

  if (licensesRes.error) {
    console.error(
      "[admin/seat-licenses/stats] licences error:",
      licensesRes.error
    );
    return NextResponse.json(
      { error: licensesRes.error.message || "Could not load licences" },
      { status: 500 }
    );
  }
  if (redemptionsRes.error) {
    console.error(
      "[admin/seat-licenses/stats] redemptions error:",
      redemptionsRes.error
    );
    return NextResponse.json(
      { error: redemptionsRes.error.message || "Could not load redemptions" },
      { status: 500 }
    );
  }

  const licenses = licensesRes.data || [];
  const redemptions = redemptionsRes.data || [];

  // license_id → in-range redemption count + max redeemed_at
  const redemptionsByLicense = new Map();
  for (const r of redemptions) {
    const slot = redemptionsByLicense.get(r.license_id) || {
      count: 0,
      latest: null,
    };
    slot.count += 1;
    if (!slot.latest || new Date(r.redeemed_at) > new Date(slot.latest)) {
      slot.latest = r.redeemed_at;
    }
    redemptionsByLicense.set(r.license_id, slot);
  }

  // Group licences by partner_name + roll up.
  const partners = new Map();
  for (const l of licenses) {
    const slot =
      partners.get(l.partner_name) ||
      {
        partner_name: l.partner_name,
        contact_email: l.contact_email || null,
        editions: new Set(),
        license_count: 0,
        seats_total: 0,
        seats_used: 0,
        redemptions_in_range: 0,
        most_recent_redemption_at: null,
      };
    slot.editions.add(l.edition);
    slot.license_count += 1;
    slot.seats_total += Number(l.seats_total) || 0;
    slot.seats_used += Number(l.seats_used) || 0;
    // Carry the first non-null contact_email we see for this partner.
    if (!slot.contact_email && l.contact_email) {
      slot.contact_email = l.contact_email;
    }
    const r = redemptionsByLicense.get(l.id);
    if (r) {
      slot.redemptions_in_range += r.count;
      if (
        !slot.most_recent_redemption_at ||
        new Date(r.latest) > new Date(slot.most_recent_redemption_at)
      ) {
        slot.most_recent_redemption_at = r.latest;
      }
    }
    partners.set(l.partner_name, slot);
  }

  const partnerList = [...partners.values()]
    .map((p) => ({
      ...p,
      editions: [...p.editions].sort(),
      seats_remaining: Math.max(0, p.seats_total - p.seats_used),
    }))
    // Most active partners first — those with the most in-range
    // redemptions, falling back to seats_used for ties.
    .sort(
      (a, b) =>
        b.redemptions_in_range - a.redemptions_in_range ||
        b.seats_used - a.seats_used
    );

  const totals = partnerList.reduce(
    (acc, p) => ({
      license_count: acc.license_count + p.license_count,
      seats_total: acc.seats_total + p.seats_total,
      seats_used: acc.seats_used + p.seats_used,
      redemptions_in_range: acc.redemptions_in_range + p.redemptions_in_range,
    }),
    {
      license_count: 0,
      seats_total: 0,
      seats_used: 0,
      redemptions_in_range: 0,
    }
  );

  return NextResponse.json({
    dateRange: { since, until },
    partners: partnerList,
    totals,
  });
}

function parseISO(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
