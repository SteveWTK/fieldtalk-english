// src/app/api/admin/push/test/route.js
//
// Admin-only test endpoint. Sends a single notification of any
// supported kind to a target player, bypassing the cron's dedup +
// idle filters. Use it from the browser / curl while iterating on
// copy or verifying that a fresh subscription is alive.
//
// Body:
//   {
//     playerId: "uuid",
//     kind:     "welcome_pack" | "pack_reminder" | "match_starting",
//     vars?:    { count?: 2, predictionTitle?: "...", stepId?: "..." }
//   }
//
// Returns the { sent, dead } counts from sendToPlayer().

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { sendToPlayer } from "@/lib/push/send";
import { SUPPORTED_KINDS } from "@/lib/push/copy";

export async function POST(request) {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const playerId =
      typeof body.playerId === "string" ? body.playerId.trim() : "";
    const kind = typeof body.kind === "string" ? body.kind.trim() : "";
    const vars = body.vars && typeof body.vars === "object" ? body.vars : {};

    if (!playerId) {
      return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
    }
    if (!SUPPORTED_KINDS.includes(kind)) {
      return NextResponse.json(
        { error: `Unsupported kind. Use one of: ${SUPPORTED_KINDS.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await sendToPlayer({ playerId, kind, vars });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[admin/push/test] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
