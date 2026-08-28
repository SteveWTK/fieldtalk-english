// src/app/api/profile/route.js
//
// PATCH /api/profile  — update the signed-in user's own profile.
//
// Writable fields:
//   full_name, avatar_url, position — the profile basics.
//   phone_e164 — canonicalised WhatsApp number.
//   whatsapp_opted_in — LGPD consent flag; when flipping true, the
//     client MUST also send whatsapp_consent_text so we snapshot the
//     exact wording the user agreed to.
//   whatsapp_nudge_frequency — 'daily' | 'every_3_days' | 'weekly' | 'off'.
//   whatsapp_nudge_time_slot — 'morning' | 'afternoon' | 'evening'.
//
// Everything else on the players row (user_type, edition, email, …)
// is read-only from this endpoint by design — those need separate,
// more guarded paths.
import { NextResponse } from "next/server";
import { after } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { POSITIONS } from "@/lib/players/positions";
import { normalizeBrazilianPhone } from "@/lib/utils/phone";
import {
  firstName,
  sendSystemMessage,
} from "@/lib/whatsapp/system-messages";

const ALLOWED_NUDGE_FREQUENCIES = new Set([
  "daily",
  "every_3_days",
  "weekly",
  "off",
]);
const ALLOWED_NUDGE_TIME_SLOTS = new Set(["morning", "afternoon", "evening"]);

const ALLOWED_POSITION_CODES = new Set(POSITIONS.map((p) => p.code));

const MAX_NAME_LEN = 60;
const ALLOWED_AVATAR_HOSTS = new Set([
  "flagcdn.com",
  // Same project ref as in next.config.ts. Adjust if you move to a
  // different Supabase project or bucket host.
  "ojxmpejjvwfaxtlmcnuq.supabase.co",
]);

function sanitiseName(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s.length === 0) return ""; // empty string = clear
  return s.slice(0, MAX_NAME_LEN);
}

