// src/app/api/leads/attribute-conversion/route.js
//
// POST /api/leads/attribute-conversion
//   Body: { token: string }
//
// Idempotently marks a lead as converted, linking it to the currently
// authenticated user (their players row) and flipping funnel_stage to
// 'converted'. Called by the LeadAttributionCapture client component
// once the user finishes signup + lands on any authenticated page.
//
// Behaviour:
//   - Unauth caller → 401 (silent — capture will retry once auth resolves).
//   - Token missing / lead not found → 404. Client clears its stored
//     token so we don't retry forever.
//   - Lead already converted (converted_player_id set) → 200 { already_converted: true }.
//   - Lead in a live funnel stage (pending_oi / q1_sent / q2_sent /
//     cta_sent / escalated / cold) → mark converted anyway. The signup
//     is a stronger signal than any earlier funnel state.
//
// Writes:
//   leads.converted_player_id = user.id
//   leads.converted_at        = now()
//   leads.funnel_stage        = 'converted'
//   lead_activities row of type 'converted'

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function POST(request) {
  // Auth — must be a signed-in user. Uses the same server-side SSR
  // client pattern the admin gate uses.
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
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token =
    typeof body?.token === "string" ? body.token.trim().toLowerCase() : "";
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();

  const { data: lead, error: loadErr } = await supabase
    .from("leads")
    .select("id, converted_player_id, funnel_stage, funnel_role")
    .eq("outreach_token", token)
    .maybeSingle();

  if (loadErr || !lead) {
    return NextResponse.json({ error: "lead_not_found" }, { status: 404 });
  }

  // Already attributed — return ok so the client clears its stored
  // token. We DON'T overwrite a prior converted_player_id — a lead
  // converts once. If two players share the same token (shouldn't
  // happen), the first-in wins.
  if (lead.converted_player_id) {
    return NextResponse.json({
      ok: true,
      already_converted: true,
      lead_id: lead.id,
    });
  }

  const nowIso = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("leads")
    .update({
      converted_player_id: user.id,
      converted_at: nowIso,
      funnel_stage: "converted",
    })
    .eq("id", lead.id);

  if (updateErr) {
    console.error(
      "[leads/attribute-conversion] update failed:",
      updateErr,
    );
    return NextResponse.json(
      { error: "update_failed", message: updateErr.message },
      { status: 500 },
    );
  }

  // Timeline entry so the CRM detail page reflects the conversion.
  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    activity_type: "converted",
    actor_id: user.id,
    payload: {
      converted_player_id: user.id,
      funnel_stage_before: lead.funnel_stage,
    },
    summary: "Signup completed via WhatsApp funnel demo.",
  });

  return NextResponse.json({
    ok: true,
    lead_id: lead.id,
    funnel_role: lead.funnel_role,
  });
}
