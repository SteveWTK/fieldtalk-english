import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

/**
 * Cleanup Cron Job for Expired Guest Accounts
 *
 * Runs daily via Vercel cron. Finds expired, unconverted guest sessions
 * older than 30 days and deletes their Supabase Auth users.
 * CASCADE deletes handle users, guest_sessions, and related data.
 *
 * Protected by CRON_SECRET header to prevent unauthorized access.
 */
export async function GET(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin();
    const now = new Date().toISOString();
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Find expired, unconverted guest sessions older than 30 days
    const { data: expiredSessions, error: fetchError } = await supabase
      .from("guest_sessions")
      .select("id, user_id, expires_at")
      .is("converted_at", null)
      .lt("expires_at", thirtyDaysAgo);

    if (fetchError) {
      console.error("Error fetching expired guest sessions:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch expired sessions" },
        { status: 500 }
      );
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired guest accounts to clean up",
        deleted: 0,
      });
    }

    let deletedCount = 0;
    const errors = [];

    // Delete each expired guest's Supabase Auth user
    // CASCADE on users table will clean up related data
    for (const session of expiredSessions) {
      try {
        // Delete from Supabase Auth (this cascades to users table via foreign key)
        const { error: deleteAuthError } =
          await supabase.auth.admin.deleteUser(session.user_id);

        if (deleteAuthError) {
          // If auth user doesn't exist, still try to clean up the users table
          if (deleteAuthError.message?.includes("not found")) {
            // Clean up orphaned users table entry
            await supabase
              .from("users")
              .delete()
              .eq("id", session.user_id);
          } else {
            errors.push({
              user_id: session.user_id,
              error: deleteAuthError.message,
            });
            continue;
          }
        }

        deletedCount++;
      } catch (err) {
        errors.push({
          user_id: session.user_id,
          error: err.message,
        });
      }
    }

    console.log(
      `Guest cleanup: deleted ${deletedCount}/${expiredSessions.length} expired accounts`
    );

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} expired guest accounts`,
      deleted: deletedCount,
      total_expired: expiredSessions.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Guest cleanup cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
