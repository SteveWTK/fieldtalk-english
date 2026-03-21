import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

/**
 * GET /api/guest-access/status
 * Returns guest session status including time remaining and user stats.
 * Used by GuestBanner for countdown and expired overlay for conversion motivation.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Non-guest users
    if (session.user.role !== "guest") {
      return NextResponse.json({ is_guest: false });
    }

    const supabase = await getSupabaseAdmin();

    // Fetch guest session details
    const { data: guestSession } = await supabase
      .from("guest_sessions")
      .select(
        "*, guest_access_codes(name, campaign_name, welcome_message)"
      )
      .eq("user_id", session.user.userId)
      .is("converted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!guestSession) {
      return NextResponse.json({ is_guest: true, expired: true, stats: {} });
    }

    const now = new Date();
    const expiresAt = new Date(guestSession.expires_at);
    const startedAt = new Date(guestSession.started_at);
    const totalMs = expiresAt - startedAt;
    const remainingMs = Math.max(0, expiresAt - now);
    const percentRemaining = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;

    // Fetch user stats for conversion motivation
    const userId = session.user.userId;

    const [progressResult, lessonsResult] = await Promise.all([
      // Player progress (XP and level) from player_progress
      supabase
        .from("player_progress")
        .select("total_xp, current_level")
        .eq("player_id", userId)
        .single(),
      // Lessons completed count
      supabase
        .from("lesson_completions")
        .select("id", { count: "exact", head: true })
        .eq("player_id", userId),
    ]);

    const stats = {
      xp: progressResult.data?.total_xp || 0,
      level: progressResult.data?.current_level || 1,
      lessons: lessonsResult.count || 0,
    };

    return NextResponse.json({
      is_guest: true,
      expired: remainingMs <= 0,
      expires_at: guestSession.expires_at,
      started_at: guestSession.started_at,
      remaining_ms: remainingMs,
      percent_remaining: percentRemaining,
      campaign_name: guestSession.guest_access_codes?.campaign_name || null,
      stats,
    });
  } catch (error) {
    console.error("Error fetching guest status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
