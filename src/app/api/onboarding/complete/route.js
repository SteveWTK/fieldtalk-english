import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

/**
 * POST /api/onboarding/complete
 * Saves user onboarding preferences to their player profile.
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

    const { role, level, goals } = await request.json();

    const supabase = await getSupabaseAdmin();

    // Update player profile with onboarding data
    const { error: updateError } = await supabase
      .from("players")
      .update({
        onboarding_role: role,
        english_level: level,
        learning_goals: goals,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error saving onboarding data:", updateError);
      // Try updating user metadata as fallback
      const { error: metaError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            ...user.user_metadata,
            onboarding_role: role,
            english_level: level,
            learning_goals: goals,
            onboarding_completed: true,
          },
        }
      );

      if (metaError) {
        console.error("Error updating user metadata:", metaError);
        return NextResponse.json(
          { error: "Failed to save preferences" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
