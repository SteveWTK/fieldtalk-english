// src/app/api/translate/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function callOpenAI(messages, temperature = 0.3) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages,
      temperature,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

const LANGUAGE_NAMES = {
  'pt-BR': 'Portuguese (Brazil)',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'en': 'English'
};

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { text, targetLanguage, context } = body;

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'Missing required fields: text and targetLanguage' },
        { status: 400 }
      );
    }

    // Don't translate if target language is English
    if (targetLanguage === 'en') {
      return NextResponse.json({ translatedText: text });
    }

    const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;

    const messages = [
      {
        role: 'system',
        content: `You are a professional translator specializing in educational content for young football/soccer players. 
        Translate the given text accurately to ${languageName}, maintaining the tone and context.
        Keep the translation natural and age-appropriate for teenage football players.
        ${context ? `Additional context: ${context}` : ''}`
      },
      {
        role: 'user',
        content: `Translate the following text to ${languageName}:\n\n${text}`
      }
    ];

    const translatedText = await callOpenAI(messages);

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
}