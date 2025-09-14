// src/lib/supabase/queries.js - Complete file with all functions + RLS fixes
import { createClient } from "./client";

const supabase = createClient();

// FIXED: Better error handling for player profile
export async function getPlayerProfile(playerId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select(
        `
        *,
        clubs:players_club_id_fkey (
          id,
          name,
          country,
          league,
          logo_url
        )
      `
      )
      .eq("id", playerId)
      .single();

    if (error) {
      console.error(
        "Player profile error:",
        error.message,
        error.details,
        error.hint
      );
      // Return a basic profile structure if there's an error
      return {
        id: playerId,
        full_name: "Unknown Player",
        user_type: "player",
        clubs: null,
        preferred_language: "en",
      };
    }

    return data;
  } catch (error) {
    console.error("Error fetching player profile:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return {
      id: playerId,
      full_name: "Unknown Player",
      user_type: "player",
      clubs: null,
      preferred_language: "en",
    };
  }
}

// Get player's preferred language
export async function getPlayerPreferredLanguage(playerId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("preferred_language")
      .eq("id", playerId)
      .single();

    if (error) {
      console.error("Error fetching preferred language:", error);
      return "en"; // Default to English
    }

    return data?.preferred_language || "en";
  } catch (error) {
    console.error("Error in getPlayerPreferredLanguage:", error);
    return "en";
  }
}

