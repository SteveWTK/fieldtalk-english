// scripts/setup-operario.js
// Run this script to set up Operario Ferroviario for testing

import { createClient } from "@supabase/supabase-js";
import {
  createOperarioClub,
  setupOperarioPlayers,
} from "../src/lib/supabase/platform-admin-queries.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupOperario() {
  console.log("🏟️ Setting up Operário Ferroviário...");

  try {
    // 1. Create the club
    console.log("📋 Creating Operário Ferroviário club...");
    const club = await createOperarioClub();
    console.log("✅ Club created:", club.name);

    // 2. Sample academy players (you can customize this list)
    const academyPlayers = [
      {
        email: "gabriel.santos@operario.com.br",
        full_name: "Gabriel Santos",
        position: "Midfielder",
        nationality: "Brazil",
      },
      {
        email: "lucas.oliveira@operario.com.br",
        full_name: "Lucas Oliveira",
        position: "Forward",
        nationality: "Brazil",
      },
      {
        email: "pedro.silva@operario.com.br",
        full_name: "Pedro Silva",
        position: "Defender",
        nationality: "Brazil",
      },
      {
        email: "mateus.costa@operario.com.br",
        full_name: "Mateus Costa",
        position: "Goalkeeper",
        nationality: "Brazil",
      },
      {
        email: "rafael.ferreira@operario.com.br",
        full_name: "Rafael Ferreira",
        position: "Midfielder",
        nationality: "Brazil",
      },
    ];

    // 3. Create academy player accounts
    console.log("👥 Creating academy player accounts...");
    const players = await setupOperarioPlayers(club.id, academyPlayers);
    console.log(`✅ Created ${players.length} academy players`);

    // 4. Create some Brazilian-specific lessons
    console.log("📚 Creating Brazilian-focused lessons...");

    const brazilianLessons = [
      {
        title: "Chegada ao Reino Unido",
        description:
          "Frases essenciais para brasileiros chegando na Inglaterra",
        pillar_id: 1, // Survival
        difficulty: "Beginner",
        xp_reward: 150,
        estimated_duration: 25,
        sort_order: 10,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "Chegando em Manchester",
              content:
                "Você é um jogador brasileiro que acabou de chegar em Manchester para jogar na Premier League. Aprenda as frases essenciais para seus primeiros dias.",
            },
            {
              type: "vocabulary",
              title: "Vocabulário Essencial",
              words: [
                {
                  english: "Where is the toilet?",
                  translation: "Onde fica o banheiro?",
                  pronunciation: "/weər ɪz ðə ˈtɔɪlət/",
                },
                {
                  english: "I don't understand",
                  translation: "Eu não entendo",
                  pronunciation: "/aɪ doʊnt ˌʌndərˈstænd/",
                },
                {
                  english: "Can you help me?",
                  translation: "Você pode me ajudar?",
                  pronunciation: "/kæn ju hɛlp mi/",
                },
                {
                  english: "Thank you very much",
                  translation: "Muito obrigado",
                  pronunciation: "/θæŋk ju ˈvɛri mʌtʃ/",
                },
              ],
            },
          ],
        },
      },
      {
        title: "Comunicação no Treino",
        description: "Comandos básicos de treino para jogadores brasileiros",
        pillar_id: 2, // Precision
        difficulty: "Intermediate",
        xp_reward: 200,
        estimated_duration: 30,
        sort_order: 10,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "Primeiro Treino",
              content:
                "Entenda os comandos do técnico e comunique-se com os companheiros durante o treino.",
            },
            {
              type: "vocabulary",
              title: "Comandos de Treino",
              words: [
                {
                  english: "Pass the ball",
                  translation: "Passe a bola",
                  pronunciation: "/pæs ðə bɔl/",
                },
                {
                  english: "Shoot on target",
                  translation: "Chute no gol",
                  pronunciation: "/ʃut ɑn ˈtɑrgət/",
                },
                {
                  english: "Press higher",
                  translation: "Pressione mais alto",
                  pronunciation: "/prɛs ˈhaɪər/",
                },
                {
                  english: "Track back",
                  translation: "Volte para marcar",
                  pronunciation: "/træk bæk/",
                },
              ],
            },
          ],
        },
      },
    ];

    // Insert Brazilian lessons
    for (const lesson of brazilianLessons) {
      const { error } = await supabase.from("lessons").insert(lesson);

      if (error) {
        console.error(`Error creating lesson "${lesson.title}":`, error);
      } else {
        console.log(`✅ Created lesson: ${lesson.title}`);
      }
    }

    console.log("\n🎉 Operário Ferroviário setup completed!");
    console.log("\n📋 Summary:");
    console.log(`- Club: ${club.name}`);
    console.log(`- Players: ${players.length} academy players created`);
    console.log(
      `- Lessons: ${brazilianLessons.length} Brazilian-focused lessons added`
    );
    console.log("\n🔐 Player Login Credentials:");
    academyPlayers.forEach((player) => {
      console.log(`- ${player.full_name}: ${player.email} / operario123`);
    });

    console.log("\n📱 Next Steps:");
    console.log("1. Share login credentials with academy players");
    console.log("2. Test the learning flow with real users");
    console.log("3. Gather feedback on content and UX");
    console.log("4. Use data for Watford presentation");
  } catch (error) {
    console.error("❌ Setup failed:", error);
  }
}

// Run the setup
if (import.meta.main) {
  setupOperario();
}

export { setupOperario };
