// src/app/api/cron/whatsapp-review-quizzes/route.js
//
// T+24h mini-review quiz spawn cron. Runs every 10 min.
//
// For each recently-completed lesson (24h ≤ age ≤ EXPIRY_HOURS) that:
//   - has at least one review_questions entry
//   - is by an opted-in, welcomed, non-paused player with a phone
//   - the player hasn't sent/received a WhatsApp message in the last 30 min
//   - player's local hour is inside 9am–8pm (America/Sao_Paulo default)
//   - no answered/skipped/sent/expired session already exists for
//     (player, lesson, question)
//
// we send a 3-button interactive-message quiz via Z-API and mark
// whatsapp_review_sessions.status='sent'.
//
// If a session row exists in status='queued' (i.e. a deferred one
// that was re-queued by the router), we pick it up and re-send.
//
// If a completion is older than EXPIRY_HOURS and hasn't been sent
// yet, we mark the session 'expired' (creating it first if needed
// for the audit trail) — the moment has passed.
//
// Rate limit: SPAWN_LIMIT sends per tick (parity with the broadcast
// dispatcher). At 10-min cadence, the backlog of eligibles gets
// worked through steadily.
//
// Bearer-token protected via CRON_SECRET.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { sendWhatsappButtons } from "@/lib/integrations/zapi";
import { isInLocalWindow } from "@/lib/whatsapp/review-quiz-window";

const INACTIVITY_MIN = 30;
const WINDOW_START_HOUR = 9;  // player local, inclusive
const WINDOW_END_HOUR = 20;   // player local, exclusive (9am..8pm)
const EXPIRY_HOURS = 48;      // if not sent within 48h of completion, expire
const SPAWN_LIMIT = 20;       // sends per tick
const CANDIDATE_POOL = 200;   // rows fetched before local-time filter
const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseAdmin();
  const now = new Date();

  // Eligibility window on lesson_completions.completed_at:
  //   [now - EXPIRY_HOURS, now - 24h]
  // Anything older than EXPIRY_HOURS is either already sent or should
  // be expired; anything more recent than 24h isn't due yet.
  const dueBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const dueAfter = new Date(
    now.getTime() - EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // Pull recently-completed lessons with quiz content. We join players
  // + lessons in one query, then filter in JS for the local-time
  // window (Postgres doesn't natively do "in player's timezone"
  // without pl/pgsql or a materialized view).
  const { data: completions, error: fetchErr } = await supabase
    .from("lesson_completions")
    .select(
      `
      id,
      completed_at,
      player_id,
      lesson_id,
      players!inner (
        id,
        full_name,
        preferred_language,
        phone_e164,
        timezone,
        whatsapp_opted_in,
        whatsapp_agent_paused,
        whatsapp_welcomed_at,
        last_whatsapp_activity_at
      ),
      lessons!inner (
        id,
        review_questions
      )
      `,
    )
    .lte("completed_at", dueBefore)
    .gte("completed_at", dueAfter)
    .eq("players.whatsapp_opted_in", true)
    .eq("players.whatsapp_agent_paused", false)
    .not("players.phone_e164", "is", null)
    .not("players.whatsapp_welcomed_at", "is", null)
    .not("lessons.review_questions", "is", null)
    .order("completed_at", { ascending: true })
    .limit(CANDIDATE_POOL);

  if (fetchErr) {
    console.error("[cron/whatsapp-review-quizzes] fetch failed:", fetchErr);
    return NextResponse.json(
      { error: "fetch_failed", details: fetchErr.message },
      { status: 500 },
    );
  }

  if (!completions || completions.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0 });
  }

  // We need existing session rows for the (player, lesson) set to
  // decide: skip / re-send / spawn. One batch query keyed by player.
  const playerIds = Array.from(
    new Set(completions.map((c) => c.player_id)),
  );
  const { data: existingSessions } = await supabase
    .from("whatsapp_review_sessions")
    .select("id, player_id, lesson_id, question_id, status, defer_count")
    .in("player_id", playerIds);

  const sessionKey = (playerId, lessonId, questionId) =>
    `${playerId}|${lessonId}|${questionId}`;
  const sessionsByKey = new Map(
    (existingSessions || []).map((s) => [
      sessionKey(s.player_id, s.lesson_id, s.question_id),
      s,
    ]),
  );

  // Filter to eligibles.
  const eligible = [];
  const inactivityCutoff = new Date(
    now.getTime() - INACTIVITY_MIN * 60 * 1000,
  );

  for (const row of completions) {
    const player = row.players;
    const lesson = row.lessons;

    // Grab first question (MVP is one-question-per-lesson).
    const questions = Array.isArray(lesson.review_questions)
      ? lesson.review_questions
      : null;
    if (!questions || questions.length === 0) continue;
    const question = questions[0];
    if (!isValidQuestion(question)) continue;

    // Check existing session state.
    const key = sessionKey(player.id, lesson.id, question.id);
    const existing = sessionsByKey.get(key);
    if (existing) {
      // Anything not 'queued' means we're done with this lesson-quiz
      // (answered, sent-waiting, skipped, expired). Skip.
      if (existing.status !== "queued") continue;
    }

    // Inactivity gate.
    if (player.last_whatsapp_activity_at) {
      const lastAct = new Date(player.last_whatsapp_activity_at);
      if (lastAct >= inactivityCutoff) continue;
    }

    // Local-time window gate. Sao_Paulo default when timezone is null.
    const tz = player.timezone || DEFAULT_TIMEZONE;
    if (!isInLocalWindow(now, tz, WINDOW_START_HOUR, WINDOW_END_HOUR)) {
      continue;
    }

    eligible.push({
      completion: row,
      player,
      lesson,
      question,
      existingSessionId: existing?.id ?? null,
    });
    if (eligible.length >= SPAWN_LIMIT) break;
  }

  if (eligible.length === 0) {
    return NextResponse.json({
      ok: true,
      checked: completions.length,
      sent: 0,
    });
  }

  let sent = 0;
  let failed = 0;
  const nowIso = now.toISOString();

  for (const item of eligible) {
    const outcome = await spawnQuiz(supabase, item, nowIso);
    if (outcome === "sent") sent++;
    else if (outcome === "failed") failed++;
  }

  return NextResponse.json({
    ok: true,
    checked: completions.length,
    eligible: eligible.length,
    sent,
    failed,
  });
}

