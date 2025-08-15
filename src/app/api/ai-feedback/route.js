// src/app/api/ai-feedback/route.js
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Initialize OpenAI (we'll use the API key from environment variables)
async function callOpenAI(messages, temperature = 0.7) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    throw new Error(
      `OpenAI API error: ${response.status} - ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Language-specific prompts
const LANGUAGE_PROMPTS = {
  "pt-BR": {
    context: `Você é um tutor de inglês especializado em inglês britânico para futebol/football. 
      Você está ajudando jovens jogadores brasileiros a melhorar seu inglês para contextos profissionais do futebol.
      Foque na comunicação prática que eles precisarão nos treinos, com companheiros de equipe e em situações de jogo.
      Seja encorajador e construtivo, usando exemplos de futebol quando relevante.
      IMPORTANTE: Forneça feedback em português brasileiro, mas sempre inclua exemplos e correções em inglês britânico (ex: colour, realise, centre).
      Explique a gramática em português, mas mostre como usar corretamente em inglês britânico.
      Sempre termine com uma mensagem motivacional sobre continuar praticando inglês.`,
    writingPrompt: `Analise a escrita do aluno e forneça em PORTUGUÊS BRASILEIRO:
      1. Correções gramaticais com explicações em português (mas mostre a forma correta em inglês)
      2. Sugestões de vocabulário para contextos de futebol
      3. Feedback sobre clareza e estrutura geral
      4. Uma pontuação de 1 a 10
      5. Melhorias específicas que podem fazer
      6. Uma mensagem encorajadora sobre a importância do inglês no futebol
      
      Contexto: {context}
      
      IMPORTANTE: Retorne APENAS um objeto JSON válido, sem texto adicional, markdown ou formatação.
      
      Formate sua resposta exatamente como este JSON:
      {
        "score": 8,
        "grammar": [{"error": "texto incorreto", "correction": "correct text", "explanation": "explicação em português"}],
        "vocabulary": [{"original": "palavra", "suggestion": "melhor palavra", "reason": "motivo em português"}],
        "clarity": "feedback em português sobre clareza geral",
        "improvements": ["melhoria 1", "melhoria 2"],
        "encouragement": "mensagem positiva em português sobre futebol e inglês"
      }`,
    conversationContext: `Você está conversando com um jovem jogador de futebol brasileiro aprendendo inglês.
      Responda em PORTUGUÊS BRASILEIRO, mas sempre inclua a versão em inglês também.
      Corrija erros importantes gentilmente, mostrando a forma correta.
      Mantenha respostas curtas (2-3 frases no máximo).
      Contexto: {context}`,
    gapFillHint: `O aluno está com dificuldade em um exercício de preencher lacunas. 
      Forneça uma dica útil em PORTUGUÊS BRASILEIRO sem dar a resposta diretamente.
      Contexto: {context}`,
  },
  es: {
    context: `Eres un tutor de inglés especializado en inglés británico para fútbol. 
      Estás ayudando a jóvenes futbolistas hispanohablantes a mejorar su inglés para contextos profesionales del fútbol.
      Enfócate en la comunicación práctica que necesitarán en entrenamientos, con compañeros de equipo y en situaciones de partido.
      Sé alentador y constructivo, usando ejemplos de fútbol cuando sea relevante.
      IMPORTANTE: Proporciona retroalimentación en español, pero siempre incluye ejemplos y correcciones en inglés británico (ej: colour, realise, centre).
      Explica la gramática en español, pero muestra cómo usarla correctamente en inglés británico.
      Siempre termina con un mensaje motivacional sobre continuar practicando inglés.`,
    writingPrompt: `Analiza la escritura del estudiante y proporciona en ESPAÑOL:
      1. Correcciones gramaticales con explicaciones en español (pero muestra la forma correcta en inglés)
      2. Sugerencias de vocabulario para contextos de fútbol
      3. Retroalimentación sobre claridad y estructura general
      4. Una puntuación del 1 al 10
      5. Mejoras específicas que pueden hacer
      6. Un mensaje alentador sobre la importancia del inglés en el fútbol
      
      Contexto: {context}
      
      IMPORTANTE: Retorna SOLO un objeto JSON válido, sin texto adicional, markdown o formateo.
      
      Formatea tu respuesta exactamente como este JSON:
      {
        "score": 8,
        "grammar": [{"error": "texto incorrecto", "correction": "correct text", "explanation": "explicación en español"}],
        "vocabulary": [{"original": "palabra", "suggestion": "mejor palabra", "reason": "razón en español"}],
        "clarity": "retroalimentación en español sobre claridad general",
        "improvements": ["mejora 1", "mejora 2"],
        "encouragement": "mensaje positivo en español sobre fútbol e inglés"
      }`,
    conversationContext: `Estás conversando con un joven futbolista hispanohablante aprendiendo inglés.
      Responde en ESPAÑOL, pero siempre incluye la versión en inglés también.
      Corrige errores importantes gentilmente, mostrando la forma correcta.
      Mantén respuestas cortas (2-3 frases máximo).
      Contexto: {context}`,
    gapFillHint: `El estudiante tiene dificultad con un ejercicio de llenar espacios. 
      Proporciona una pista útil en ESPAÑOL sin dar la respuesta directamente.
      Contexto: {context}`,
  },
  fr: {
    context: `Vous êtes un tuteur d'anglais spécialisé dans l'anglais pour le football. 
      Vous aidez de jeunes footballeurs francophones à améliorer leur anglais pour des contextes professionnels du football.
      Concentrez-vous sur la communication pratique dont ils auront besoin à l'entraînement, avec leurs coéquipiers et dans les situations de match.
      Soyez encourageant et constructif, en utilisant des exemples de football quand c'est pertinent.
      IMPORTANT: Fournissez des commentaires en français, mais incluez toujours des exemples et des corrections en anglais.
      Expliquez la grammaire en français, mais montrez comment l'utiliser correctement en anglais.
      Terminez toujours par un message motivant sur la poursuite de la pratique de l'anglais.`,
    writingPrompt: `Analysez l'écriture de l'étudiant et fournissez en FRANÇAIS:
      1. Corrections grammaticales avec explications en français (mais montrez la forme correcte en anglais)
      2. Suggestions de vocabulaire pour les contextes de football
      3. Commentaires sur la clarté et la structure générale
      4. Une note de 1 à 10
      5. Améliorations spécifiques qu'ils peuvent apporter
      6. Un message encourageant sur l'importance de l'anglais dans le football
      
      Contexte: {context}
      
      IMPORTANT: Retournez SEULEMENT un objet JSON valide, sans texte supplémentaire, markdown ou formatage.
      
      Formatez votre réponse exactement comme ce JSON:
      {
        "score": 8,
        "grammar": [{"error": "texte incorrect", "correction": "correct text", "explanation": "explication en français"}],
        "vocabulary": [{"original": "mot", "suggestion": "meilleur mot", "reason": "raison en français"}],
        "clarity": "commentaire en français sur la clarté générale",
        "improvements": ["amélioration 1", "amélioration 2"],
        "encouragement": "message positif en français sur le football et l'anglais"
      }`,
    conversationContext: `Vous conversez avec un jeune footballeur francophone apprenant l'anglais.
      Répondez en FRANÇAIS, mais incluez toujours la version anglaise aussi.
      Corrigez les erreurs importantes gentiment, en montrant la forme correcte.
      Gardez les réponses courtes (2-3 phrases maximum).
      Contexte: {context}`,
    gapFillHint: `L'étudiant a des difficultés avec un exercice à trous. 
      Fournissez un indice utile en FRANÇAIS sans donner directement la réponse.
      Contexte: {context}`,
  },
  en: {
    context: `You are an English language tutor specializing in British English for football/soccer. 
      You're helping young footballers improve their English for professional football contexts in the UK and Europe.
      Focus on practical communication they'll need at training, with teammates, and in match situations.
      Be encouraging and constructive, using football examples when relevant.
      IMPORTANT: Always use British English spelling and vocabulary (colour, realise, centre, pitch, kit, etc.).`,
    writingPrompt: `Analyze the student's writing and provide feedback using British English:
      1. Grammar corrections with explanations (use British English spelling)
      2. Vocabulary suggestions for football contexts (British terminology)
      3. Overall clarity and structure feedback
      4. A score out of 10
      5. Specific improvements they can make
      
      Context: {context}
      
      IMPORTANT: Return ONLY a valid JSON object, no additional text, markdown, or formatting.
      
      Format your response exactly like this JSON:
      {
        "score": 8,
        "grammar": [{"error": "incorrect text", "correction": "correct text", "explanation": "explanation in English"}],
        "vocabulary": [{"original": "word", "suggestion": "better word", "reason": "reason in English"}],
        "clarity": "feedback on overall clarity in English",
        "improvements": ["improvement 1", "improvement 2"],
        "encouragement": "positive message about football and English learning"
      }`,
    conversationContext: `You're having a conversation with a young footballer learning English.
      Respond naturally but simply, using football contexts when relevant.
      Correct major errors gently by rephrasing correctly in your response.
      Keep responses short (2-3 sentences max).
      Context: {context}`,
    gapFillHint: `The student is struggling with a gap fill exercise. 
      Provide a helpful hint without giving the answer directly.
      Context: {context}`,
  },
};

