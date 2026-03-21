import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import crypto from "crypto";

/**
 * POST /api/guest-access/activate
 * Validates a QR access code and creates a temporary guest user account.
 * No authentication required (this is the entry point for new guests).
 */
export async function POST(request) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Invalid code" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseAdmin();

    // Check if caller is already logged in as a non-guest user
    const session = await getServerSession(authOptions);
    if (session?.user && session.user.role !== "guest") {
      // Already authenticated - just return the destination path
      const { data: codeData } = await supabase
        .from("guest_access_codes")
        .select("destination_path")
        .eq("code", code.trim().toUpperCase())
        .single();

      return NextResponse.json({
        success: true,
        already_authenticated: true,
        destination_path: codeData?.destination_path || "/dashboard",
      });
    }

    // Validate and activate the code atomically via RPC
    const { data: result, error: rpcError } = await supabase
      .rpc("activate_guest_code", { p_code: code.trim().toUpperCase() });

    if (rpcError) {
      console.error("RPC error activating guest code:", rpcError);
      return NextResponse.json(
        { error: "Failed to validate code" },
        { status: 500 }
      );
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || "Invalid code" },
        { status: 400 }
      );
    }

    // Generate guest identity
    const guestSuffix = crypto.randomBytes(6).toString("hex");
    const guestEmail = `guest_${guestSuffix}@fieldtalk.guest`;
    const guestPassword = crypto.randomBytes(20).toString("base64url");

    // Create Supabase Auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: guestEmail,
        password: guestPassword,
        email_confirm: true, // Auto-confirm for immediate sign-in
        user_metadata: {
          is_guest: true,
          campaign: result.campaign_name || null,
        },
      });

    if (authError) {
      console.error("Error creating guest auth user:", authError);
      return NextResponse.json(
        { error: "Failed to create guest account" },
        { status: 500 }
      );
    }

    // Calculate premium expiry
    const isPremium =
      result.access_tier === "premium" || result.access_tier === "full";
    const premiumUntil = new Date(
      Date.now() + result.duration_hours * 3600 * 1000
    );

    // Create public.users record
    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      email: guestEmail,
      name: "Guest Player",
      role: "guest",
      is_premium: isPremium,
      premium_until: premiumUntil.toISOString(),
      premium_source: "guest_qr",
    });

    if (userError) {
      console.error("Error creating guest user record:", userError);
      // Clean up the Supabase Auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to create guest profile" },
        { status: 500 }
      );
    }

    // Create guest session record
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const { error: sessionError } = await supabase
      .from("guest_sessions")
      .insert({
        access_code_id: result.code_id,
        user_id: authData.user.id,
        access_tier: result.access_tier,
        destination_path: result.destination_path,
        expires_at: premiumUntil.toISOString(),
        device_info: {
          user_agent: userAgent || null,
        },
        ip_address: forwardedFor || realIp || null,
      });

    if (sessionError) {
      console.error("Error creating guest session:", sessionError);
      // Non-fatal: the guest can still use the app
    }

    return NextResponse.json({
      success: true,
      guest_email: guestEmail,
      guest_password: guestPassword,
      destination_path: result.destination_path || "/dashboard",
      expires_at: premiumUntil.toISOString(),
      duration_hours: result.duration_hours,
      welcome_message: result.welcome_message || null,
      welcome_message_pt: result.welcome_message_pt || null,
      welcome_message_th: result.welcome_message_th || null,
      campaign_name: result.campaign_name || null,
      campaign_location: result.campaign_location || null,
    });
  } catch (error) {
    console.error("Error in guest activation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
