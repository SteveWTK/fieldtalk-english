/* eslint-disable @typescript-eslint/no-unused-vars */
// src/lib/supabase/role-queries.js
import { createClient } from "@/lib/supabase/client";

export const roleQueries = {
  // Create a new player profile after signup
  async createPlayerProfile(userId, playerData) {
    const supabase = createClient();

    try {
      // Update user_profiles to set user_type as player
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          user_type: "player",
          full_name: playerData.full_name,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Create player record
      const { data, error } = await supabase
        .from("players")
        .insert({
          id: userId,
          position: playerData.position,
          nationality: playerData.nationality,
          club_id: playerData.club_id || null,
        })
        .select()
        .single();

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Create client admin (for club managers/coaches)
  async createClientAdmin(userId, adminData) {
    const supabase = createClient();

    try {
      // Update user_profiles
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          user_type: "client_admin",
          full_name: adminData.full_name,
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Create client_admin record
      const { data, error } = await supabase
        .from("client_admins")
        .insert({
          id: userId,
          club_id: adminData.club_id,
          role_title: adminData.role_title,
          permissions: adminData.permissions || [
            "view_players",
            "manage_lessons",
          ],
        })
        .select()
        .single();

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  // Get all players for a club (client admin view)
  async getClubPlayers(clubId) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("players")
      .select(
        `
        *,
        user_profiles:id (
          full_name,
          email,
          profile_image_url,
          created_at
        )
      `
      )
      .eq("club_id", clubId);

    return { data, error };
  },

  // Get all clubs (platform admin view)
  async getAllClubs() {
    const supabase = createClient();

    const { data, error } = await supabase.from("clubs").select(`
        *,
        players:players(count),
        client_admins:client_admins(
          id,
          role_title,
          user_profiles:id (
            full_name,
            email
          )
        )
      `);

    return { data, error };
  },

  // Update user role (platform admin only)
  async updateUserRole(userId, newRole) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("user_profiles")
      .update({ user_type: newRole })
      .eq("id", userId)
      .select()
      .single();

    return { data, error };
  },
};
