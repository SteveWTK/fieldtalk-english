// src/app/api/vocabulary/route.js
//
// GET /api/vocabulary?category=<>&subcategory=<>&edition=<>&limit=<>
//   → returns active vocabulary rows matching the filters.
//
// Used by the Game Centre's Memory Match (and later, the auto-
// generated Quiz). Auth: any signed-in user — the data isn't user-
// specific, but we don't want anonymous scraping of the catalogue.
//
// Default behaviour:
//   - category    REQUIRED (the picker UI always passes one)
//   - subcategory optional
//   - edition     optional — when set, returns rows where
//                 (edition = <value> OR edition IS NULL).
//                 NULL-edition rows are "universal" vocab shared
//                 across all editions (positions, pitch parts).
//   - limit       defaults to 100, max 200. The client shuffles +
//                 slices to the deck size it wants.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

export async function GET(request) {
  try {
    // Auth gate — signed-in users only.
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const category = (url.searchParams.get("category") || "").trim();
    const subcategory = (url.searchParams.get("subcategory") || "").trim();
    const edition = (url.searchParams.get("edition") || "").trim();
    const limitRaw = Number(url.searchParams.get("limit") || DEFAULT_LIMIT);
    const limit = Math.min(
      Math.max(1, Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT),
      MAX_LIMIT
    );

    if (!category) {
      return NextResponse.json(
        { error: "category is required" },
        { status: 400 }
      );
    }

    let q = supabase
      .from("vocabulary")
      .select(
        "id, en_term, pt_term, es_term, th_term, category, subcategory, edition, image_url, en_audio_url, pt_audio_url, difficulty, sort_order"
      )
      .eq("is_active", true)
      .eq("category", category)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (subcategory) q = q.eq("subcategory", subcategory);
    // For edition filtering: include rows for THIS edition AND
    // universal rows (edition IS NULL). PostgREST's .or() accepts a
    // CSV expression — we want `edition.eq.<value>,edition.is.null`.
    if (edition) {
      q = q.or(`edition.eq.${edition},edition.is.null`);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[api/vocabulary] fetch error:", error);
      return NextResponse.json(
        { error: error.message || "Could not load vocabulary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      category,
      subcategory: subcategory || null,
      edition: edition || null,
      entries: data || [],
      count: (data || []).length,
    });
  } catch (err) {
    console.error("[api/vocabulary] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
