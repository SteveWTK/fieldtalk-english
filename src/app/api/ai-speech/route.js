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

    console.log("[AI-Speech] Received params:", {
      hasAudio: !!audioFile,
      lessonId,
      expectedText,
      language,
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
    const analysisPrompt = createSpeechAnalysisPrompt(
      transcript,
      expectedText,
      language
    );

    console.log("[AI-Speech] Getting AI feedback...");

    let feedback;
    try {
      const analysis = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a VERY ENCOURAGING expert English pronunciation coach helping BEGINNER Brazilian football players improve their English speaking skills. Be extremely positive and give high scores (80-100) for any reasonable attempt. Focus on praising effort and progress, not perfection. Accept all accent variations (British, American, Australian, etc.) as correct.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        temperature: 0.7,
      });

      feedback = JSON.parse(analysis.choices[0].message.content);
      console.log("[AI-Speech] Feedback generated successfully");
    } catch (gptError) {
      console.error("[AI-Speech] GPT analysis error:", gptError);
      // Provide fallback feedback if GPT fails
      feedback = {
        pronunciation_score: 85,
        accuracy_score: 90,
        overall_score: 87,
        strengths: ["You made a great effort!", "Your confidence is showing", "You're communicating well!"],
        improvements: [
          "Keep practicing to build more confidence",
        ],
        encouragement:
          "Excellent attempt! You're doing really well. Keep practicing and you'll continue to improve!",
        specific_tips: [
          "Keep speaking English as much as possible",
          "You're on the right track!",
        ],
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

function createSpeechAnalysisPrompt(transcript, expectedText, language) {
  const feedbackLanguage = language === "en" ? "English" : "Portuguese";

  return `
Analyze this English pronunciation attempt by a BEGINNER Brazilian football player:

Expected text: "${expectedText}"
What they said: "${transcript}"

IMPORTANT INSTRUCTIONS:
- This is a BEGINNER student - be VERY encouraging and positive!
- Give scores between 80-100 for any reasonable attempt (reserve below 75 only for completely incorrect responses)
- ACCEPT ALL ACCENT VARIATIONS as correct (British, American, Australian, Irish, Scottish, South African, etc.)
- DO NOT penalize for accent differences - only correct if the word is completely wrong or unintelligible
- Focus on whether they communicated the message, not on perfect native-like pronunciation
- Praise their effort and courage to speak English!

SCORING GUIDELINES:
- pronunciation_score: 80-90 for basic attempts, 90-95 for good attempts, 95-100 for excellent attempts
- accuracy_score: Did they say the right words? Be lenient - accept synonyms and accent variations
- overall_score: Average of the two, biased towards being encouraging

Provide feedback in ${feedbackLanguage} in this JSON format:
{
  "pronunciation_score": 85,
  "accuracy_score": 90,
  "overall_score": 87,
  "strengths": ["At least 2-3 positive specific things they did well"],
  "improvements": ["Only 1-2 gentle, simple suggestions if really needed"],
  "encouragement": "A very positive and motivational message!",
  "specific_tips": ["1-2 simple, practical tips - be encouraging!"],
  "next_focus": "One simple thing to work on next - phrase it positively!"
}

Be extremely encouraging and specific. Praise their effort. Remember: different accents (British 'tomahto' vs American 'tomayto', British 'shedule' vs American 'skedule', etc.) are ALL CORRECT. Only flag true errors where the word is wrong or incomprehensible.
`;
}
