// scripts/seed-database.js
// Run this script to populate your Supabase database with sample data

import { createClient } from "@supabase/supabase-js";

// Replace with your Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key for admin operations

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // 1. Create a demo club (Watford FC)
    console.log("📍 Creating Watford FC...");
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .upsert({
        id: "watford-fc-demo",
        name: "Watford FC",
        country: "England",
        league: "Premier League",
        logo_url: "/images/watford-logo.png",
      })
      .select()
      .single();

    if (clubError) {
      console.error("Error creating club:", clubError);
      return;
    }

    console.log("✅ Watford FC created");

    // 2. Seed pillars (should already exist from schema)
    console.log("🎯 Checking pillars...");
    const { data: pillars } = await supabase
      .from("pillars")
      .select("*")
      .order("sort_order");

    console.log(`✅ ${pillars?.length || 0} pillars found`);

    // 3. Create demo lessons for each pillar
    console.log("📚 Creating sample lessons...");

    const lessons = [
      // Survival English Lessons
      {
        title: "First Day at Training",
        description:
          "Essential phrases and vocabulary for your first day at the training ground",
        pillar_id: 1, // Survival
        difficulty: "Beginner",
        xp_reward: 150,
        estimated_duration: 25,
        sort_order: 1,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "Welcome to Watford FC",
              content:
                "You are João, a new midfielder who just signed with Watford FC. Navigate your first day at the training ground.",
              image_url: "/images/training-ground-entrance.jpg",
            },
            {
              type: "vocabulary",
              title: "Key Training Ground Vocabulary",
              words: [
                {
                  english: "changing room",
                  translation: "vestiário",
                  pronunciation: "/ˈtʃeɪndʒɪŋ ruːm/",
                },
                {
                  english: "training pitch",
                  translation: "campo de treinamento",
                  pronunciation: "/ˈtreɪnɪŋ pɪtʃ/",
                },
                {
                  english: "kit",
                  translation: "uniforme",
                  pronunciation: "/kɪt/",
                },
                {
                  english: "warm-up",
                  translation: "aquecimento",
                  pronunciation: "/ˈwɔːrm ʌp/",
                },
              ],
            },
            {
              type: "dialogue",
              title: "Meeting Your Coach",
              conversation: [
                {
                  speaker: "Coach",
                  text: "Good morning! You must be João. Welcome to Watford!",
                },
                {
                  speaker: "João",
                  text: "Good morning, Coach. Thank you! I'm excited to be here.",
                },
                {
                  speaker: "Coach",
                  text: "Excellent! Let me show you around. The changing room is over there.",
                },
                {
                  speaker: "João",
                  text: "Perfect. Where should I put my kit?",
                },
              ],
            },
          ],
        },
      },
      {
        title: "Banking and Money Basics",
        description:
          "Open a bank account, understand UK currency, and handle basic financial transactions",
        pillar_id: 1, // Survival
        difficulty: "Beginner",
        xp_reward: 120,
        estimated_duration: 20,
        sort_order: 2,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "Setting Up Your Life in England",
              content:
                "You need to open a bank account to receive your salary and manage your finances in the UK.",
            },
            {
              type: "vocabulary",
              title: "Banking Vocabulary",
              words: [
                {
                  english: "current account",
                  translation: "conta corrente",
                  pronunciation: "/ˈkʌrənt əˈkaʊnt/",
                },
                {
                  english: "debit card",
                  translation: "cartão de débito",
                  pronunciation: "/ˈdebɪt kɑːrd/",
                },
              ],
            },
          ],
        },
      },
      {
        title: "Ordering Food & Restaurant Basics",
        description:
          "Navigate UK restaurants, pubs, and food delivery with confidence",
        pillar_id: 1, // Survival
        difficulty: "Beginner",
        xp_reward: 130,
        estimated_duration: 20,
        sort_order: 3,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "First Night Out with Teammates",
              content:
                "The team is going for dinner after training. Learn to order confidently.",
            },
          ],
        },
      },

      // Precision English Lessons
      {
        title: "Tactical Instructions Understanding",
        description:
          "Master the language of formations, tactics, and in-game communication",
        pillar_id: 2, // Precision
        difficulty: "Intermediate",
        xp_reward: 200,
        estimated_duration: 30,
        sort_order: 1,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "Tactical Briefing",
              content:
                "It's match day preparation. The coach is explaining the tactical setup and your role.",
            },
            {
              type: "vocabulary",
              title: "Formation and Tactical Terms",
              words: [
                {
                  english: "press high",
                  translation: "pressionar alto",
                  pronunciation: "/pres haɪ/",
                },
                {
                  english: "drop deep",
                  translation: "recuar",
                  pronunciation: "/drɒp diːp/",
                },
                {
                  english: "overlap",
                  translation: "sobreposição",
                  pronunciation: "/ˈəʊvərlæp/",
                },
              ],
            },
          ],
        },
      },
      {
        title: "Match Communication",
        description:
          "Essential phrases for communicating with teammates during matches",
        pillar_id: 2, // Precision
        difficulty: "Intermediate",
        xp_reward: 180,
        estimated_duration: 25,
        sort_order: 2,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "Live Match Situations",
              content:
                "You're playing against Brighton. Learn to communicate effectively with your teammates.",
            },
          ],
        },
      },
      {
        title: "Set Piece Communication",
        description:
          "Master the language of corners, free kicks, and defensive organization",
        pillar_id: 2, // Precision
        difficulty: "Advanced",
        xp_reward: 250,
        estimated_duration: 30,
        sort_order: 3,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "Defending a Corner Kick",
              content:
                "Liverpool has a corner. You need to organize the defense and communicate with teammates.",
            },
          ],
        },
      },

      // Fluency English Lessons
      {
        title: "Press Interview Confidence",
        description:
          "Master the art of speaking to media with confidence and club messaging",
        pillar_id: 3, // Fluency
        difficulty: "Advanced",
        xp_reward: 250,
        estimated_duration: 35,
        sort_order: 1,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "Post-Match Interview",
              content:
                "You've just scored the winning goal against Arsenal. Sky Sports wants to interview you.",
            },
            {
              type: "interview_phrases",
              title: "Professional Interview Language",
              categories: [
                {
                  situation: "Good performance",
                  phrases: [
                    "Credit to the team",
                    "We worked hard for this",
                    "The manager prepared us well",
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        title: "Team Leadership Language",
        description:
          "Develop the communication skills needed to motivate and lead teammates",
        pillar_id: 3, // Fluency
        difficulty: "Expert",
        xp_reward: 300,
        estimated_duration: 40,
        sort_order: 2,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "Captain for the Day",
              content:
                "The regular captain is injured. You're wearing the armband and need to lead the team.",
            },
          ],
        },
      },
      {
        title: "Community and Charity Events",
        description:
          "Professional communication for community outreach and charity work",
        pillar_id: 3, // Fluency
        difficulty: "Advanced",
        xp_reward: 280,
        estimated_duration: 35,
        sort_order: 3,
        content: {
          type: "multi_step",
          steps: [
            {
              type: "scenario",
              title: "School Visit",
              content:
                "You're visiting a local primary school as part of the club's community program.",
            },
          ],
        },
      },
    ];

    // Insert lessons
    for (const lesson of lessons) {
      const { error } = await supabase.from("lessons").upsert(lesson);

      if (error) {
        console.error(`Error creating lesson "${lesson.title}":`, error);
      } else {
        console.log(`✅ Created lesson: ${lesson.title}`);
      }
    }

    // 4. Create demo players with progress
    console.log("👥 Creating demo players...");

    const demoPlayers = [
      {
        email: "joao.silva@demo.com",
        password: "demo123",
        metadata: {
          full_name: "João Silva",
          position: "Midfielder",
          nationality: "Brazil",
          club_id: club.id,
        },
        progress: {
          total_xp: 2450,
          current_level: 7,
          survival_progress: 85,
          precision_progress: 65,
          fluency_progress: 35,
          current_streak: 12,
        },
      },
      {
        email: "carlos.rodriguez@demo.com",
        password: "demo123",
        metadata: {
          full_name: "Carlos Rodriguez",
          position: "Defender",
          nationality: "Spain",
          club_id: club.id,
        },
        progress: {
          total_xp: 3200,
          current_level: 9,
          survival_progress: 95,
          precision_progress: 88,
          fluency_progress: 67,
          current_streak: 8,
        },
      },
    ];

    for (const player of demoPlayers) {
      // Create auth user
      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email: player.email,
          password: player.password,
          user_metadata: player.metadata,
          email_confirm: true,
        });

      if (authError) {
        console.error(`Error creating user ${player.email}:`, authError);
        continue;
      }

      // Update player progress
      const { error: progressError } = await supabase
        .from("player_progress")
        .upsert({
          player_id: authUser.user.id,
          ...player.progress,
          last_activity_date: new Date().toISOString().split("T")[0],
        });

      if (progressError) {
        console.error(
          `Error updating progress for ${player.email}:`,
          progressError
        );
      } else {
        console.log(`✅ Created demo player: ${player.metadata.full_name}`);
      }
    }

    // 5. Create main demo account for easy access
    console.log("🎯 Creating main demo account...");
    const { data: mainDemo, error: mainDemoError } =
      await supabase.auth.admin.createUser({
        email: "demo@fieldtalkenglish.com",
        password: "demo123",
        user_metadata: {
          full_name: "João Silva",
          position: "Midfielder",
          nationality: "Brazil",
          club_id: club.id,
        },
        email_confirm: true,
      });

    if (!mainDemoError) {
      await supabase.from("player_progress").upsert({
        player_id: mainDemo.user.id,
        total_xp: 2450,
        current_level: 7,
        survival_progress: 85,
        precision_progress: 65,
        fluency_progress: 35,
        current_streak: 12,
        last_activity_date: new Date().toISOString().split("T")[0],
      });

      console.log(
        "✅ Main demo account created: demo@fieldtalkenglish.com / demo123"
      );
    }

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📋 Demo Accounts Created:");
    console.log("- demo@fieldtalkenglish.com / demo123 (Main demo)");
    console.log("- joao.silva@demo.com / demo123");
    console.log("- carlos.rodriguez@demo.com / demo123");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  }
}

// Run the seeding function
if (import.meta.main) {
  seedDatabase();
}

export { seedDatabase };
