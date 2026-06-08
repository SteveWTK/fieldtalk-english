// src/app/api/admin/partner-tracking/events/route.js
//
// GET /api/admin/partner-tracking/events
//
// Returns a flat, sortable, filterable list of partner-attributed
// USER ACTIONS — designed to power the drill-down table on the
// admin Partner Tracking page. The sibling /api/admin/partner-
// tracking route still owns the headline aggregates; this one
// answers "who specifically did what for partner X".
//
// Three event types are emitted, one row each:
//
//   type: "seat_redemption"
//     A user redeemed a partner-issued seat licence code. Partner
//     identity comes from seat_licenses.partner_name. occurred_at =
//     seat_redemptions.redeemed_at.
//
//   type: "promo_purchase"
//     A user paid via Stripe with a partner-branded promo code.
//     Partner identity comes from partner_promo_prefixes (joined on
//     player_edition_access.promo_code_prefix). occurred_at =
//     player_edition_access.granted_at.
//
//   type: "branch_signup"
//     A user signed up via a /wc2026?branch=<slug> link. Partner
//     identity comes from the slug, normalised to the human-
//     readable branch.alt via BRANCHES. occurred_at = players.created_at.
//     `paid` flag indicates whether they've since paid via Stripe
//     (with or without a promo code).
//
// We limit to the most recent ~500 events and sort newest-first.
// Once Cultura + a few other partners push the volume past that,
// we add server-side filter params and pagination.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { BRANCHES } from "@/lib/branches";

