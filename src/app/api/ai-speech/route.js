// pages/api/ai-speech/route.js
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const lessonId = formData.get("lessonId");
    const expectedText = formData.get("expectedText");
    const language = formData.get("language") || "pt-BR";

    if (!audioFile) {
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Convert audio to text using Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en", // We want English transcription
      response_format: "json",
    });

    const transcript = transcription.text;

    // Analyze pronunciation and accuracy
    const analysisPrompt = createSpeechAnalysisPrompt(
      transcript,
      expectedText,
      language
    );

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

    const feedback = JSON.parse(analysis.choices[0].message.content);

    // Store feedback in database
    await supabase.from("ai_speech_feedback").insert({
      user_id: user.id,
      lesson_id: lessonId,
      transcript: transcript,
      pronunciation_score: feedback.pronunciation_score,
      feedback: feedback,
      language: language,
    });

    return NextResponse.json({
      success: true,
      transcript,
      feedback,
      language,
    });
  } catch (error) {
    console.error("Speech analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze speech" },
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
