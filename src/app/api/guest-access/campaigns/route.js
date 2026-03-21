import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

/**
 * GET /api/guest-access/campaigns
 * Lists all QR campaigns with aggregated stats. Admin only.
 */
export async function GET() {
  try {
    // Get current user from Supabase auth
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const supabase = await getSupabaseAdmin();

    // Verify admin role from players table
    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("id, user_type")
      .eq("id", user.id)
      .single();

    if (playerError || !playerData || playerData.user_type !== "platform_admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Fetch all campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from("guest_access_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    // Fetch aggregated session stats for each campaign
    const campaignIds = campaigns.map((c) => c.id);

    const { data: sessions } = await supabase
      .from("guest_sessions")
      .select("access_code_id, converted_at, expires_at")
      .in("access_code_id", campaignIds.length > 0 ? campaignIds : ["none"]);

    // Build stats map
    const statsMap = {};
    (sessions || []).forEach((s) => {
      if (!statsMap[s.access_code_id]) {
        statsMap[s.access_code_id] = {
          total_sessions: 0,
          active_sessions: 0,
          converted: 0,
          expired: 0,
        };
      }
      const stat = statsMap[s.access_code_id];
      stat.total_sessions++;

      if (s.converted_at) {
        stat.converted++;
      } else if (new Date(s.expires_at) < new Date()) {
        stat.expired++;
      } else {
        stat.active_sessions++;
      }
    });

    // Merge stats into campaigns
    const campaignsWithStats = campaigns.map((c) => ({
      ...c,
      stats: statsMap[c.id] || {
        total_sessions: 0,
        active_sessions: 0,
        converted: 0,
        expired: 0,
      },
      conversion_rate:
        statsMap[c.id]?.total_sessions > 0
          ? (
              (statsMap[c.id].converted / statsMap[c.id].total_sessions) *
              100
            ).toFixed(1)
          : "0.0",
    }));

    // Summary stats
    const summary = {
      total_campaigns: campaigns.length,
      active_campaigns: campaigns.filter(
        (c) =>
          c.is_active &&
          (!c.expires_at || new Date(c.expires_at) > new Date())
      ).length,
      total_activations: (sessions || []).length,
      total_conversions: (sessions || []).filter((s) => s.converted_at).length,
    };

    return NextResponse.json({
      campaigns: campaignsWithStats,
      summary,
    });
  } catch (error) {
    console.error("Error listing campaigns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
