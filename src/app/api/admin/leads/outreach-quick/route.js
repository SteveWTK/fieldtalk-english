// src/app/api/admin/leads/outreach-quick/route.js
//
// POST /api/admin/leads/outreach-quick
//
// One-shot: create a new lead + mint its outreach token + return the
// wa.me link, all in a single request. This powers the "quick launch"
// form on /admin/leads/outreach — the flow the sales team uses most
// often (David has a name + role, wants a link in <10 seconds).
//
// Body:
//   {
//     full_name:  string  (required)
//     funnel_role: 'agent'|'coach'|'club_staff'|'academy_director'|'other'  (required)
//     phone_e164: string  (optional — filled if David already has it)
//     lead_type:  string  (optional — defaults to 'individual_player';
//                          the sales team may prefer 'academy'/'club'
//                          for organisational contacts)
//     notes:      string  (optional — goes into leads.summary)
//     greeting:   string  (optional — customises the pre-filled "Oi")
//   }
//
// Response: { lead_id, token, wa_me }
//
// Also inserts:
//   - lead_activities 'stage_change' row (matches POST /api/admin/leads)
//   - lead_activities 'note_added' row summarising the outreach launch
//
// Uses source='whatsapp_funnel' so acquisition reports can distinguish
// funnel-originated leads from cold outreach / import / etc.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { normalizeBrazilianPhone } from "@/lib/utils/phone";
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

const VALID_LEAD_TYPES = new Set([
  "individual_player",
  "academy",
  "school",
  "club",
  "partner_other",
]);

const MAX_NAME = 200;
const MAX_NOTES = 500;

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;
  const { user } = gate;

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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const fullName = String(body?.full_name || "").trim();
  if (!fullName) {
    return NextResponse.json({ error: "full_name required" }, { status: 400 });
  }
  if (fullName.length > MAX_NAME) {
    return NextResponse.json({ error: "full_name too long" }, { status: 400 });
  }

  const funnelRole = String(body?.funnel_role || "").trim();
  if (!VALID_ROLES.has(funnelRole)) {
    return NextResponse.json(
      { error: `funnel_role must be one of ${[...VALID_ROLES].join(", ")}` },
      { status: 400 },
    );
  }

  const leadType =
    typeof body.lead_type === "string" && VALID_LEAD_TYPES.has(body.lead_type)
      ? body.lead_type
      : "individual_player";

  let phoneE164 = null;
  if (typeof body.phone_e164 === "string" && body.phone_e164.trim()) {
    const norm = normalizeBrazilianPhone(body.phone_e164.trim());
    if (!norm.ok) {
      return NextResponse.json(
        { error: "phone_e164 must be a valid Brazilian number" },
        { status: 400 },
      );
    }
    phoneE164 = norm.e164;
  }

  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim().slice(0, MAX_NOTES)
      : null;

  const greeting =
    typeof body.greeting === "string" && body.greeting.trim()
      ? body.greeting.trim().slice(0, 40)
      : "Oi";

  const supabase = await getSupabaseAdmin();

  const token = generateOutreachToken();

  const { data: lead, error: insertErr } = await supabase
    .from("leads")
    .insert({
      full_name: fullName,
      phone_e164: phoneE164,
      lead_type: leadType,
      stage: "new",
      source: "whatsapp_funnel",
      summary: notes,
      outreach_token: token,
      funnel_stage: "pending_oi",
      funnel_role: funnelRole,
      created_by: user.id,
    })
    .select("id, full_name, funnel_role, funnel_stage")
    .single();

  if (insertErr) {
    console.error("[admin/leads/outreach-quick] insert failed:", insertErr);
    return NextResponse.json(
      { error: "insert_failed", message: insertErr.message },
      { status: 500 },
    );
  }

  // Seed timeline (matches the POST /api/admin/leads pattern).
  await supabase.from("lead_activities").insert([
    {
      lead_id: lead.id,
      activity_type: "stage_change",
      actor_id: user.id,
      payload: { from: null, to: "new" },
      summary: "Lead created at stage 'new'",
    },
    {
      lead_id: lead.id,
      activity_type: "note_added",
      actor_id: user.id,
      payload: {
        kind: "funnel_outreach_launched",
        token,
        funnel_role: funnelRole,
      },
      summary: `WhatsApp funnel outreach launched (token: ${token})`,
    },
  ]);

  const waMe = buildOutreachLink({
    businessNumberE164: businessNumber,
    token,
    greeting,
  });

  return NextResponse.json({
    lead_id: lead.id,
    token,
    wa_me: waMe,
    funnel_stage: lead.funnel_stage,
    funnel_role: lead.funnel_role,
    full_name: lead.full_name,
  });
}