/**
 * Send one quiz and record its session. Returns 'sent' | 'failed'.
 * Never throws — errors are logged and returned as 'failed'.
 */
async function spawnQuiz(supabase, item, nowIso) {
  const { player, lesson, question, existingSessionId } = item;
  const lang = normalizeLang(player.preferred_language);

  // Render message + buttons. Snapshot the raw question so grading
  // survives lesson edits.
  const promptText = pickLangString(question.prompt, lang);
  const buttons = (question.buttons || []).slice(0, 3).map((b) => ({
    id: String(b.id),
    label: pickLangString(b.label, lang).slice(0, 20),
  }));

  if (!promptText || buttons.length === 0) {
    console.error(
      "[cron/whatsapp-review-quizzes] question has no renderable content",
      { lesson_id: lesson.id, question_id: question.id },
    );
    return "failed";
  }

  // UPSERT the session row so concurrent cron ticks can't double-spawn.
  // If existing (status='queued'), we're re-sending — patch it. Else
  // insert fresh.
  let sessionId = existingSessionId;
  if (!sessionId) {
    const { data: inserted, error: insertErr } = await supabase
      .from("whatsapp_review_sessions")
      .insert({
        player_id: player.id,
        lesson_id: lesson.id,
        question_id: question.id,
        question_snapshot: question,
        status: "queued",
        queued_at: nowIso,
      })
      .select("id")
      .single();
    if (insertErr) {
      // 23505 = another cron tick beat us to it. Fine, skip.
      if (insertErr.code !== "23505") {
        console.error(
          "[cron/whatsapp-review-quizzes] session insert failed:",
          insertErr,
        );
      }
      return "failed";
    }
    sessionId = inserted.id;
  }

  // Fire the WhatsApp send.
  let providerMessageId = null;
  try {
    const sendResult = await sendWhatsappButtons({
      telefone: player.phone_e164,
      message: promptText,
      buttons,
    });
    providerMessageId = sendResult.messageId;
  } catch (err) {
    const errMsg = err?.message ?? String(err);
    console.error(
      "[cron/whatsapp-review-quizzes] send failed:",
      sessionId,
      errMsg,
    );
    await supabase
      .from("whatsapp_review_sessions")
      .update({
        metadata: { send_error: errMsg, last_send_attempt_at: nowIso },
      })
      .eq("id", sessionId);
    return "failed";
  }

  // Mark session 'sent' + refresh snapshot (in case the lesson was
  // edited since the session was first queued).
  await supabase
    .from("whatsapp_review_sessions")
    .update({
      status: "sent",
      sent_at: nowIso,
      provider_message_id: providerMessageId,
      question_snapshot: question,
    })
    .eq("id", sessionId);

  // Log to whatsapp_messages so the conversation view shows it.
  await supabase.from("whatsapp_messages").insert({
    player_id: player.id,
    phone_e164: player.phone_e164,
    direction: "outbound",
    provider: "zapi",
    provider_message_id: providerMessageId,
    via: "review_quiz",
    body: renderQuizBody(promptText, buttons),
    metadata: {
      review_session_id: sessionId,
      lesson_id: lesson.id,
      question_id: question.id,
    },
  });

  // Bump the shared activity gate — a fresh quiz counts as recent
  // outbound so the next cron tick won't stack another message.
  await supabase
    .from("players")
    .update({
      whatsapp_last_outbound_at: nowIso,
      last_whatsapp_activity_at: nowIso,
    })
    .eq("id", player.id);

  return "sent";
}

/* ─── validation + render helpers ─────────────────────────────── */

function isValidQuestion(q) {
  if (!q || typeof q !== "object") return false;
  if (typeof q.id !== "string" || !q.id) return false;
  if (!q.prompt || typeof q.prompt !== "object") return false;
  const buttons = Array.isArray(q.buttons) ? q.buttons : null;
  if (!buttons || buttons.length === 0) return false;
  const correctCount = buttons.filter((b) => b.correct === true).length;
  if (correctCount !== 1) return false;
  return true;
}

function normalizeLang(lang) {
  if (lang === "en" || lang === "pt") return lang;
  return "pt";
}

function pickLangString(bundle, lang) {
  if (typeof bundle === "string") return bundle;
  if (!bundle || typeof bundle !== "object") return "";
  return bundle[lang] || bundle.pt || bundle.en || "";
}

/**
 * Human-readable body stored in whatsapp_messages for admin viewing.
 * The interactive-buttons themselves render inline on WhatsApp; the
 * conversation log just wants a searchable text representation.
 */
function renderQuizBody(promptText, buttons) {
  const opts = buttons
    .map((b, i) => `${i + 1}. ${b.label}`)
    .join("\n");
  return `${promptText}\n\n${opts}`;
}
