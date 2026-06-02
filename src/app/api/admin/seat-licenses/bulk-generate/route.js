// src/app/api/admin/seat-licenses/bulk-generate/route.js
//
// POST /api/admin/seat-licenses/bulk-generate
//
// Creates seat_license rows in one of two shapes:
//
//   1. Unique single-use codes (default): count = N, seatsPerLicense = 1
//      Each row has its own code and exactly one redeemable seat.
//      Used for Cultura Ceará Tier 3 "Bring 2 Friends" Full Access
//      vouchers, and for PIX bulk-pre-purchases handed off by name.
//
//   2. Capped branch code: count = 1, seatsPerLicense = N
//      One row, one shared code, N total seats. Used for small
//      branches where the coordinator can confidently distribute
//      a single code to a known cohort.
//
// Body:
//   {
//     partnerName: "Cultura Inglesa Ceará — Aldeota",
//     contactEmail?: "coordenador@cultura-ceara.com.br",
//     edition: "wc2026",
//     count: 30,
//     seatsPerLicense: 1,
//     codePrefix?: "CC-CEARA-2026A",
//     validUntil?: "2026-04-30T23:59:59-03:00",
//     notes?: "Free text — for internal records"
//   }
//
// Response:
//   {
//     created: 30,
//     licenses: [{ id, code, seats_total, valid_until }]
//   }

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { generateUniqueCodes } from "@/lib/admin/codes";

const MAX_BATCH = 500;

export async function POST(request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { user, supabase } = guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const partnerName =
    typeof body.partnerName === "string" ? body.partnerName.trim() : "";
  const contactEmail =
    typeof body.contactEmail === "string" ? body.contactEmail.trim() : null;
  const edition =
    typeof body.edition === "string" ? body.edition.trim() : "wc2026";
  const count = Math.floor(Number(body.count) || 0);
  const seatsPerLicense = Math.floor(Number(body.seatsPerLicense) || 1);
  const codePrefix =
    typeof body.codePrefix === "string" ? body.codePrefix.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : null;
  let validUntil = null;
  if (body.validUntil) {
    const parsed = new Date(body.validUntil);
    if (Number.isFinite(parsed.getTime())) {
      validUntil = parsed.toISOString();
    }
  }

  if (!partnerName) {
    return NextResponse.json(
      { error: "Missing partnerName" },
      { status: 400 }
    );
  }
  if (count < 1 || count > MAX_BATCH) {
    return NextResponse.json(
      { error: `count must be between 1 and ${MAX_BATCH}` },
      { status: 400 }
    );
  }
  if (seatsPerLicense < 1) {
    return NextResponse.json(
      { error: "seatsPerLicense must be >= 1" },
      { status: 400 }
    );
  }

  // Generate codes locally — unique-within-batch by construction.
  // Cross-batch collisions are still possible (vanishingly unlikely
  // with 32^6 keyspace) and would be caught by the UNIQUE index on
  // seat_licenses.code; we'd return 409 and the admin retries.
  const codes = generateUniqueCodes({ prefix: codePrefix, count });

  const rows = codes.map((code) => ({
    partner_name: partnerName,
    contact_email: contactEmail,
    edition,
    seats_total: seatsPerLicense,
    seats_used: 0,
    code,
    valid_until: validUntil,
    notes,
    created_by: user.id,
  }));

  const { data, error } = await supabase
    .from("seat_licenses")
    .insert(rows)
    .select("id, code, seats_total, valid_until");

  if (error) {
    console.error("[admin/seat-licenses/bulk-generate] insert error:", error);
    return NextResponse.json(
      {
        error: error.message || "Could not create licenses",
        hint: error.code === "23505"
          ? "Code collision — retry the request (extremely rare)."
          : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    created: data?.length || 0,
    licenses: data || [],
  });
}
