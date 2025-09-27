import { createClient } from "./client";

const supabase = createClient();

// =====================================================
// ACADEMIES QUERIES
// =====================================================

export async function getAllAcademies() {
  try {
    const { data, error } = await supabase
      .from("academies")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching academies:", error);
    throw error;
  }
}

export async function getAcademyById(academyId) {
  try {
    const { data, error } = await supabase
      .from("academies")
      .select("*")
      .eq("id", academyId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching academy:", error);
    throw error;
  }
}

export async function createAcademy(academyData) {
  try {
    const { data, error } = await supabase
      .from("academies")
      .insert([academyData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating academy:", error);
    throw error;
  }
}

export async function updateAcademy(academyId, academyData) {
  try {
    const { data, error } = await supabase
      .from("academies")
      .update(academyData)
      .eq("id", academyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating academy:", error);
    throw error;
  }
}

export async function deleteAcademy(academyId) {
  try {
    const { error } = await supabase
      .from("academies")
      .delete()
      .eq("id", academyId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting academy:", error);
    throw error;
  }
}

// =====================================================
// PLAYERS QUERIES (FOR ACADEMIES)
// =====================================================

export async function getPlayersByAcademy(academyId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select(`
        *,
        progress:player_progress(*),
        completions:lesson_completions(count)
      `)
      .eq("academy_id", academyId)
      .eq("user_type", "player")
      .order("full_name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching players:", error);
    throw error;
  }
}

export async function getAdminsByAcademy(academyId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("academy_id", academyId)
      .eq("user_type", "client_admin")
      .order("full_name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching academy admins:", error);
    throw error;
  }
}

export async function createPlayer(playerData) {
  try {
    const { data, error } = await supabase
      .from("players")
      .insert([{
        ...playerData,
        user_type: "player",
        client_type: "player"
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating player:", error);
    throw error;
  }
}

// =====================================================
// ACADEMY STATISTICS
// =====================================================

export async function getAcademyStats(academyId) {
  try {
    const [players, completions] = await Promise.all([
      getPlayersByAcademy(academyId),
      supabase
        .from("lesson_completions")
        .select("id, player_id")
        .in("player_id",
          supabase
            .from("players")
            .select("id")
            .eq("academy_id", academyId)
            .eq("user_type", "player")
        )
    ]);

    const totalPlayers = players.length;
    const activePlayers = players.filter(p =>
      p.completions && p.completions[0]?.count > 0
    ).length;
    const totalLessonsCompleted = completions.data?.length || 0;
    const averageXP = players.length > 0
      ? Math.round(players.reduce((sum, p) => sum + (p.total_xp || 0), 0) / players.length)
      : 0;

    return {
      totalPlayers,
      activePlayers,
      totalLessonsCompleted,
      averageXP,
    };
  } catch (error) {
    console.error("Error fetching academy stats:", error);
    return {
      totalPlayers: 0,
      activePlayers: 0,
      totalLessonsCompleted: 0,
      averageXP: 0,
    };
  }
}