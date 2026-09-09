// src/app/api/cron/lead-sequences/route.js
//
// Drip-sequence dispatcher. Runs every 15 min (see vercel.json).
// For each `active` enrollment whose `next_step_due_at` is past:
//
//   1. Re-check stop conditions on the current lead + activities:
//        - lead.do_not_contact + sequence.stop_on_dnc     → stop
//        - any whatsapp_inbound since enrolled_at + stop_on_reply → stop
//        - any stage_change since enrolled_at + stop_on_stage_change → stop
//   2. Load the current step's content (template or inline body),
//      render placeholders, send via Z-API.
//   3. Log outbound to whatsapp_messages + lead_activities.
//   4. Advance current_step. If there's another step, compute
//      next_step_due_at from enrolled_at + that step's timing. If
//      not, mark 'completed'.
//
// Rate limit: SEND_LIMIT per tick — matches broadcast dispatcher.
// Bearer-token protected via CRON_SECRET.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { sendWhatsapp } from "@/lib/integrations/zapi";
import { computeStepDueAt } from "@/lib/leads/sequences";
import { renderTemplate, pickLangString } from "@/lib/leads/templates";

const SEND_LIMIT = 20;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: dueEnrollments, error: dueErr } = await supabase
    .from("lead_sequence_enrollments")
    .select(
      `id, sequence_id, lead_id, current_step, enrolled_at,
       sequence:lead_sequences (
         id, active, stop_on_reply, stop_on_stage_change, stop_on_dnc
       ),
       lead:leads (
         id, full_name, organization_name, city, phone_e164,
         stage, do_not_contact
       )`,
    )
    .eq("status", "active")
    .lte("next_step_due_at", nowIso)
    .order("next_step_due_at", { ascending: true })
    .limit(SEND_LIMIT);

  if (dueErr) {
    console.error("[cron/lead-sequences] fetch failed:", dueErr);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  if (!dueEnrollments || dueEnrollments.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  let sent = 0;
  let stopped = 0;
  let completed = 0;
  let failed = 0;

  for (const en of dueEnrollments) {
    const outcome = await processEnrollment(supabase, en);
    if (outcome === "sent") sent++;
    else if (outcome === "stopped") stopped++;
    else if (outcome === "completed") completed++;
    else if (outcome === "failed") failed++;
  }

  return NextResponse.json({
    ok: true,
    processed: dueEnrollments.length,
    sent,
    stopped,
    completed,
    failed,
  });
}

async function processEnrollment(supabase, enrollment) {
  const seq = enrollment.sequence;
  const lead = enrollment.lead;
  if (!seq || !lead) return await stopEnrollment(supabase, enrollment.id, "missing_join");

  // Sequence paused between fan-out and now.
  if (!seq.active) return await stopEnrollment(supabase, enrollment.id, "sequence_paused");

  // Do-not-contact.
  if (seq.stop_on_dnc && lead.do_not_contact) {
    return await stopEnrollment(supabase, enrollment.id, "lead_dnc");
  }
  if (!lead.phone_e164) {
    return await stopEnrollment(supabase, enrollment.id, "lead_no_phone");
  }

  // Stop-on-reply / stage-change — inspect lead_activities since
  // enrolled_at.
  if (seq.stop_on_reply || seq.stop_on_stage_change) {
    const { data: acts } = await supabase
      .from("lead_activities")
      .select("activity_type, created_at")
      .eq("lead_id", lead.id)
      .gt("created_at", enrollment.enrolled_at);
    for (const a of acts || []) {
      if (a.activity_type === "whatsapp_inbound" && seq.stop_on_reply) {
        return await stopEnrollment(supabase, enrollment.id, "lead_replied");
      }
      if (a.activity_type === "stage_change" && seq.stop_on_stage_change) {
        return await stopEnrollment(
          supabase,
          enrollment.id,
          "stage_changed",
        );
      }
    }
  }

  // Load ALL steps for this sequence — we need the current one to
  // send AND the next one (if any) to schedule.
  const { data: steps } = await supabase
    .from("lead_sequence_steps")
    .select(
      `id, position, day_offset, time_of_day_brt, template_id, body,
       template:lead_message_templates (body)`,
    )
    .eq("sequence_id", seq.id)
    .order("position", { ascending: true });

  if (!steps || steps.length === 0) {
    return await stopEnrollment(supabase, enrollment.id, "no_steps");
  }

  // current_step is 1-based for "already sent"; we want the NEXT
  // position to send.
  const stepIdx = enrollment.current_step;
  if (stepIdx >= steps.length) {
    return await completeEnrollment(supabase, enrollment.id);
  }
  const step = steps[stepIdx];

  // Resolve message body — inline override wins over template.
  let bodySource = null;
  if (step.body && (step.body.pt || step.body.en)) {
    bodySource = step.body;
  } else if (step.template?.body) {
    bodySource = step.template.body;
  }
  if (!bodySource) {
    return await stopEnrollment(supabase, enrollment.id, "step_no_content");
  }

  // Render with lead-context substitution. Language defaults to 'pt'
  // (leads don't carry a preferred_language). Empty renders skip.
  const rendered = renderTemplate(bodySource, "pt", lead);
  if (!rendered) {
    return await stopEnrollment(supabase, enrollment.id, "step_empty_body");
  }

  // Send.
  let providerMessageId = null;
  try {
    const result = await sendWhatsapp({
      telefone: lead.phone_e164,
      mensagem: rendered,
    });
    providerMessageId = result.messageId;
  } catch (err) {
    console.error(
      "[cron/lead-sequences] send failed:",
      enrollment.id,
      err?.message,
    );
    await supabase
      .from("lead_sequence_enrollments")
      .update({
        metadata: {
          last_send_error: err?.message || String(err),
          last_send_attempt_at: new Date().toISOString(),
        },
      })
      .eq("id", enrollment.id);
    return "failed";
  }

  // Log outbound to whatsapp_messages + lead_activities.
  await supabase.from("whatsapp_messages").insert({
    player_id: null,
    phone_e164: lead.phone_e164,
    direction: "outbound",
    provider: "zapi",
    provider_message_id: providerMessageId,
    via: "sequence",
    body: rendered,
    metadata: {
      sequence_id: seq.id,
      enrollment_id: enrollment.id,
      step_position: step.position,
    },
  });
  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    activity_type: "whatsapp_outbound",
    actor_id: null,
    payload: {
      body: rendered,
      provider_message_id: providerMessageId,
      sequence_id: seq.id,
      enrollment_id: enrollment.id,
      step_position: step.position,
    },
    summary: `[sequence] ${rendered.slice(0, 120)}${rendered.length > 120 ? "…" : ""}`,
  });

  // Advance. If there's a next step, compute its due time from the
  // ORIGINAL enrolled_at + that step's day_offset. If not, complete.
  const nextIdx = stepIdx + 1;
  if (nextIdx >= steps.length) {
    await supabase
      .from("lead_sequence_enrollments")
      .update({
        status: "completed",
        current_step: nextIdx,
        next_step_due_at: null,
      })
      .eq("id", enrollment.id);
    return "completed";
  }
  const nextStep = steps[nextIdx];
  const nextDue = computeStepDueAt(
    enrollment.enrolled_at,
    nextStep.day_offset,
    nextStep.time_of_day_brt,
  );
  await supabase
    .from("lead_sequence_enrollments")
    .update({
      current_step: nextIdx,
      next_step_due_at: nextDue,
    })
    .eq("id", enrollment.id);
  return "sent";
}

async function stopEnrollment(supabase, enrollmentId, reason) {
  await supabase
    .from("lead_sequence_enrollments")
    .update({
      status: "stopped",
      stop_reason: reason,
      next_step_due_at: null,
    })
    .eq("id", enrollmentId);
  return "stopped";
}

async function completeEnrollment(supabase, enrollmentId) {
  await supabase
    .from("lead_sequence_enrollments")
    .update({ status: "completed", next_step_due_at: null })
    .eq("id", enrollmentId);
  return "completed";
}

// Suppress unused-var warning for the imported helper — it's used
// only when we render bodies inline (currently we render via
// renderTemplate which handles both plain strings + language bundles).
void pickLangString;
