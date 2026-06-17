// src/app/api/lessons/open-count/route.js
//
// GET /api/lessons/open-count
//   → { count: <number of lessons where under_construction = false> }
//
// Tiny endpoint used by the in-app NewContentBanner to detect when
// the open-lesson catalogue has grown since the user's last visit.
// Compared to localStorage client-side; nothing user-specific here
// so it's safe to read without auth.
//
// Why an endpoint rather than reading directly from the Supabase
// client: the banner mounts on the dashboard, which doesn't already
// pull the lessons list. A scoped count read is cheaper than the
// full list, and avoids leaking lesson IDs to anonymous traffic.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function GET() {
  try {
    const supabase = await getSupabaseAdmin();
    const { count, error } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("under_construction", false);
    if (error) {
      console.error("[lessons/open-count] error:", error);
      return NextResponse.json(
        { error: "Could not load count" },
        { status: 500 }
      );
    }
    return NextResponse.json({ count: count || 0 });
  } catch (err) {
    console.error("[lessons/open-count] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
