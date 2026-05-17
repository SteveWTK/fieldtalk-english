// src\app\api\ai-speech\route.js
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  console.log("[AI-Speech] Starting speech analysis...");

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const lessonId = formData.get("lessonId");
    const expectedText = formData.get("expectedText");
    const language = formData.get("language") || "pt-BR";
    // "score_only" → just three numeric scores, cheaper model, no verbose
    // strengths/improvements/encouragement. "full" → existing rich payload.
    const feedbackMode =
      formData.get("feedback_mode") === "score_only" ? "score_only" : "full";

    console.log("[AI-Speech] Received params:", {
      hasAudio: !!audioFile,
      lessonId,
      expectedText,
      language,
      feedbackMode,
      audioSize: audioFile?.size,
    });

    if (!audioFile) {
      console.error("[AI-Speech] No audio file provided");
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Get user info
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[AI-Speech] Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[AI-Speech] User authenticated:", user.id);

    // Convert audio to text using Whisper
    console.log("[AI-Speech] Sending to Whisper API...");

    let transcript;
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "en", // We want English transcription
        response_format: "json",
      });

      transcript = transcription.text;
      console.log("[AI-Speech] Transcription received:", transcript);
    } catch (whisperError) {
      console.error("[AI-Speech] Whisper API error:", whisperError);
      return NextResponse.json(
        { error: "Failed to transcribe audio. Please try again." },
        { status: 500 }
      );
    }

    // Analyze pronunciation and accuracy
    const { systemPrompt, userPrompt, model, maxTokens } = buildPromptForMode(
      feedbackMode,
      transcript,
      expectedText,
      language
    );

    console.log("[AI-Speech] Getting AI feedback...", { model, maxTokens });

    let feedback;
    try {
      const analysis = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      });

      feedback = JSON.parse(analysis.choices[0].message.content);
      console.log("[AI-Speech] Feedback generated successfully");
    } catch (gptError) {
      console.error("[AI-Speech] GPT analysis error:", gptError);
      // Fallback: a generous score so users aren't punished by API failures.
      feedback =
        feedbackMode === "score_only"
          ? {
              pronunciation_score: 95,
              accuracy_score: 95,
              overall_score: 95,
            }
          : {
              pronunciation_score: 95,
              accuracy_score: 95,
              overall_score: 95,
              strengths: ["Clear attempt", "Good rhythm"],
              improvements: [],
              encouragement: "Great work — keep going!",
              specific_tips: [],
            };
    }

    // Store feedback in database (optional - handle errors gracefully)
    try {
      await supabase.from("ai_speech_feedback").insert({
        user_id: user.id,
        lesson_id: lessonId,
        transcript: transcript,
        pronunciation_score: feedback.pronunciation_score,
        feedback: feedback,
        language: language,
      });
      console.log("[AI-Speech] Feedback saved to database");
    } catch (dbError) {
      console.error("[AI-Speech] Database save error (non-critical):", dbError);
      // Continue even if database save fails
    }

    console.log("[AI-Speech] Returning success response");
    return NextResponse.json({
      success: true,
      transcript,
      feedback,
      language,
    });
  } catch (error) {
    console.error("[AI-Speech] Unexpected error:", error);
    return NextResponse.json(
      { error: `Failed to analyze speech: ${error.message}` },
      { status: 500 }
    );
  }
}

// Shared scoring rubric. Goal: reward clean reads with 100, dock only for
// clear errors, and be radically accent-neutral. World football has dozens
// of valid English accents; this is not an elocution exam.
const SCORING_RUBRIC = `
SCORING RUBRIC (be generous — these are language learners, not elocutionists):
- 100        Perfect or near-perfect: every word recognisable, no clear errors. A clean read by anyone — native or non-native — must reach 100.
- 95–99      One small slip: a slightly misread word, a hesitation, a stumble that doesn't obscure meaning.
- 85–94      Two or three clear errors, but the gist is intact.
- 75–84      Several errors or a word missed; meaning partially conveyed.
- Below 75   Most words unintelligible or wrong.

ACCENT POLICY — read carefully:
- ALL English accents are 100% valid: British, American, Australian, Irish, Scottish, Indian, Caribbean, South African, Brazilian-English, etc.
- "tomahto" vs "tomayto", "shedule" vs "skedule", rhotic vs non-rhotic R, dropped H's, soft T's — ALL CORRECT.
- Lexical or grammatical synonyms count as correct ("football" ≡ "soccer", "pitch" ≡ "field").
- A foreign accent on its own NEVER reduces the score. Only reduce when a SPECIFIC word is wrong, missing, or genuinely unintelligible.

BIAS RULES:
- If you are unsure whether something was an error or just an accent, count it as correct.
- A read with no clear, identifiable mistake = 100. Do not artificially withhold 100.
- Use overall_score = round((pronunciation_score + accuracy_score) / 2).
`;

function buildPromptForMode(mode, transcript, expectedText, language) {
  const feedbackLanguage = language === "en" ? "English" : "Portuguese";

  // Score-only mode: a small, focused payload using a cheap model. We only
  // ask for the three numbers, so prompt + completion are both tiny.
  if (mode === "score_only") {
    return {
      model: "gpt-4o-mini",
      maxTokens: 80,
      systemPrompt:
        "You are a generous English pronunciation scorer for football English learners. Reply ONLY with valid JSON containing exactly three integer fields: pronunciation_score, accuracy_score, overall_score. No prose.",
      userPrompt: `Expected: "${expectedText}"
Heard:    "${transcript}"
${SCORING_RUBRIC}

Return JSON only:
{ "pronunciation_score": 0, "accuracy_score": 0, "overall_score": 0 }`,
    };
  }

  // Full mode: the verbose payload with strengths / improvements / tips.
  return {
    model: "gpt-4o-mini",
    maxTokens: 500,
    systemPrompt:
      "You are an encouraging English pronunciation coach for football-English learners. Be radically accent-neutral and generous. Reply with valid JSON only.",
    userPrompt: `Expected: "${expectedText}"
Heard:    "${transcript}"
${SCORING_RUBRIC}

Reply in ${feedbackLanguage} using EXACTLY this JSON shape:
{
  "pronunciation_score": 0,
  "accuracy_score": 0,
  "overall_score": 0,
  "strengths": ["2-3 short specific positives"],
  "improvements": ["empty array if there were no clear errors; otherwise 1-2 short, concrete pointers — only for clear errors, never for accent"],
  "encouragement": "one upbeat sentence",
  "specific_tips": ["0-2 tiny actionable tips, or empty"],
  "next_focus": "one short phrase, positive framing"
}`,
  };
}
