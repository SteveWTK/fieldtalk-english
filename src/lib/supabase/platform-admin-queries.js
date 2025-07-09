// src/lib/supabase/platform-admin-queries.js
import { createClient } from "./client";

const supabase = createClient();

// Platform Statistics
export async function getPlatformStats() {
  try {
    // Get total clubs
    const { count: totalClubs, error: clubsError } = await supabase
      .from("clubs")
      .select("*", { count: "exact", head: true });

    if (clubsError) throw clubsError;

    // Get total players
    const { count: totalPlayers, error: playersError } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true });

    if (playersError) throw playersError;

    // Get total lessons
    const { count: totalLessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("*", { count: "exact", head: true });

    if (lessonsError) throw lessonsError;

    // Get total completions
    const { count: totalCompletions, error: completionsError } = await supabase
      .from("lesson_completions")
      .select("*", { count: "exact", head: true });

    if (completionsError) throw completionsError;

    // Get active users (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const { count: activeUsers, error: activeError } = await supabase
      .from("player_progress")
      .select("*", { count: "exact", head: true })
      .gte("last_activity_date", sevenDaysAgo);

    if (activeError) throw activeError;

    // Calculate recent growth (placeholder - would need historical data)
    const recentGrowth = 15; // This would be calculated from historical data

    return {
      totalClubs: totalClubs || 0,
      totalPlayers: totalPlayers || 0,
      totalLessons: totalLessons || 0,
      totalCompletions: totalCompletions || 0,
      activeUsers: activeUsers || 0,
      recentGrowth,
    };
  } catch (error) {
    console.error("Error fetching platform stats:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return {
      totalClubs: 0,
      totalPlayers: 0,
      totalLessons: 0,
      totalCompletions: 0,
      activeUsers: 0,
      recentGrowth: 0,
    };
  }
}