// Get language prompt with fallback to pt-BR
function getLanguagePrompt(language = "pt-BR") {
  return LANGUAGE_PROMPTS[language] || LANGUAGE_PROMPTS["pt-BR"];
}

export async function POST(request) {
  try {
    console.log("AI Feedback endpoint called");

    // Create Supabase client
    const supabase = await createClient();
    console.log("Supabase client created");

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Unauthorized", details: authError?.message },
        { status: 401 }
      );
    }
    console.log("User authenticated:", user.id);

    // Get player's preferred language and English variant
    let userLanguage = "pt-BR"; // Default
    let englishVariant = "british"; // Default

    try {
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("preferred_language, english_variant")
        .eq("id", user.id)
        .single();

      if (playerError) {
        console.error("Error fetching player preferences:", playerError);
        // Continue with default settings instead of failing
      } else if (playerData) {
        userLanguage = playerData.preferred_language || "en";
        englishVariant = playerData.english_variant || "british";
        console.log(
          "User language set to:",
          userLanguage,
          "English variant:",
          englishVariant
        );
      }
    } catch (dbError) {
      console.error("Database query error:", dbError);
      // Continue with default settings
    }
    const langPrompts = getLanguagePrompt(userLanguage);

    const body = await request.json();
    const { type, content, context, lessonId } = body;

    let feedback = "";
    let analysis = {};

    switch (type) {
      case "writing":
        // Analyze writing exercise with language-specific prompt
        const writingMessages = [
          {
            role: "system",
            content:
              langPrompts.context +
              "\n\n" +
              langPrompts.writingPrompt.replace(
                "{context}",
                context || "General football English"
              ),
          },
          {
            role: "user",
            content: `Please analyze this writing: "${content}"`,
          },
        ];

        const writingResponse = await callOpenAI(writingMessages, 0.3);
        console.log("=== API DEBUG: OpenAI Raw Response ===");
        console.log("Type:", typeof writingResponse);
        console.log("Content:", writingResponse);
        console.log("First 200 chars:", writingResponse.substring(0, 200));
        console.log("Last 200 chars:", writingResponse.substring(writingResponse.length - 200));

        // Clean up the response - remove any markdown formatting and extra text
        let cleanedResponse = writingResponse.trim();
        
        // Remove markdown code blocks if present
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        
        // Find JSON content between first { and last }
        const firstBrace = cleanedResponse.indexOf('{');
        const lastBrace = cleanedResponse.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
          cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
        }
        
        console.log("Cleaned response:", cleanedResponse);

        try {
          // Try to parse as JSON first
          const parsedAnalysis = JSON.parse(cleanedResponse);
          console.log("✅ Successfully parsed as JSON:", parsedAnalysis);
          
          // Validate required fields
          if (typeof parsedAnalysis.score !== 'number') {
            parsedAnalysis.score = 7;
          }
          
          analysis = parsedAnalysis;
          feedback = writingResponse; // Keep original raw response for storage
        } catch (e) {
          console.log("❌ Failed to parse OpenAI response as JSON:", e.message);
          console.log("Raw response that failed to parse:", writingResponse);
          console.log("Cleaned response that failed:", cleanedResponse);
          
          // Fallback if JSON parsing fails - create structured response
          feedback = writingResponse;
          analysis = {
            score: 7,
            feedback: writingResponse,
            clarity: writingResponse.includes('clarity') ? writingResponse : "Your writing demonstrates good understanding of the topic.",
            grammar: [],
            vocabulary: [],
            improvements: ["Continue practicing writing in English", "Focus on clear sentence structure"],
            encouragement: "Great effort! Keep practicing to improve your English skills.",
          };
        }

        // Store in database
        await supabase.from("ai_feedback_history").insert({
          user_id: user.id,
          lesson_id: lessonId,
          type: "writing",
          content: content,
          feedback: feedback,
          score: analysis.score || null,
          language: userLanguage,
          created_at: new Date().toISOString(),
        });
        break;

      case "gap_fill":
        // Provide hints for gap fill exercises
        const gapFillMessages = [
          {
            role: "system",
            content:
              langPrompts.context +
              "\n\n" +
              langPrompts.gapFillHint.replace(
                "{context}",
                context || "Football vocabulary"
              ),
          },
          {
            role: "user",
            content: `The sentence is: "${content}". Give a hint for the missing word.`,
          },
        ];

        feedback = await callOpenAI(gapFillMessages, 0.5);
        break;

      case "conversation":
        // Coach response - respects user's English variant preference
        const coachMessages = [
          {
            role: "system",
            content:
              englishVariant === "american"
                ? `You are a friendly American soccer coach having a conversation in English. 
                Respond naturally and conversationally IN AMERICAN ENGLISH ONLY, as if you're helping a young player practice English.
                Keep responses short (2-3 sentences max) and encouraging. Use simple, clear American English.
                Use American soccer terminology (field, uniform, cleats, etc.) and American spelling (color, realize, center).
                Context: ${context || "Training ground conversation"}
                IMPORTANT: Your response must be in American English regardless of the language the student uses.`
                : `You are a friendly British football coach having a conversation in English. 
                Respond naturally and conversationally IN BRITISH ENGLISH ONLY, as if you're helping a young player practice English.
                Keep responses short (2-3 sentences max) and encouraging. Use simple, clear British English.
                Use British football terminology (pitch, kit, boots, etc.) and British spelling (colour, realise, centre).
                Context: ${context || "Training ground conversation"}
                IMPORTANT: Your response must be in British English regardless of the language the student uses.`,
          },
          {
            role: "user",
            content: content,
          },
        ];

        const coachResponse = await callOpenAI(coachMessages, 0.8);

        // Error analysis - in user's preferred language
        const analysisMessages = [
          {
            role: "system",
            content:
              userLanguage === "en"
                ? "Briefly identify any grammar or vocabulary errors in this sentence, if any. Be constructive and encouraging. Keep it short (1-2 sentences)."
                : `Briefly identify any grammar or vocabulary errors in this sentence, if any. Be constructive and encouraging. Keep it short (1-2 sentences). Respond in ${userLanguage === "pt-BR" ? "Portuguese" : userLanguage === "es" ? "Spanish" : userLanguage === "fr" ? "French" : "the user's language"}.`,
          },
          {
            role: "user",
            content: content,
          },
        ];

        const errorAnalysis = await callOpenAI(analysisMessages, 0.3);

        feedback = coachResponse;
        analysis = { errors: errorAnalysis };

        // Store conversation turn
        await supabase.from("ai_conversation_history").insert({
          user_id: user.id,
          lesson_id: lessonId,
          user_message: content,
          ai_response: coachResponse,
          error_analysis: errorAnalysis,
          language: userLanguage,
          created_at: new Date().toISOString(),
        });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid feedback type" },
          { status: 400 }
        );
    }

    const responseData = {
      success: true,
      feedback,
      analysis,
      language: userLanguage,
      timestamp: new Date().toISOString(),
    };

    console.log(
      "API Response being sent:",
      JSON.stringify(responseData, null, 2)
    );

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("AI Feedback error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Return more detailed error for debugging
    return NextResponse.json(
      {
        error: "Failed to generate feedback",
        details: error.message,
        type: error.name,
        hint: "Check server logs for more details",
      },
      { status: 500 }
    );
  }
}
