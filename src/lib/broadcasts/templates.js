// src/lib/broadcasts/templates.js
//
// Recurring-template generation logic. Called by the hourly cron
// at /api/cron/generate-broadcasts. For each active template, decides
// whether "now" hits its cadence and generates a fresh broadcast if so.
//
// Idempotency: a template's last_generated_at is compared to the
// start of the current cadence period. Cron re-runs within the same
// hour are safe — the second run sees last_generated_at already
// inside the period and does nothing.
//
// Sunday-block interaction: if today is blocked (via the template's
// send_on_days), generation is DELAYED to the next allowed day
// (message still lands — just later) per the design decision. In
// practice this is handled by fan-out's slot computation: the
// generated broadcast has send_on_days copied from the template, so
// its recipients get scheduled_slot values that skip blocked days
// automatically. The template's OWN generation still fires today —
// we just count on the slot scheduler to defer the actual sends.

import { fetchMatchingRecipients } from "./segments";
import { computeRecipientSlots, brtParts } from "./slots";

/**
 * Scan all active templates and generate broadcasts for those whose
 * cadence has hit. Returns a summary suitable for the cron log.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase — service-role
 */
export async function generateDueBroadcasts(supabase) {
  const { data: templates, error } = await supabase
    .from("whatsapp_broadcast_templates")
    .select("*")
    .eq("active", true);

  if (error) {
    console.error("[templates/generate] load failed:", error);
    return { checked: 0, generated: 0, skipped: 0, error: error.message };
  }
  if (!templates || templates.length === 0) {
    return { checked: 0, generated: 0, skipped: 0 };
  }

  const now = new Date();
  const stats = { checked: templates.length, generated: 0, skipped: 0 };

  for (const template of templates) {
    const shouldGenerate = isDueForGeneration(template, now);
    if (!shouldGenerate) {
      stats.skipped++;
      continue;
    }

    try {
      await generateForTemplate(supabase, template, now);
      stats.generated++;
    } catch (err) {
      console.error(
        "[templates/generate] failed for template",
        template.id,
        err,
      );
      stats.skipped++;
    }
  }

  return stats;
}

/**
 * Decide whether the template's cadence has arrived and it hasn't
 * generated yet in the current period.
 */
function isDueForGeneration(template, now) {
  const nowBrt = brtParts(now);
  const cadenceHour = Number(template.cadence_hour_brt) || 9;

  // Cadence-hour check: is it already past the intended hour today?
  if (nowBrt.hour < cadenceHour) return false;

  // Compute the "start of the current period" as an ISO timestamp
  // (BRT midnight of the target day). If last_generated_at is on
  // or after this moment, we've already fired for this period.
  const periodStartBrt = periodStartForCadence(template, nowBrt);
  if (!periodStartBrt) return false;
  const periodStartUtc = brtDateFromParts(periodStartBrt);

  if (template.last_generated_at) {
    const last = new Date(template.last_generated_at);
    if (last.getTime() >= periodStartUtc.getTime()) {
      return false; // already generated this period
    }
  }

  return true;
}

/**
 * Returns the BRT-local {year, month, day} representing the START of
 * the current cadence period, or null if today isn't the right day
 * for this template's cadence.
 *   daily   → today
 *   weekly  → today only if today's weekday matches cadence_day_of_week
 *   monthly → today only if today's day-of-month matches cadence_day_of_month
 */
function periodStartForCadence(template, nowBrt) {
  const cadence = template.cadence;
  if (cadence === "daily") {
    return { year: nowBrt.year, month: nowBrt.month, day: nowBrt.day };
  }
  if (cadence === "weekly") {
    const target = Number(template.cadence_day_of_week);
    if (!Number.isFinite(target)) return null;
    // Map short weekday key → 0..6 (sun..sat).
    const map = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    const todayIdx = map[nowBrt.weekday];
    if (todayIdx !== target) return null;
    return { year: nowBrt.year, month: nowBrt.month, day: nowBrt.day };
  }
  if (cadence === "monthly") {
    const target = Number(template.cadence_day_of_month);
    if (!Number.isFinite(target)) return null;
    if (nowBrt.day !== target) return null;
    return { year: nowBrt.year, month: nowBrt.month, day: nowBrt.day };
  }
  return null;
}

/**
 * Local shim — construct a UTC Date from BRT date parts, matching the
 * fixed UTC-3 offset. Kept private to this module since it's specific
 * to templates' cadence period math.
 */
function brtDateFromParts({ year, month, day }, hour = 0, minute = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
}

/**
 * Create a fresh whatsapp_broadcasts row from a template, fan out
 * recipients with pre-computed slots, update the template's
 * last_generated_at.
 */
async function generateForTemplate(supabase, template, now) {
  // 1. Insert the broadcast (status = sending straight away since
  //    this is auto-fan-out, not a hand-composed draft).
  const brtStamp = brtParts(now);
  const name = `${template.name} — ${brtStamp.year}-${String(brtStamp.month).padStart(2, "0")}-${String(brtStamp.day).padStart(2, "0")}`;

  const { data: broadcast, error: insertErr } = await supabase
    .from("whatsapp_broadcasts")
    .insert({
      name,
      body: template.body,
      target_filter: template.target_filter || {},
      status: "sending",
      scheduled_for: null,
      interval_seconds: template.interval_seconds,
      window_start_hour_brt: template.window_start_hour_brt,
      window_end_hour_brt: template.window_end_hour_brt,
      send_on_days: template.send_on_days,
      generated_from_template_id: template.id,
      created_by: template.created_by,
      sent_started_at: now.toISOString(),
    })
    .select("id")
    .single();

  if (insertErr || !broadcast) {
    throw new Error(
      `broadcast insert failed: ${insertErr?.message ?? "unknown"}`,
    );
  }

  // 2. Fan out recipients with slot spacing.
  const recipients = await fetchMatchingRecipients(
    supabase,
    template.target_filter || {},
  );

  if (recipients.length === 0) {
    // Nothing to send — flip straight to complete.
    await supabase
      .from("whatsapp_broadcasts")
      .update({
        status: "complete",
        recipient_count: 0,
        completed_at: now.toISOString(),
      })
      .eq("id", broadcast.id);
  } else {
    const slots = computeRecipientSlots(recipients.length, {
      scheduled_for: null,
      interval_seconds: template.interval_seconds,
      window_start_hour_brt: template.window_start_hour_brt,
      window_end_hour_brt: template.window_end_hour_brt,
      send_on_days: template.send_on_days,
    });
    const rows = recipients.map((r, idx) => ({
      broadcast_id: broadcast.id,
      player_id: r.id,
      phone_e164: r.phone_e164,
      language: r.preferred_language,
      status: "pending",
      scheduled_slot: slots[idx].toISOString(),
    }));
    await supabase
      .from("whatsapp_broadcast_recipients")
      .upsert(rows, {
        onConflict: "broadcast_id,player_id",
        ignoreDuplicates: true,
      });
    await supabase
      .from("whatsapp_broadcasts")
      .update({ recipient_count: recipients.length })
      .eq("id", broadcast.id);
  }

  // 3. Stamp the template so we don't re-generate in the same period.
  await supabase
    .from("whatsapp_broadcast_templates")
    .update({ last_generated_at: now.toISOString() })
    .eq("id", template.id);
}