// Club Management
export async function getAllClubs() {
  try {
    const { data, error } = await supabase
      .from("clubs")
      .select(
        `
        *,
        player_count:players(count)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform the data to flatten the count
    const transformedData = data?.map((club) => ({
      ...club,
      player_count: club.player_count?.[0]?.count || 0,
    }));

    return transformedData || [];
  } catch (error) {
    console.error("Error fetching clubs:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
}

export async function createClub(clubData) {
  try {
    const { data, error } = await supabase
      .from("clubs")
      .insert({
        name: clubData.name,
        country: clubData.country,
        league: clubData.league,
        logo_url: clubData.logo_url,
        status: clubData.status || "trial",
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating club:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

export async function updateClub(clubId, clubData) {
  try {
    const { data, error } = await supabase
      .from("clubs")
      .update({
        name: clubData.name,
        country: clubData.country,
        league: clubData.league,
        logo_url: clubData.logo_url,
        status: clubData.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clubId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating club:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

export async function deleteClub(clubId) {
  try {
    // First, update all players to remove club association
    await supabase
      .from("players")
      .update({ club_id: null })
      .eq("club_id", clubId);

    // Then delete the club
    const { error } = await supabase.from("clubs").delete().eq("id", clubId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting club:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

// Player Management
export async function getAllPlayers() {
  try {
    const { data, error } = await supabase
      .from("players")
      .select(
        `
        *,
        club:clubs(name, country),
        progress:player_progress(*)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching players:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
}

export async function assignPlayerToClub(playerId, clubId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .update({
        club_id: clubId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error assigning player to club:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

export async function updatePlayerProfile(playerId, playerData) {
  try {
    const { data, error } = await supabase
      .from("players")
      .update({
        full_name: playerData.full_name,
        position: playerData.position,
        nationality: playerData.nationality,
        club_id: playerData.club_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating player:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

// Lesson Management
export async function getAllLessons() {
  try {
    const { data, error } = await supabase
      .from("lessons")
      .select(
        `
        *,
        pillar:pillars(*)
      `
      )
      .order("pillar_id", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) throw error;

    // Add completion count for each lesson
    const lessonsWithStats = await Promise.all(
      (data || []).map(async (lesson) => {
        const { count: completionCount } = await supabase
          .from("lesson_completions")
          .select("*", { count: "exact", head: true })
          .eq("lesson_id", lesson.id);

        return {
          ...lesson,
          completion_count: completionCount || 0,
        };
      })
    );

    return lessonsWithStats;
  } catch (error) {
    console.error("Error fetching lessons:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
}

export async function createLesson(lessonData) {
  try {
    const { data, error } = await supabase
      .from("lessons")
      .insert({
        title: lessonData.title,
        description: lessonData.description,
        pillar_id: lessonData.pillar_id,
        difficulty: lessonData.difficulty,
        xp_reward: lessonData.xp_reward,
        content: lessonData.content,
        image_url: lessonData.image_url,
        audio_url: lessonData.audio_url,
        estimated_duration: lessonData.estimated_duration,
        sort_order: lessonData.sort_order,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating lesson:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

export async function updateLesson(lessonId, lessonData) {
  try {
    const { data, error } = await supabase
      .from("lessons")
      .update({
        title: lessonData.title,
        description: lessonData.description,
        pillar_id: lessonData.pillar_id,
        difficulty: lessonData.difficulty,
        xp_reward: lessonData.xp_reward,
        content: lessonData.content,
        image_url: lessonData.image_url,
        audio_url: lessonData.audio_url,
        estimated_duration: lessonData.estimated_duration,
        sort_order: lessonData.sort_order,
        is_active: lessonData.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lessonId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating lesson:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

export async function deleteLesson(lessonId) {
  try {
    // First, delete all completions for this lesson
    await supabase
      .from("lesson_completions")
      .delete()
      .eq("lesson_id", lessonId);

    // Then delete the lesson
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting lesson:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

// Analytics Functions
export async function getClubAnalytics(clubId) {
  try {
    // Get club's player progress
    const { data: clubPlayers, error: playersError } = await supabase
      .from("players")
      .select(
        `
        id,
        full_name,
        progress:player_progress(*)
      `
      )
      .eq("club_id", clubId);

    if (playersError) throw playersError;

    // Get lesson completions for club players
    const playerIds = clubPlayers?.map((p) => p.id) || [];

    const { data: completions, error: completionsError } = await supabase
      .from("lesson_completions")
      .select(
        `
        *,
        lesson:lessons(title, pillar_id)
      `
      )
      .in("player_id", playerIds);

    if (completionsError) throw completionsError;

    // Calculate analytics
    const totalCompletions = completions?.length || 0;
    const avgScore =
      completions?.reduce((acc, c) => acc + (c.score || 0), 0) /
      Math.max(totalCompletions, 1);
    const totalXpEarned = completions?.reduce(
      (acc, c) => acc + (c.xp_earned || 0),
      0
    );

    return {
      playerCount: clubPlayers?.length || 0,
      totalCompletions,
      avgScore: Math.round(avgScore),
      totalXpEarned,
      players: clubPlayers,
      completions,
    };
  } catch (error) {
    console.error("Error fetching club analytics:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return {
      playerCount: 0,
      totalCompletions: 0,
      avgScore: 0,
      totalXpEarned: 0,
      players: [],
      completions: [],
    };
  }
}

export async function getLessonAnalytics(lessonId) {
  try {
    const { data: completions, error } = await supabase
      .from("lesson_completions")
      .select(
        `
        *,
        player:players(full_name, club:clubs(name))
      `
      )
      .eq("lesson_id", lessonId);

    if (error) throw error;

    const totalCompletions = completions?.length || 0;
    const avgScore =
      completions?.reduce((acc, c) => acc + (c.score || 0), 0) /
      Math.max(totalCompletions, 1);
    const avgTime =
      completions?.reduce((acc, c) => acc + (c.time_spent || 0), 0) /
      Math.max(totalCompletions, 1);

    return {
      totalCompletions,
      avgScore: Math.round(avgScore),
      avgTime: Math.round(avgTime / 1000), // Convert to seconds
      completions: completions || [],
    };
  } catch (error) {
    console.error("Error fetching lesson analytics:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return {
      totalCompletions: 0,
      avgScore: 0,
      avgTime: 0,
      completions: [],
    };
  }
}

// Operario Ferroviario Setup Functions
export async function createOperarioClub() {
  try {
    const operarioData = {
      name: "Operário Ferroviário Esporte Clube",
      country: "Brazil",
      league: "Campeonato Brasileiro Série B",
      logo_url: "/images/operario-logo.png",
      status: "trial",
    };

    const club = await createClub(operarioData);
    return club;
  } catch (error) {
    console.error("Error creating Operario club:", error);
    throw error;
  }
}

export async function setupOperarioPlayers(clubId, playerList) {
  try {
    const results = [];

    for (const playerData of playerList) {
      // Create auth user first
      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email: playerData.email,
          password: playerData.password || "operario123",
          user_metadata: {
            full_name: playerData.full_name,
            position: playerData.position,
            nationality: playerData.nationality || "Brazil",
          },
          email_confirm: true,
        });

      if (authError) {
        console.error(
          `Error creating auth user for ${playerData.full_name}:`,
          authError
        );
        continue;
      }

      // Update player with club assignment
      const { data: player, error: playerError } = await supabase
        .from("players")
        .update({ club_id: clubId })
        .eq("id", authUser.user.id)
        .select()
        .single();

      if (playerError) {
        console.error(
          `Error assigning club for ${playerData.full_name}:`,
          playerError
        );
        continue;
      }

      results.push(player);
    }

    return results;
  } catch (error) {
    console.error("Error setting up Operario players:", error);
    throw error;
  }
}
