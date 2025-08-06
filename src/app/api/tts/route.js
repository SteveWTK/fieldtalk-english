// src/app/api/tts/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const { text, voice, englishVariant, voiceGender } = await request.json();

    // Select voice based on English variant and gender preference
    let selectedVoice = voice;
    
    if (!selectedVoice) {
      // Voice mapping based on variant and gender
      // Valid voices: nova, shimmer, echo, onyx, fable, alloy, ash, sage, coral
      if (englishVariant === "american") {
        selectedVoice = voiceGender === "female" ? "nova" : "echo"; // Female: Nova, Male: Echo
      } else {
        // British voices
        selectedVoice = voiceGender === "female" ? "fable" : "onyx"; // Female: Fable, Male: Onyx
      }
    }

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Call OpenAI TTS API
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text.substring(0, 4096), // Limit text length
        voice: selectedVoice, // alloy, echo, fable, onyx, nova, shimmer
        response_format: "mp3",
        speed: 0.9, // Slightly slower for language learners
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI TTS API error:", response.status, errorText);
      return NextResponse.json(
        { error: "TTS generation failed" },
        { status: response.status }
      );
    }

    // Return the audio data as a blob
    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
