// src/lib/supabase/queries.js - Updated with better error handling
import { createClient } from "./client";

const supabase = createClient();

// Player Data Functions
export async function getPlayerProfile(userId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select(
        `
        *,
        club:clubs(*),
        progress:player_progress(*)
      `
      )
      .eq("id", userId)
      .single();

    if (error) {
      console.error(
        "Player profile error:",
        error.message,
        error.details,
        error.hint
      );
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error fetching player profile:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }
}

export async function getPlayerProgress(userId) {
  try {
    const { data, error } = await supabase
      .from("player_progress")
      .select("*")
      .eq("player_id", userId)
      .single();

    if (error) {
      console.error(
        "Player progress error:",
        error.message,
        error.details,
        error.hint
      );
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error fetching player progress:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }
}

// Pillar and Lesson Functions
export async function getAllPillars() {
  try {
    const { data, error } = await supabase
      .from("pillars")
      .select("*")
      .order("sort_order");

    if (error) {
      console.error("Pillars error:", error.message, error.details, error.hint);
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error fetching pillars:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }
}

export async function getLessonsByPillar(pillarId) {
  try {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("pillar_id", pillarId)
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      console.error(
        "Lessons by pillar error:",
        error.message,
        error.details,
        error.hint
      );
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error fetching lessons by pillar:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }
}

export async function getLessonById(lessonId) {
  try {
    const { data, error } = await supabase
      .from("lessons")
      .select(
        `
        *,
        pillar:pillars(*)
      `
      )
      .eq("id", lessonId)
      .single();

    if (error) {
      console.error(
        "Lesson by ID error:",
        error.message,
        error.details,
        error.hint
      );
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error fetching lesson:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }
}

// Player Completion Functions
export async function getPlayerLessonCompletions(userId) {
  try {
    const { data, error } = await supabase
      .from("lesson_completions")
      .select(
        `
        *,
        lesson:lessons(*)
      `
      )
      .eq("player_id", userId)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error(
        "Lesson completions error:",
        error.message,
        error.details,
        error.hint
      );
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("Error fetching lesson completions:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }
}

export async function markLessonComplete(
  userId,
  lessonId,
  score,
  xpEarned,
  timeSpent
) {
  try {
    // First, insert or update the lesson completion
    const { data: completionData, error: completionError } = await supabase
      .from("lesson_completions")
      .upsert({
        player_id: userId,
        lesson_id: lessonId,
        score,
        xp_earned: xpEarned,
        time_spent: timeSpent,
        completed_at: new Date().toISOString(),
      })
      .select();

    if (completionError) {
      console.error(
        "Lesson completion error:",
        completionError.message,
        completionError.details
      );
      throw completionError;
    }

    // Update player progress
    const progressResult = await updatePlayerProgress(userId, xpEarned);

    return { completion: completionData, progress: progressResult };
  } catch (error) {
    console.error("Error marking lesson complete:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }
}

export async function updatePlayerProgress(userId, xpToAdd) {
  try {
    // Get current progress
    const { data: currentProgress, error: fetchError } = await supabase
      .from("player_progress")
      .select("*")
      .eq("player_id", userId)
      .single();

    if (fetchError) {
      console.error("Fetch progress error:", fetchError.message);
      throw fetchError;
    }

    if (!currentProgress) {
      // Create initial progress if it doesn't exist
      const { data: newProgress, error: createError } = await supabase
        .from("player_progress")
        .insert({
          player_id: userId,
          total_xp: xpToAdd,
          current_level: 1,
          survival_progress: 0,
          precision_progress: 0,
          fluency_progress: 0,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (createError) {
        console.error("Create progress error:", createError.message);
        throw createError;
      }

      return newProgress;
    }

    const newTotalXp = currentProgress.total_xp + xpToAdd;
    const newLevel = Math.floor(newTotalXp / 500) + 1; // 500 XP per level

    // Update streak logic
    const today = new Date().toISOString().split("T")[0];
    const lastActivity = currentProgress.last_activity_date;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let newStreak = currentProgress.current_streak;
    if (lastActivity === yesterday) {
      newStreak += 1;
    } else if (lastActivity !== today) {
      newStreak = 1;
    }

    const { data, error } = await supabase
      .from("player_progress")
      .update({
        total_xp: newTotalXp,
        current_level: newLevel,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, currentProgress.longest_streak),
        last_activity_date: today,
        updated_at: new Date().toISOString(),
      })
      .eq("player_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Update progress error:", error.message, error.details);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error updating player progress:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }
}

// Achievement Functions
export async function getPlayerAchievements(userId) {
  try {
    const { data, error } = await supabase
      .from("player_achievements")
      .select(
        `
        *,
        achievement:achievements(*)
      `
      )
      .eq("player_id", userId)
      .order("earned_at", { ascending: false });

    if (error) {
      console.error(
        "Player achievements error:",
        error.message,
        error.details,
        error.hint
      );
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("Error fetching player achievements:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }
}

// Club Admin Functions
export async function getClubPlayers(clubId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select(
        `
        *,
        progress:player_progress(*),
        completions:lesson_completions(count)
      `
      )
      .eq("club_id", clubId);

    if (error) {
      console.error(
        "Club players error:",
        error.message,
        error.details,
        error.hint
      );
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error("Error fetching club players:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return [];
  }
}

export async function getClubStats(clubId) {
  try {
    // Get total players
    const { count: totalPlayers, error: playersError } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId);

    if (playersError) {
      console.error("Club stats players error:", playersError.message);
      throw playersError;
    }

    // Get active players (activity in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const { data: playerIds, error: playerIdsError } = await supabase
      .from("players")
      .select("id")
      .eq("club_id", clubId);

    if (playerIdsError) {
      console.error("Player IDs error:", playerIdsError.message);
      throw playerIdsError;
    }

    const playerIdList = playerIds.map((p) => p.id);

    const { count: activePlayers, error: activeError } = await supabase
      .from("player_progress")
      .select("*", { count: "exact", head: true })
      .gte("last_activity_date", sevenDaysAgo)
      .in("player_id", playerIdList);

    if (activeError) {
      console.error("Active players error:", activeError.message);
      throw activeError;
    }

    // Get total lessons completed
    const { count: totalLessons, error: lessonsError } = await supabase
      .from("lesson_completions")
      .select("*", { count: "exact", head: true })
      .in("player_id", playerIdList);

    if (lessonsError) {
      console.error("Total lessons error:", lessonsError.message);
      throw lessonsError;
    }

    return {
      totalPlayers: totalPlayers || 0,
      activePlayers: activePlayers || 0,
      totalLessonsCompleted: totalLessons || 0,
      averageProgress:
        totalPlayers > 0 ? Math.round((activePlayers / totalPlayers) * 100) : 0,
    };
  } catch (error) {
    console.error("Error fetching club stats:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return {
      totalPlayers: 0,
      activePlayers: 0,
      totalLessonsCompleted: 0,
      averageProgress: 0,
    };
  }
}
