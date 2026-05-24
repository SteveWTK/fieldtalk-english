// src/app/api/xp/award/route.js
//
// Server endpoint backing src/lib/xp/awardXp.js. Two writes per request:
//   1. Insert a row into player_xp_events (audit trail + pack-counter source).
//   2. Bump player_progress.total_xp (denormalised running total for fast reads).
//
// Uses the admin client to bypass RLS, but authenticates the caller via
// the session cookie first so users can only award XP to themselves.
//
// Per-request sanity guard caps a single award at 1000 XP — defends against
// runaway client bugs or tampering. Adjust if a legitimate source ever needs
// to exceed this.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const MAX_PER_AWARD = 1000;

export async function POST(request) {
  try {
    const body = await request.json();
    const amount = Math.floor(Number(body.amount));
    const source = String(body.source || "").trim();
    const sourceId = body.source_id ? String(body.source_id) : null;
    const metadata = body.metadata || null;
    // When true, skip the player_progress.total_xp bump and only insert
    // the audit row. Used by callers (e.g. markLessonComplete) that
    // already maintain the running total themselves.
    const eventOnly = body.event_only === true;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (amount > MAX_PER_AWARD) {
      return NextResponse.json(
        { error: `Amount exceeds per-award cap (${MAX_PER_AWARD})` },
        { status: 400 }
      );
    }
    if (!source) {
      return NextResponse.json({ error: "Missing source" }, { status: 400 });
    }

    // Identify the caller from their session cookie.
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin();

    // 1. Audit-trail event row.
    const { error: insertError } = await supabase
      .from("player_xp_events")
      .insert({
        player_id: user.id,
        source,
        source_id: sourceId,
        amount,
        metadata,
      });

    if (insertError) {
      console.error("[xp/award] event insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Could not record XP event" },
        { status: 500 }
      );
    }

    // Caller is maintaining the running total themselves (e.g.
    // markLessonComplete); return without touching player_progress.
    if (eventOnly) {
      return NextResponse.json({ ok: true, awarded: amount, total: null });
    }

    // 2. Bump denormalised running total. If the user has no progress row
    //    yet, create one. We do this with two queries rather than an RPC
    //    so this works without any custom SQL functions.
    const { data: existing, error: selectError } = await supabase
      .from("player_progress")
      .select("total_xp")
      .eq("player_id", user.id)
      .maybeSingle();

    if (selectError) {
      console.error("[xp/award] progress select error:", selectError);
      // Event already recorded — fail soft, total can be recomputed later.
      return NextResponse.json({ ok: true, awarded: amount, total: null });
    }

    let newTotal;
    if (existing) {
      const next = (existing.total_xp || 0) + amount;
      const { error: updateError } = await supabase
        .from("player_progress")
        .update({ total_xp: next, updated_at: new Date().toISOString() })
        .eq("player_id", user.id);
      if (updateError) {
        console.error("[xp/award] progress update error:", updateError);
        return NextResponse.json({ ok: true, awarded: amount, total: null });
      }
      newTotal = next;
    } else {
      const { error: insertProgressError } = await supabase
        .from("player_progress")
        .insert({ player_id: user.id, total_xp: amount });
      if (insertProgressError) {
        console.error("[xp/award] progress insert error:", insertProgressError);
        return NextResponse.json({ ok: true, awarded: amount, total: null });
      }
      newTotal = amount;
    }

    return NextResponse.json({ ok: true, awarded: amount, total: newTotal });
  } catch (err) {
    console.error("[xp/award] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
