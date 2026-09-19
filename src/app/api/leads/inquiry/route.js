// src/app/api/leads/inquiry/route.js
//
// POST /api/leads/inquiry
//
// Public endpoint — no auth required. Accepts inquiries from the
// pricing page's "Fale com a gente / Talk to us" form and creates a
// row in the leads table so the sales team can work them from the
// existing /admin/leads CRM.
//
// The rest of the leads API is admin-gated; this route is
// deliberately unauthenticated because the visitor filling out the
// form has no account yet. That means it needs its own guardrails:
//
//   - Minimum validation (name + email + at least one contact
//     signal) — enforced here, not the buildLeadUpdate normaliser
//     which is intended for the admin CRUD path.
//   - Rate limiting to keep the form from being a mass-mail relay.
//     Simple in-memory throttle by IP: 5 requests per minute is
//     more than enough for a legit visitor and cheap to sustain.
//   - Explicit source + tags on insert so /admin/leads can filter
//     these apart from Paul's manual entries.
//   - Do NOT accept `stage`, `assigned_to`, `owner` etc from the
//     body — those are internal fields the CRM owns.
//
// The service-role admin client bypasses RLS so we can insert a
// leads row for a visitor with no session. This is safe because
// the endpoint only ever WRITES a new row with a fixed shape; it
// never reads or updates existing rows.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

// Rate limiter — in-memory, per-IP. Resets between deploys, which
// is acceptable for a public-facing form; a real rate limiter
// (Upstash / Redis) is a Phase 2 upgrade if abuse becomes a thing.
const rateBuckets = new Map();
const RATE_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT = 5;          // requests / window / IP

function ipFromRequest(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    rateBuckets.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return false;
}

// Valid tier tags — anything else the client sends gets dropped
// silently. Keeps the leads table's tag column clean and stops the
// form being used to inject arbitrary strings.
const VALID_TIERS = new Set(["squad", "roster", "agency", "player", "unsure"]);

// Length + shape caps. Mirrors the admin normaliser's caps so a
// pricing-page inquiry can be promoted to a full lead record
// without truncation surprises later.
const MAX_NAME = 120;
const MAX_ORG = 160;
const MAX_MESSAGE = 2000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  const ip = ipFromRequest(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullName = String(body?.full_name || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const phoneRaw = String(body?.phone || "").trim();
  const organization = String(body?.organization || "").trim();
  const tierRaw = String(body?.tier || "").trim().toLowerCase();
  const message = String(body?.message || "").trim();
  const language = String(body?.language || "").trim().toLowerCase();

  // Validation — a name + email is the minimum, plus at least one
  // signal about intent (either a tier or a message body). Without
  // that the row is noise for the CRM.
  if (!fullName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!tierRaw && !message) {
    return NextResponse.json(
      { error: "Please pick a plan or leave us a short message" },
      { status: 400 },
    );
  }

  const tier = VALID_TIERS.has(tierRaw) ? tierRaw : "unsure";

  // Map inquiry tier → CRM lead_type. Squad/Roster/Agency all read
  // as "org" leads (the buyer is an agency, academy, or club).
  // "Player" is an individual signup. Anything else stays generic.
  let lead_type;
  if (tier === "player") lead_type = "individual_player";
  else if (tier === "squad" || tier === "roster") lead_type = "academy";
  else if (tier === "agency") lead_type = "partner_other";
  else lead_type = "individual_player";

  // Tags — combining pricing_page (source-of-lead) + tier:<name>
  // gives Paul filter-friendly signals in the CRM without cluttering.
  const tags = ["pricing_page", `tier:${tier}`];
  if (language === "pt" || language === "en") {
    tags.push(`lang:${language}`);
  }

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      full_name: fullName.slice(0, MAX_NAME),
      email,
      phone_e164: phoneRaw ? phoneRaw.slice(0, 40) : null,
      organization_name: organization ? organization.slice(0, MAX_ORG) : null,
      lead_type,
      stage: "new",
      // `landing_form` is the closest existing source enum value.
      // `source_detail = "pricing_page:<tier>"` gives Paul a scannable
      // subtype in the CRM without needing a schema change.
      source: "landing_form",
      source_detail: `pricing_page:${tier}`,
      tags,
      summary: message ? message.slice(0, MAX_MESSAGE) : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[leads/inquiry] insert failed:", error);
    return NextResponse.json(
      { error: "Could not save your inquiry. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, lead_id: data.id });
}
