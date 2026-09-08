// src/app/api/admin/leads/owners/route.js
//
// GET /api/admin/leads/owners
//
// Returns platform_admin players — the set of people a lead can be
// assigned to. Small endpoint (fewer than a dozen rows) so the
// dropdowns on the list, kanban and detail views can populate
// without an admin table scan on each page.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("players")
    .select("id, full_name, avatar_url")
    .eq("user_type", "platform_admin")
    .order("full_name", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[admin/leads/owners] list failed:", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  return NextResponse.json({ owners: data ?? [] });
}
