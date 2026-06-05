// src/app/api/translate/route.js
//
// Best-effort runtime translation of lesson-page content for users
// whose preferredLanguage isn't English. Most static UI strings now
// come from local locale JSON; this endpoint handles the DB-stored
// lesson content (titles, scenarios, cultural notes, etc.) that
// hasn't been translated at content-authoring time.
//
// Failure mode: NEVER return 5xx. If the OpenAI key is missing, the
// API times out, the model errors, whatever — return 200 with the
// original (English) text and a `untranslated: true` flag. The lesson
// page already swallows non-200 responses by falling back to the
// English content, but a 200-with-original-text response keeps
// Vercel's anomaly detector quiet and gives the caller a clearer
// signal that no translation happened.
//
// The only legitimate non-200 responses are 401 (unauthenticated)
// and 400 (malformed body) — both client errors, not service errors.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENAI_TIMEOUT_MS = 8000;

const LANGUAGE_NAMES = {
  "pt-BR": "Portuguese (Brazil)",
  pt: "Portuguese (Brazil)",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
  hi: "Hindi",
  en: "English",
};

async function callOpenAI(messages, temperature = 0.3) {
  // Wrapped in a hand-rolled timeout because the global fetch has no
  // built-in timeout and a slow OpenAI response was likely the cause
  // of the previous "function crashes early without proper logging"
  // pattern on Vercel (the function hit its serverless timeout
  // before any catch ran).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages,
          temperature,
          max_tokens: 1000,
        }),
      }
    );
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`OpenAI ${response.status}: ${errorText.slice(0, 200)}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request) {
  // ── Auth (legitimate 401) ──
  let user;
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    user = authUser;
  } catch (err) {
    console.warn("[translate] auth check failed:", err?.message);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Body parse (legitimate 400) ──
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const { text, targetLanguage, context } = body || {};
  if (!text || !targetLanguage) {
    return NextResponse.json(
      { error: "Missing required fields: text and targetLanguage" },
      { status: 400 }
    );
  }

  // No-op for English (the source language).
  if (targetLanguage === "en") {
    return NextResponse.json({ translatedText: text });
  }

  // From here on, EVERY failure path returns 200 with the original
  // text + untranslated: true. The client (lesson page) already
  // treats no-translation as "show the source string", so this is a
  // silent graceful fallback rather than a service error.

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      translatedText: text,
      untranslated: true,
      reason: "translation_disabled",
    });
  }

  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const messages = [
    {
      role: "system",
      content: `You are a professional translator specializing in educational content for young football/soccer players.
        Translate the given text accurately to ${languageName}, maintaining the tone and context.
        Keep the translation natural and age-appropriate for teenage football players.
        ${context ? `Additional context: ${context}` : ""}`,
    },
    {
      role: "user",
      content: `Translate the following text to ${languageName}:\n\n${text}`,
    },
  ];

  try {
    const translated = await callOpenAI(messages);
    if (!translated) {
      // OpenAI returned an empty completion — graceful fallback.
      return NextResponse.json({
        translatedText: text,
        untranslated: true,
        reason: "empty_completion",
      });
    }
    return NextResponse.json({ translatedText: translated });
  } catch (err) {
    // Log but don't 5xx — translation is best-effort. The lesson
    // page renders the source string unchanged when this returns.
    console.warn(
      "[translate] OpenAI call failed for user",
      user.id,
      "→ returning original text:",
      err?.message
    );
    return NextResponse.json({
      translatedText: text,
      untranslated: true,
      reason: "openai_error",
    });
  }
}