const EVENTS_LIMIT = 500;

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;
    const supabase = guard.supabase;

    // ── Pull the three data sources in parallel ──
    const [
      redemptionsRes,
      promoAccessRes,
      prefixesRes,
      branchPlayersRes,
      accessViewRes,
    ] = await Promise.all([
      // Seat redemptions joined with their licence so we get the
      // partner name + edition without a second lookup.
      supabase
        .from("seat_redemptions")
        .select(
          "id, player_id, redeemed_at, license_id, seat_licenses(partner_name, edition, code)"
        )
        .order("redeemed_at", { ascending: false })
        .limit(EVENTS_LIMIT),
      // Promo-coded access rows. The webhook stamps the promotion
      // code text + its prefix when the user completes checkout.
      supabase
        .from("player_edition_access")
        .select(
          "id, player_id, edition, granted_at, promotion_code, promo_code_prefix, source, status, current_period_end"
        )
        .not("promo_code_prefix", "is", null)
        .order("granted_at", { ascending: false })
        .limit(EVENTS_LIMIT),
      // Prefix → partner-name lookup (sparse, fine to load in full).
      supabase
        .from("partner_promo_prefixes")
        .select("prefix, partner_name"),
      // Branch-link signups. Each player whose partner_referrer is
      // non-null counts as one branch_signup event at their sign-up
      // time.
      supabase
        .from("players")
        .select("id, full_name, email, partner_referrer, created_at")
        .not("partner_referrer", "is", null)
        .order("created_at", { ascending: false })
        .limit(EVENTS_LIMIT),
      // v_players_full_access from GO_LIVE_POLISH.sql — gives us
      // current access status + source per player, derived from
      // player_edition_access with expiry handling baked in.
      supabase
        .from("v_players_full_access")
        .select("player_id, has_full_access, access_source, access_until"),
    ]);

    for (const r of [
      redemptionsRes,
      promoAccessRes,
      prefixesRes,
      branchPlayersRes,
      accessViewRes,
    ]) {
      if (r.error) {
        console.error("[partner-tracking/events] sub-fetch error:", r.error);
        return NextResponse.json(
          { error: r.error.message || "Could not load events" },
          { status: 500 }
        );
      }
    }

    // ── Pull player names/emails for every player referenced ──
    // The redemption + promo sources don't carry these; fetch in one
    // batch so the response is self-contained for the UI.
    const playerIdSet = new Set();
    for (const r of redemptionsRes.data || []) playerIdSet.add(r.player_id);
    for (const r of promoAccessRes.data || []) playerIdSet.add(r.player_id);
    for (const r of branchPlayersRes.data || []) playerIdSet.add(r.id);
    const playerIds = Array.from(playerIdSet);

    let playerById = new Map();
    if (playerIds.length > 0) {
      const { data: playerRows } = await supabase
        .from("players")
        .select("id, full_name, email")
        .in("id", playerIds);
      playerById = new Map((playerRows || []).map((p) => [p.id, p]));
    }

    // ── Lookups ──
    const prefixToPartner = new Map(
      (prefixesRes.data || []).map((p) => [
        p.prefix.toUpperCase(),
        p.partner_name,
      ])
    );
    const accessByPlayer = new Map(
      (accessViewRes.data || []).map((a) => [
        a.player_id,
        {
          has: !!a.has_full_access,
          source: a.access_source || null,
          until: a.access_until || null,
        },
      ])
    );

    const playerLabel = (id) => {
      const p = playerById.get(id);
      const name = p?.full_name || p?.email?.split("@")[0] || "Player";
      return { name, email: p?.email || null };
    };

    // Resolve a branch slug to a canonical partner name. Falls back
    // to the raw slug ("fortaleza") if the slug isn't registered in
    // BRANCHES yet — useful so a partner who's been linked-to but
    // not yet added to branches.js still groups its own events.
    const branchSlugToPartnerName = (slug) => {
      const branch = BRANCHES[slug];
      return branch?.alt || slug;
    };

    // ── Build the event rows ──
    const events = [];

    // 1. Seat redemptions
    for (const r of redemptionsRes.data || []) {
      const { name, email } = playerLabel(r.player_id);
      const access = accessByPlayer.get(r.player_id);
      events.push({
        id: `seat-${r.id}`,
        type: "seat_redemption",
        player_id: r.player_id,
        player_name: name,
        player_email: email,
        partner_name: r.seat_licenses?.partner_name || "(unattributed)",
        edition: r.seat_licenses?.edition || null,
        detail: r.seat_licenses?.code
          ? `Code: ${r.seat_licenses.code}`
          : null,
        occurred_at: r.redeemed_at,
        has_full_access: !!access?.has,
        access_source: access?.source || null,
      });
    }

    // 2. Promo-coded purchases
    for (const a of promoAccessRes.data || []) {
      const { name, email } = playerLabel(a.player_id);
      const partner =
        prefixToPartner.get((a.promo_code_prefix || "").toUpperCase()) ||
        `(prefix: ${a.promo_code_prefix})`;
      const access = accessByPlayer.get(a.player_id);
      events.push({
        id: `promo-${a.id}`,
        type: "promo_purchase",
        player_id: a.player_id,
        player_name: name,
        player_email: email,
        partner_name: partner,
        edition: a.edition || null,
        detail: a.promotion_code ? `Code: ${a.promotion_code}` : null,
        occurred_at: a.granted_at,
        has_full_access: !!access?.has,
        access_source: access?.source || null,
      });
    }

    // 3. Branch-link signups
    for (const p of branchPlayersRes.data || []) {
      const access = accessByPlayer.get(p.id);
      const partnerName = branchSlugToPartnerName(p.partner_referrer);
      events.push({
        id: `branch-${p.id}`,
        type: "branch_signup",
        player_id: p.id,
        player_name:
          p.full_name || p.email?.split("@")[0] || "Player",
        player_email: p.email || null,
        partner_name: partnerName,
        edition: null,
        detail: `Branch: ${p.partner_referrer}`,
        occurred_at: p.created_at,
        has_full_access: !!access?.has,
        access_source: access?.source || null,
      });
    }

    // ── Sort newest first, cap to limit ──
    events.sort((a, b) => {
      const ta = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
      const tb = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
      return tb - ta;
    });
    const trimmed = events.slice(0, EVENTS_LIMIT);

    // ── Distinct partner list for the UI filter dropdown ──
    const partnerSet = new Set();
    for (const e of trimmed) {
      if (e.partner_name && !e.partner_name.startsWith("(")) {
        partnerSet.add(e.partner_name);
      }
    }

    return NextResponse.json({
      ok: true,
      events: trimmed,
      partners: Array.from(partnerSet).sort(),
      totals: {
        seat_redemption: trimmed.filter((e) => e.type === "seat_redemption")
          .length,
        promo_purchase: trimmed.filter((e) => e.type === "promo_purchase")
          .length,
        branch_signup: trimmed.filter((e) => e.type === "branch_signup")
          .length,
      },
      limit: EVENTS_LIMIT,
      truncated: events.length > EVENTS_LIMIT,
    });
  } catch (err) {
    console.error("[partner-tracking/events] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
