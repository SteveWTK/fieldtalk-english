// src/app/api/admin/broadcast-templates/route.js
//
// GET  /api/admin/broadcast-templates       — list all templates
// POST /api/admin/broadcast-templates       — create a template
//
// Payload validation lives in @/lib/broadcasts/template-validation
// because Next.js's App Router forbids non-handler named exports
// from route.js — see that file's header for the full explanation.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { validateTemplatePayload } from "@/lib/broadcasts/template-validation";

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("whatsapp_broadcast_templates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin/broadcast-templates] list failed:", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  return NextResponse.json({ templates: data ?? [] });
}

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const validated = validateTemplatePayload(payload);
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("whatsapp_broadcast_templates")
    .insert({
      ...validated.data,
      created_by: gate.user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin/broadcast-templates] create failed:", error);
    return NextResponse.json(
      { error: "create_failed", details: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ id: data.id });
}
