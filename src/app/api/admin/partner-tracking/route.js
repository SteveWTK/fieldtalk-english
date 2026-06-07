// src/app/api/admin/partner-tracking/route.js
//
// GET /api/admin/partner-tracking
//
// Aggregates the three Full Access attribution paths so the
// admin attribution page can render a per-partner roll-up:
//
//   1. Seat redemptions          (seat_licenses → seat_redemptions)
//   2. Promo-code purchases      (player_edition_access.promo_code_prefix
//                                  → partner_promo_prefixes.partner_name)
//   3. Direct branch-link signups (players.partner_referrer
//                                  + their player_edition_access rows)
//
// Per-path counts come back as separate arrays — partner identifiers
// across the three paths don't auto-correlate (one's a full
// descriptive name, one's a slug, one's a typed prefix), so we let
// the admin UI render them in three tables and the admin can
// mentally reconcile. A future iteration can add a `partner_id`
// canonical key once we onboard partner #5 or so.
//
// Auth: platform_admin only. Every read uses the service-role client
// to bypass RLS — the data spans multiple users.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;
    const supabase = guard.supabase;

    // ── Path 1: seat redemptions ──
    // One row per redemption. We aggregate to (partner, edition).
    const { data: redemptions, error: redemptionsError } = await supabase
      .from("seat_redemptions")
      .select(
        "id, redeemed_at, player_id, license_id, seat_licenses(partner_name, edition)"
      );
    if (redemptionsError) {
      console.error("[partner-tracking] redemptions error:", redemptionsError);
      return NextResponse.json(
        { error: "Could not load redemptions" },
        { status: 500 }
      );
    }
    const seatPartners = new Map();
    for (const row of redemptions || []) {
      const partner = row.seat_licenses?.partner_name || "(unattributed)";
      const edition = row.seat_licenses?.edition || "—";
      const key = `${partner}::${edition}`;
      const entry = seatPartners.get(key) || {
        partner_name: partner,
        edition,
        redemptions: 0,
        last_at: null,
        player_ids: [],
      };
      entry.redemptions += 1;
      entry.last_at = mostRecent(entry.last_at, row.redeemed_at);
      if (row.player_id) entry.player_ids.push(row.player_id);
      seatPartners.set(key, entry);
    }

    // ── Path 2: promo-code purchases ──
    // player_edition_access rows where the webhook stamped a
    // promo_code_prefix. Join in JS against partner_promo_prefixes
    // so we can also surface "unmapped prefixes" the admin needs to
    // categorise.
    const [accessRes, prefixesRes] = await Promise.all([
      supabase
        .from("player_edition_access")
        .select(
          "id, player_id, edition, granted_at, promotion_code, promo_code_prefix, source"
        )
        .not("promo_code_prefix", "is", null),
      supabase
        .from("partner_promo_prefixes")
        .select("prefix, partner_name, created_at"),
    ]);
    if (accessRes.error) {
      console.error("[partner-tracking] access error:", accessRes.error);
      return NextResponse.json(
        { error: "Could not load access rows" },
        { status: 500 }
      );
    }
    if (prefixesRes.error) {
      console.error("[partner-tracking] prefixes error:", prefixesRes.error);
      // Don't fail the whole call — we can still show the raw prefixes
      // and label them "(unmapped)".
    }
    const prefixToPartner = new Map(
      (prefixesRes.data || []).map((p) => [p.prefix.toUpperCase(), p.partner_name])
    );
    const promoPartners = new Map();
    const unmappedPrefixes = new Set();
    for (const row of accessRes.data || []) {
      const upper = (row.promo_code_prefix || "").toUpperCase();
      const partner = prefixToPartner.get(upper) || null;
      if (!partner) unmappedPrefixes.add(upper);
      const key = partner || `(prefix: ${upper})`;
      const entry = promoPartners.get(key) || {
        partner_name: partner || "(unmapped)",
        prefix: upper,
        purchases: 0,
        last_at: null,
        player_ids: [],
      };
      entry.purchases += 1;
      entry.last_at = mostRecent(entry.last_at, row.granted_at);
      if (row.player_id) entry.player_ids.push(row.player_id);
      promoPartners.set(key, entry);
    }

    // ── Path 3: direct branch-link signups ──
    // Group players by partner_referrer. For each branch, count
    // total signups and how many of them have paid edition access.
    const { data: branchPlayers, error: branchError } = await supabase
      .from("players")
      .select("id, partner_referrer, created_at")
      .not("partner_referrer", "is", null);
    if (branchError) {
      console.error("[partner-tracking] branchPlayers error:", branchError);
      return NextResponse.json(
        { error: "Could not load branch signups" },
        { status: 500 }
      );
    }

    const branchPlayerIds = (branchPlayers || []).map((p) => p.id);
    const paidPlayerIds = new Set();
    if (branchPlayerIds.length > 0) {
      const { data: paidRows } = await supabase
        .from("player_edition_access")
        .select("player_id, source, status")
        .in("player_id", branchPlayerIds)
        .in("source", ["subscription", "one_time_purchase"])
        .in("status", ["active", "trialing"]);
      for (const r of paidRows || []) paidPlayerIds.add(r.player_id);
    }
    const branchPartners = new Map();
    for (const p of branchPlayers || []) {
      const slug = p.partner_referrer;
      const entry = branchPartners.get(slug) || {
        slug,
        signups: 0,
        paid: 0,
        first_at: null,
        last_at: null,
      };
      entry.signups += 1;
      if (paidPlayerIds.has(p.id)) entry.paid += 1;
      entry.first_at = oldest(entry.first_at, p.created_at);
      entry.last_at = mostRecent(entry.last_at, p.created_at);
      branchPartners.set(slug, entry);
    }

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      seat_redemptions: Array.from(seatPartners.values()).sort(
        (a, b) => b.redemptions - a.redemptions
      ),
      promo_code_purchases: Array.from(promoPartners.values()).sort(
        (a, b) => b.purchases - a.purchases
      ),
      direct_referrals: Array.from(branchPartners.values()).sort(
        (a, b) => b.signups - a.signups
      ),
      unmapped_prefixes: Array.from(unmappedPrefixes),
      // High-level totals for the page header.
      totals: {
        seat_redemptions: (redemptions || []).length,
        promo_code_purchases: (accessRes.data || []).length,
        direct_signups: (branchPlayers || []).length,
        direct_paid: paidPlayerIds.size,
      },
    });
  } catch (err) {
    console.error("[partner-tracking] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// ── tiny date helpers (kept here to avoid a util file just for two
// one-liners) ──
function mostRecent(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}
function oldest(a, b) {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}