export async function getPlayerProgress(playerId) {
  try {
    const { data, error } = await supabase
      .from("player_progress")
      .select("*")
      .eq("player_id", playerId)
      .single();

    if (error) {
      console.error(
        "Player progress error:",
        error.message,
        error.details,
        error.hint
      );
      // If no progress record exists, return default values
      if (error.code === "PGRST116") {
        return {
          player_id: playerId,
          total_xp: 0,
          current_level: 1,
          survival_progress: 0,
          precision_progress: 0,
          fluency_progress: 0,
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
        };
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error fetching player progress:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
}

// Pillar and Lesson Functions - FROM ORIGINAL FILE
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
    return data || [];
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
    return data || [];
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

// FIXED: Add difficulty back to lesson queries
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
      console.error("Lesson by ID error:", error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return null;
  }
}

// Get all lessons (for general use)
export async function getAllLessons() {
  try {
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching lessons:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return [];
  }
}

// FIXED: Add back difficulty column since it exists in your schema
export async function getPlayerLessonCompletions(playerId) {
  try {
    const { data, error } = await supabase
      .from("lesson_completions")
      .select(
        `
        *,
        lessons (
          id,
          title,
          description,
          description_pt,
          difficulty,
          xp_reward
        )
      `
      )
      .eq("player_id", playerId)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("Lesson completions error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching lesson completions:", error);
    return [];
  }
}

// MUCH BETTER ERROR DEBUGGING: Step by step with detailed logging
export async function markLessonComplete(
  playerId,
  lessonId,
  score,
  xpEarned,
  timeSpent
) {
  console.log("=== STARTING LESSON COMPLETION ===");
  console.log("Input params:", {
    playerId,
    lessonId,
    score,
    xpEarned,
    timeSpent,
  });

  try {
    // Step 1: Insert lesson completion
    console.log("Step 1: Inserting lesson completion...");
    const { data: completionData, error: completionError } = await supabase
      .from("lesson_completions")
      .upsert({
        player_id: playerId,
        lesson_id: lessonId,
        score: score,
        xp_earned: xpEarned,
        time_spent: timeSpent,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (completionError) {
      console.error("❌ Lesson completion failed:", completionError);
      throw completionError;
    }

    console.log("✅ Lesson completion inserted:", completionData);

    // Step 2: Get current progress
    console.log("Step 2: Fetching current player progress...");
    const { data: currentProgress, error: progressFetchError } = await supabase
      .from("player_progress")
      .select("*")
      .eq("player_id", playerId)
      .single();

    if (progressFetchError) {
      console.error("❌ Progress fetch error details:", {
        message: progressFetchError.message,
        details: progressFetchError.details,
        hint: progressFetchError.hint,
        code: progressFetchError.code,
      });

      if (progressFetchError.code === "PGRST116") {
        console.log("No progress record found, will create new one...");
        // Create new progress record
        const newProgressData = {
          player_id: playerId,
          total_xp: xpEarned,
          current_level: 1,
          survival_progress: 0,
          precision_progress: 0,
          fluency_progress: 0,
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log("Creating new progress with:", newProgressData);

        const { data: newProgress, error: createError } = await supabase
          .from("player_progress")
          .insert(newProgressData)
          .select()
          .single();

        if (createError) {
          console.error("❌ Failed to create new progress:", {
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
            code: createError.code,
          });
          throw createError;
        }

        console.log("✅ New progress created:", newProgress);
        return { completion: completionData, progress: newProgress };
      } else {
        throw progressFetchError;
      }
    }

    console.log("✅ Current progress found:", currentProgress);

    // Step 3: Calculate new progress values
    console.log("Step 3: Calculating new progress values...");
    const currentXp = currentProgress?.total_xp || 0;
    const newTotalXp = currentXp + xpEarned;
    const newLevel = Math.floor(newTotalXp / 500) + 1;
    const today = new Date().toISOString().split("T")[0];

    // Simple streak calculation
    let newStreak = 1;
    let longestStreak = 1;

    if (currentProgress) {
      const lastActivity = currentProgress.last_activity_date;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastActivity === yesterdayStr) {
        newStreak = (currentProgress.current_streak || 0) + 1;
      } else if (lastActivity === today) {
        newStreak = currentProgress.current_streak || 1;
      }

      longestStreak = Math.max(newStreak, currentProgress.longest_streak || 1);
    }

    const progressUpdate = {
      total_xp: newTotalXp,
      current_level: newLevel,
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_activity_date: today,
      updated_at: new Date().toISOString(),
    };

    console.log("Progress update data:", progressUpdate);

    // Step 4: Update progress
    console.log("Step 4: Updating player progress...");
    const { data: progressResult, error: progressError } = await supabase
      .from("player_progress")
      .update(progressUpdate)
      .eq("player_id", playerId)
      .select()
      .single();

    if (progressError) {
      console.error("❌ Progress update failed:", {
        message: progressError.message,
        details: progressError.details,
        hint: progressError.hint,
        code: progressError.code,
        updateData: progressUpdate,
        playerId: playerId,
      });
      throw progressError;
    }

    console.log("✅ Progress updated successfully:", progressResult);
    console.log("=== LESSON COMPLETION SUCCESS ===");

    return { completion: completionData, progress: progressResult };
  } catch (error) {
    console.error("❌ LESSON COMPLETION FAILED:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      stack: error.stack,
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

    if (fetchError && fetchError.code !== "PGRST116") {
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

// FIXED: Better error handling for achievements
export async function getPlayerAchievements(playerId) {
  try {
    const { data, error } = await supabase
      .from("player_achievements")
      .select(
        `
        *,
        achievements (
          id,
          name,
          description,
          icon
        )
      `
      )
      .eq("player_id", playerId)
      .order("earned_at", { ascending: false });

    if (error) {
      console.error(
        "Player achievements error:",
        error.message,
        error.details,
        error.hint
      );
      return []; // Return empty array instead of throwing
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching player achievements:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }
}

// Club Admin Functions - FROM ORIGINAL FILE
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

// Club Functions
export async function getAllClubs() {
  try {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching clubs:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching clubs:", error);
    return [];
  }
}

// Utility Functions
export async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("id, full_name, user_type")
      .limit(1);

    if (error) {
      console.error("Database connection test failed:", error);
      return { success: false, error };
    }

    console.log("Database connection successful:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Database connection test error:", error);
    return { success: false, error };
  }
}

export async function ensurePlayerProgress(playerId) {
  try {
    const { data: existing } = await supabase
      .from("player_progress")
      .select("*")
      .eq("player_id", playerId)
      .single();

    if (!existing) {
      const { data, error } = await supabase
        .from("player_progress")
        .insert({
          player_id: playerId,
          total_xp: 0,
          current_level: 1,
          survival_progress: 0,
          precision_progress: 0,
          fluency_progress: 0,
          current_streak: 0,
          longest_streak: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating player progress:", error);
        throw error;
      }

      return data;
    }

    return existing;
  } catch (error) {
    console.error("Error ensuring player progress:", error);
    throw error;
  }
}

// UTILITY: Test player progress table directly
export async function testPlayerProgressTable(playerId) {
  try {
    console.log("Testing player_progress table for player:", playerId);

    // Test if we can select from the table
    const { data: selectTest, error: selectError } = await supabase
      .from("player_progress")
      .select("*")
      .eq("player_id", playerId)
      .single();

    console.log("Select test result:", {
      data: selectTest,
      error: selectError,
    });

    // Test if we can insert/update
    const testData = {
      player_id: playerId,
      total_xp: 999,
      current_level: 1,
      survival_progress: 0,
      precision_progress: 0,
      fluency_progress: 0,
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    };

    const { data: upsertTest, error: upsertError } = await supabase
      .from("player_progress")
      .upsert(testData)
      .select()
      .single();

    console.log("Upsert test result:", {
      data: upsertTest,
      error: upsertError,
    });

    return { selectTest, selectError, upsertTest, upsertError };
  } catch (error) {
    console.error("Test failed:", error);
    return { error };
  }
}
