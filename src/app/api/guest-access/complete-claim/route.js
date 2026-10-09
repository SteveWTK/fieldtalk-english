// src/app/api/guest-access/complete-claim/route.js
//
// POST /api/guest-access/complete-claim
//   Body: { from_user_id: string }   // the guest's auth user id
//
// Called by /auth/callback right after a guest finishes signing in
// with Google. The browser side had stashed the guest's user id in
// localStorage (`guest_claim_from_id`) before the OAuth redirect;
// now that we're back with a fresh Google-authed user, we re-parent
// the guest's rows (lesson_completions, player_progress) onto the
// new user, then delete the guest's old auth / profile rows so
// they don't dangle.
//
// Safety checks:
//   - Caller must be signed in via Supabase SSR cookies (that's the
//     new Google user). We re-parent TO this user id, not whatever
//     the request body claims.
//   - from_user_id must be verifiable as a guest (@fieldtalk.guest
//     email, or user_metadata.is_guest=true). Prevents a signed-in
//     user from using this endpoint to steal data from any arbitrary
//     user id they happen to know.
//
// Idempotent-ish: if from_user_id doesn't exist (already migrated
// or stale localStorage key), we return 200 with migrated_rows=0.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const fromUserId =
      typeof body?.from_user_id === "string" ? body.from_user_id.trim() : "";
    if (!fromUserId) {
      return NextResponse.json(
        { error: "from_user_id required" },
        { status: 400 },
      );
    }

    // Target user — must be the current session.
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
      },
    );
    const {
      data: { user: toUser },
    } = await supabaseAuth.auth.getUser();
    if (!toUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (toUser.id === fromUserId) {
      // Same user — nothing to migrate (OAuth linked existing session).
      return NextResponse.json({
        ok: true,
        migrated: false,
        note: "same_user",
      });
    }

    const supabase = await getSupabaseAdmin();

    // Verify from_user_id is actually a guest. If it's gone (already
    // migrated / cleaned up), treat as no-op success so the client
    // can clear its stashed id without retrying.
    const { data: fromAuth, error: fromAuthErr } =
      await supabase.auth.admin.getUserById(fromUserId);
    if (fromAuthErr) {
      console.warn(
        "[complete-claim] from user not found — treating as no-op:",
        fromAuthErr?.message,
      );
      return NextResponse.json({ ok: true, migrated: false, note: "no_from" });
    }
    const fromIsGuest =
      fromAuth?.user?.user_metadata?.is_guest === true ||
      fromAuth?.user?.email?.endsWith("@fieldtalk.guest");
    if (!fromIsGuest) {
      return NextResponse.json(
        { error: "from_user_id is not a guest" },
        { status: 403 },
      );
    }

    // ─── Re-parent lesson_completions ──────────────────────────────
    // No conflicts expected (new user shouldn't have any). The guest
    // user's rows just move over wholesale.
    const { count: completionsMoved } = await supabase
      .from("lesson_completions")
      .update({ player_id: toUser.id }, { count: "exact" })
      .eq("player_id", fromUserId);

    // ─── Merge player_progress ─────────────────────────────────────
    // The ensure-player call that already ran inside /auth/callback
    // may have created a fresh zeroed row for the new user; if so,
    // delete it so the UPDATE below doesn't collide with the
    // UNIQUE(player_id) constraint. The guest's row (with their
    // actual XP / level) wins.
    const { data: guestProgress } = await supabase
      .from("player_progress")
      .select("total_xp, current_level")
      .eq("player_id", fromUserId)
      .maybeSingle();

    if (guestProgress) {
      await supabase
        .from("player_progress")
        .delete()
        .eq("player_id", toUser.id);
      await supabase
        .from("player_progress")
        .update({ player_id: toUser.id })
        .eq("player_id", fromUserId);
    }

    // ─── Clean up the guest's trailing rows ────────────────────────
    // Order matters: players + users FK against auth.users; delete
    // dependent rows first, then the auth user last.
    await supabase.from("players").delete().eq("id", fromUserId);
    await supabase.from("users").delete().eq("id", fromUserId);
    const { error: deleteAuthErr } = await supabase.auth.admin.deleteUser(
      fromUserId,
    );
    if (deleteAuthErr) {
      // Non-fatal — data is migrated, orphaned auth user is just
      // debris. Log so we can clean up later if needed.
      console.warn(
        "[complete-claim] guest auth delete failed:",
        deleteAuthErr?.message,
      );
    }

    return NextResponse.json({
      ok: true,
      migrated: true,
      from_user_id: fromUserId,
      to_user_id: toUser.id,
      completions_moved: completionsMoved ?? null,
      progress_merged: !!guestProgress,
    });
  } catch (err) {
    console.error("[complete-claim] unhandled:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