function validateAvatarUrl(raw) {
  if (raw == null || raw === "") return ""; // empty = clear
  try {
    const url = new URL(String(raw));
    if (url.protocol !== "https:") return null;
    if (!ALLOWED_AVATAR_HOSTS.has(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

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
      }
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const update = {};

    if ("full_name" in body) {
      const name = sanitiseName(body.full_name);
      if (name === null) {
        return NextResponse.json(
          { error: "Invalid full_name" },
          { status: 400 }
        );
      }
      update.full_name = name;
    }

    if ("avatar_url" in body) {
      const avatar = validateAvatarUrl(body.avatar_url);
      if (avatar === null) {
        return NextResponse.json(
          {
            error:
              "avatar_url must be empty or a URL on an allowed host (flagcdn.com or our Supabase project)",
          },
          { status: 400 }
        );
      }
      update.avatar_url = avatar;
    }

    if ("position" in body) {
      // null / empty string → clear the position. Any string value →
      // must match one of the canonical codes so a stale client can't
      // seed garbage into the column.
      const raw = body.position;
      if (raw == null || raw === "") {
        update.position = null;
      } else if (
        typeof raw === "string" &&
        ALLOWED_POSITION_CODES.has(raw.trim())
      ) {
        update.position = raw.trim();
      } else {
        return NextResponse.json(
          {
            error:
              "position must be one of the canonical codes (GK, RB, CB, …) or null",
          },
          { status: 400 }
        );
      }
    }

    if ("phone_e164" in body) {
      const raw = body.phone_e164;
      if (raw == null || raw === "") {
        update.phone_e164 = null;
      } else {
        const norm = normalizeBrazilianPhone(String(raw));
        if (!norm.ok) {
          return NextResponse.json(
            { error: `Invalid phone (${norm.reason})` },
            { status: 400 }
          );
        }
        update.phone_e164 = norm.e164;
      }
    }

    if ("whatsapp_opted_in" in body) {
      const optedIn = body.whatsapp_opted_in === true;
      update.whatsapp_opted_in = optedIn;
      if (optedIn) {
        // Snapshot the consent copy the user agreed to (LGPD audit).
        // Client must send this alongside the opt-in flip; missing =
        // reject rather than silently store a null.
        const consentText =
          typeof body.whatsapp_consent_text === "string" &&
          body.whatsapp_consent_text.trim().length > 0
            ? body.whatsapp_consent_text.trim().slice(0, 500)
            : null;
        if (!consentText) {
          return NextResponse.json(
            {
              error:
                "whatsapp_consent_text is required when opting in — send the exact wording shown to the user",
            },
            { status: 400 }
          );
        }
        update.whatsapp_consent_text = consentText;
        update.whatsapp_opted_in_at = new Date().toISOString();
      }
      // Opt-out (opted_in=false) intentionally KEEPS the historical
      // whatsapp_opted_in_at + consent_text — they're an audit trail
      // of "you did once agree, then withdrew".
    }

    if ("whatsapp_nudge_frequency" in body) {
      const raw = body.whatsapp_nudge_frequency;
      if (raw == null || raw === "") {
        update.whatsapp_nudge_frequency = null;
      } else if (
        typeof raw === "string" &&
        ALLOWED_NUDGE_FREQUENCIES.has(raw.trim())
      ) {
        update.whatsapp_nudge_frequency = raw.trim();
      } else {
        return NextResponse.json(
          {
            error:
              "whatsapp_nudge_frequency must be one of: daily, every_3_days, weekly, off",
          },
          { status: 400 }
        );
      }
    }

    if ("whatsapp_nudge_time_slot" in body) {
      const raw = body.whatsapp_nudge_time_slot;
      if (raw == null || raw === "") {
        update.whatsapp_nudge_time_slot = null;
      } else if (
        typeof raw === "string" &&
        ALLOWED_NUDGE_TIME_SLOTS.has(raw.trim())
      ) {
        update.whatsapp_nudge_time_slot = raw.trim();
      } else {
        return NextResponse.json(
          {
            error:
              "whatsapp_nudge_time_slot must be one of: morning, afternoon, evening",
          },
          { status: 400 }
        );
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseAdmin();
    // Snapshot the row BEFORE the update — needed to detect the
    // "opt-in transition" that triggers the welcome WhatsApp. Also
    // pulls the fields (name, language, welcome timestamp) we'll
    // need for the send itself. Small extra query in exchange for
    // an unambiguous trigger rule.
    const { data: currentPlayer } = await supabase
      .from("players")
      .select(
        "full_name, preferred_language, phone_e164, whatsapp_opted_in, whatsapp_welcomed_at",
      )
      .eq("id", user.id)
      .maybeSingle();

    const { error: updateError } = await supabase
      .from("players")
      .update(update)
      .eq("id", user.id);
    if (updateError) {
      // Postgres 23505 = unique constraint violation. The only unique
      // column PATCH touches is players.phone_e164 (constraint name
      // `players_phone_e164_key`) — return a structured `phone_in_use`
      // code so the client can show a friendly, translated message
      // rather than leaking the raw Postgres string to the user.
      if (
        updateError.code === "23505" &&
        (updateError.message || "").includes("phone_e164")
      ) {
        return NextResponse.json(
          {
            error: "phone_in_use",
            message: "This phone number is already linked to another account.",
          },
          { status: 409 },
        );
      }
      console.error("[profile] update error:", updateError);
      return NextResponse.json(
        {
          error: updateError.message || "Could not update profile",
          details: {
            code: updateError.code,
            hint: updateError.hint,
            details: updateError.details,
          },
        },
        { status: 500 }
      );
    }

    // Post-update state — merge the incoming update on top of the
    // pre-update snapshot so the trigger check sees the "if you
    // saved this, what would be true" view.
    const post = { ...(currentPlayer || {}), ...update };
    const shouldWelcome =
      post.whatsapp_opted_in === true &&
      post.phone_e164 &&
      currentPlayer?.whatsapp_welcomed_at == null;

    if (shouldWelcome) {
      // Fire welcome AFTER the response has been sent so onboarding's
      // "your dashboard is loading" experience isn't blocked on a
      // 1-2 second WhatsApp round-trip. If the send succeeds we set
      // whatsapp_welcomed_at so re-visits don't re-welcome; if it
      // fails, we DON'T set the flag — next PATCH will retry.
      const lang = post.preferred_language || "pt";
      const name = firstName(post.full_name, lang);
      const phone = post.phone_e164;

      after(async () => {
        try {
          const svc = await getSupabaseAdmin();
          const result = await sendSystemMessage(svc, {
            kind: "welcome",
            playerId: user.id,
            phoneE164: phone,
            lang,
            vars: { name },
            via: "system",
          });
          if (result.ok) {
            await svc
              .from("players")
              .update({ whatsapp_welcomed_at: new Date().toISOString() })
              .eq("id", user.id);
          } else {
            console.warn(
              "[profile] welcome send failed, will retry on next PATCH:",
              result.error,
            );
          }
        } catch (err) {
          console.error("[profile] welcome after() threw:", err);
        }
      });
    }

    return NextResponse.json({ ok: true, updated: update });
  } catch (err) {
    console.error("[profile] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
