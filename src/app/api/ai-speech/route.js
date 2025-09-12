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
              "You are an expert English pronunciation coach helping Brazilian football players improve their English speaking skills.",
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
        pronunciation_score: 70,
        accuracy_score: 75,
        overall_score: 72,
        strengths: ["You made a good effort!", "Your confidence is showing"],
        improvements: [
          "Keep practicing the pronunciation",
          "Try to speak more clearly",
        ],
        encouragement:
          "Great attempt! Keep practicing and you'll improve quickly.",
        specific_tips: [
          "Practice speaking slowly and clearly",
          "Listen to native speakers",
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
Analyze this English pronunciation attempt by a Brazilian football player:

Expected text: "${expectedText}"
What they said: "${transcript}"

Provide feedback in ${feedbackLanguage} in this JSON format:
{
  "pronunciation_score": 85,
  "accuracy_score": 90,
  "overall_score": 87,
  "strengths": ["Clear pronunciation of 'midfielder'", "Good rhythm"],
  "improvements": ["Work on the 'th' sound in 'the'", "Stress the first syllable in 'football'"],
  "encouragement": "Great job! Your confidence is improving!",
  "specific_tips": ["Practice saying 'the' like 'thee' before vowel sounds"],
  "next_focus": "Work on linking words together naturally"
}

Be encouraging and specific. Focus on football-related pronunciation challenges that Brazilian players commonly face.
`;
}
