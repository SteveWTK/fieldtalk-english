import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import crypto from "crypto";

/**
 * POST /api/guest-access/generate
 * Creates a new QR access code/campaign. Admin only.
 */
export async function POST(request) {
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

    const {
      name,
      campaignName,
      campaignLocation,
      destinationPath = "/dashboard",
      accessTier = "premium",
      durationHours = 72,
      maxUses = null,
      welcomeMessage = null,
      welcomeMessagePt = null,
      welcomeMessageTh = null,
      startsAt = null,
      expiresAt = null,
      metadata = {},
    } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Validate access tier
    const validTiers = ["basic", "premium", "full"];
    if (!validTiers.includes(accessTier)) {
      return NextResponse.json(
        { error: "Invalid access tier" },
        { status: 400 }
      );
    }

    // Generate unique code: QR-XXXXXXXX
    const randomPart = crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase();
    const code = `QR-${randomPart}`;

    // Insert the code
    const { data: codeData, error: insertError } = await supabase
      .from("guest_access_codes")
      .insert({
        code,
        name,
        destination_path: destinationPath,
        access_tier: accessTier,
        duration_hours: durationHours,
        max_uses: maxUses,
        campaign_name: campaignName || null,
        campaign_location: campaignLocation || null,
        welcome_message: welcomeMessage,
        welcome_message_pt: welcomeMessagePt,
        welcome_message_th: welcomeMessageTh,
        created_by: playerData.id,
        starts_at: startsAt || new Date().toISOString(),
        expires_at: expiresAt || null,
        metadata,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating guest access code:", insertError);
      return NextResponse.json(
        { error: "Failed to create code" },
        { status: 500 }
      );
    }

    // Build the full QR URL
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://fieldtalk.app";
    const qrUrl = `${baseUrl}/guest/${code}`;

    return NextResponse.json({
      success: true,
      code: codeData.code,
      qrUrl,
      campaign: codeData,
    });
  } catch (error) {
    console.error("Error generating guest access code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
