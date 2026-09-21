// src/app/api/admin/leads/[id]/outreach/route.js
//
// POST /api/admin/leads/[id]/outreach
//   Mint (or retrieve) the WhatsApp outreach token for an existing lead
//   and return the wa.me link the salesperson pastes into their
//   personal WA DM.
//
//   Behaviour:
//     - If the lead has NO outreach_token yet: generate one, set
//       funnel_stage='pending_oi', persist funnel_role (if provided),
//       return { token, wa_me }.
//     - If the lead already has one and funnel_stage is still
//       'pending_oi', return the existing token (idempotent — David
//       can re-copy the link without wasting tokens).
//     - If the lead is further into the funnel (q1_sent, q2_sent,
//       cta_sent, converted, escalated, cold), return 409 with the
//       current stage — team should intervene manually.
//
// Body (all optional):
//   { funnel_role: 'agent'|'coach'|'club_staff'|'academy_director'|'other',
//     greeting: string (defaults to 'Oi') }
//
// Notes:
//   - We DO NOT auto-set leads.source='whatsapp_funnel' here — the lead
//     already has whatever source it was created with (e.g. 'manual',
//     'event'). Overwriting would erase acquisition attribution.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import {
  generateOutreachToken,
  buildOutreachLink,
} from "@/lib/whatsapp/lead-funnel-outreach";

const VALID_ROLES = new Set([
  "agent",
  "coach",
  "club_staff",
  "academy_director",
  "other",
]);

const FUNNEL_STAGES_ADVANCED = new Set([
  "q1_sent",
  "q2_sent",
  "cta_sent",
  "converted",
  "escalated",
  "cold",
]);

export async function POST(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;
  const { user } = gate;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "lead id required" }, { status: 400 });
  }

  const businessNumber = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER;
  if (!businessNumber) {
    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER not set — configure in .env before minting outreach tokens.",
      },
      { status: 500 },
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body optional — empty is fine.
  }

  const funnelRole =
    typeof body.funnel_role === "string" ? body.funnel_role : null;
  if (funnelRole && !VALID_ROLES.has(funnelRole)) {
    return NextResponse.json(
      { error: `funnel_role must be one of ${[...VALID_ROLES].join(", ")}` },
      { status: 400 },
    );
  }
  const greeting =
    typeof body.greeting === "string" && body.greeting.trim()
      ? body.greeting.trim().slice(0, 40)
      : "Oi";

  const supabase = await getSupabaseAdmin();

  const { data: lead, error: loadErr } = await supabase
    .from("leads")
    .select(
      "id, full_name, outreach_token, funnel_stage, funnel_role, do_not_contact",
    )
    .eq("id", id)
    .single();
  if (loadErr || !lead) {
    return NextResponse.json({ error: "lead_not_found" }, { status: 404 });
  }

  if (lead.do_not_contact) {
    return NextResponse.json(
      { error: "do_not_contact — refusing to mint outreach for this lead" },
      { status: 400 },
    );
  }

  // Already in the funnel past pending_oi — refuse. Team should decide
  // whether to reset (a separate action) or keep the current session.
  if (
    lead.funnel_stage &&
    FUNNEL_STAGES_ADVANCED.has(lead.funnel_stage)
  ) {
    return NextResponse.json(
      {
        error: "funnel_already_advanced",
        current_stage: lead.funnel_stage,
      },
      { status: 409 },
    );
  }

  // Reuse the existing token if this is a re-copy — no reason to
  // burn a new one.
  let token = lead.outreach_token;
  const patch = {};
  if (!token) {
    token = generateOutreachToken();
    patch.outreach_token = token;
  }
  if (!lead.funnel_stage) patch.funnel_stage = "pending_oi";
  if (funnelRole && lead.funnel_role !== funnelRole) {
    patch.funnel_role = funnelRole;
  }

  if (Object.keys(patch).length > 0) {
    const { error: updErr } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", id);
    if (updErr) {
      console.error(
        "[admin/leads/:id/outreach] update failed:",
        updErr,
      );
      return NextResponse.json(
        { error: "update_failed", message: updErr.message },
        { status: 500 },
      );
    }

    // Timeline entry so the CRM view shows the outreach was launched.
    await supabase.from("lead_activities").insert({
      lead_id: id,
      activity_type: "note_added",
      actor_id: user.id,
      payload: {
        kind: "funnel_outreach_launched",
        token,
        funnel_role: patch.funnel_role ?? lead.funnel_role ?? null,
      },
      summary: `WhatsApp funnel outreach launched (token: ${token})`,
    });
  }

  const waMe = buildOutreachLink({
    businessNumberE164: businessNumber,
    token,
    greeting,
  });

  return NextResponse.json({
    token,
    wa_me: waMe,
    funnel_stage: patch.funnel_stage ?? lead.funnel_stage ?? "pending_oi",
    funnel_role: patch.funnel_role ?? lead.funnel_role ?? null,
    reused: !patch.outreach_token,
  });
}
