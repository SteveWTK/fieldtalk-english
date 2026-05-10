import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

/**
 * POST /api/guest-access/claim
 * Converts a guest account to a real user account.
 * Updates Supabase Auth credentials and the users table.
 */
export async function POST(request) {
  try {
    // Get user from Supabase Auth session via cookies
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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is a guest (email ends with @fieldtalk.guest or user_metadata.is_guest)
    const isGuest = user.email?.endsWith("@fieldtalk.guest") || user.user_metadata?.is_guest || false;

    if (!isGuest) {
      return NextResponse.json(
        { error: "Only guest users can claim accounts" },
        { status: 403 }
      );
    }

    const { email, password, name } = await request.json();

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseAdmin();

    // Check if email is already in use
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    // Update Supabase Auth user with real email and password
    const { error: authUpdateError } =
      await supabase.auth.admin.updateUserById(user.id, {
        email: email.toLowerCase().trim(),
        password: password,
        email_confirm: true,
        user_metadata: { is_guest: false, name: name || "Player" },
      });

    if (authUpdateError) {
      console.error("Error updating guest auth:", authUpdateError);
      return NextResponse.json(
        { error: "Failed to update account credentials" },
        { status: 500 }
      );
    }

    // Update public.users table
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        email: email.toLowerCase().trim(),
        name: name?.trim() || "Player",
        role: "User",
        // Preserve is_premium and premium_until — they keep their remaining access
      })
      .eq("id", user.id);

    if (userUpdateError) {
      console.error("Error updating guest user record:", userUpdateError);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    // Mark guest session as converted
    await supabase
      .from("guest_sessions")
      .update({
        converted_at: new Date().toISOString(),
        converted_to_email: email.toLowerCase().trim(),
      })
      .eq("user_id", user.id)
      .is("converted_at", null);

    return NextResponse.json({
      success: true,
      message: "Account created successfully!",
      email: email.toLowerCase().trim(),
    });
  } catch (error) {
    console.error("Error claiming guest account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
