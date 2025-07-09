/* eslint-disable @typescript-eslint/no-unused-vars */
// src/lib/hooks/useClubData.js - Fixed exports
import { useState, useEffect } from "react";
import { getClubPlayers, getClubStats } from "../supabase/queries";

export function useClubPlayers(clubId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clubId) return;

    async function fetchPlayers() {
      try {
        setLoading(true);
        const data = await getClubPlayers(clubId);
        setPlayers(data);
      } catch (err) {
        setError(err.message);
        console.error("Error in useClubPlayers:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
  }, [clubId]);

  return { players, loading, error };
}

export function useClubStats(clubId) {
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activePlayers: 0,
    totalLessonsCompleted: 0,
    averageProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clubId) return;

    async function fetchStats() {
      try {
        setLoading(true);
        const data = await getClubStats(clubId);
        setStats(data);
      } catch (err) {
        setError(err.message);
        console.error("Error in useClubStats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [clubId]);

  return { stats, loading, error };
}

// Demo data for when no club is connected - PROPERLY EXPORTED
export function useDemoClubData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const stats = {
    totalPlayers: 28,
    activePlayers: 23,
    totalLessonsCompleted: 156,
    averageProgress: 72,
    weeklyActivity: 89,
  };

  const players = [
    {
      id: 1,
      full_name: "João Silva",
      position: "Midfielder",
      nationality: "Brazil",
      progress: {
        current_level: 7,
        total_xp: 2450,
        survival_progress: 85,
        precision_progress: 65,
        fluency_progress: 35,
        current_streak: 12,
        last_activity_date: new Date().toISOString().split("T")[0],
      },
      lessonsCompleted: 23,
      status: "active",
    },
    {
      id: 2,
      full_name: "Carlos Rodriguez",
      position: "Defender",
      nationality: "Spain",
      progress: {
        current_level: 9,
        total_xp: 3200,
        survival_progress: 95,
        precision_progress: 88,
        fluency_progress: 67,
        current_streak: 8,
        last_activity_date: new Date(Date.now() - 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      lessonsCompleted: 35,
      status: "active",
    },
    {
      id: 3,
      full_name: "Pierre Dubois",
      position: "Forward",
      nationality: "France",
      progress: {
        current_level: 4,
        total_xp: 1200,
        survival_progress: 45,
        precision_progress: 30,
        fluency_progress: 15,
        current_streak: 0,
        last_activity_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      lessonsCompleted: 8,
      status: "needs-attention",
    },
    {
      id: 4,
      full_name: "Ahmed Hassan",
      position: "Goalkeeper",
      nationality: "Egypt",
      progress: {
        current_level: 6,
        total_xp: 1890,
        survival_progress: 78,
        precision_progress: 82,
        fluency_progress: 41,
        current_streak: 15,
        last_activity_date: new Date().toISOString().split("T")[0],
      },
      lessonsCompleted: 19,
      status: "active",
    },
  ];

  const recentActivity = [
    {
      player: "João Silva",
      action: "Completed 'Match Communication' lesson",
      time: "2 hours ago",
      xp: 200,
    },
    {
      player: "Ahmed Hassan",
      action: "Achieved 15-day streak",
      time: "3 hours ago",
      xp: 100,
    },
    {
      player: "Carlos Rodriguez",
      action: "Completed 'Press Interview' module",
      time: "1 day ago",
      xp: 350,
    },
    {
      player: "Pierre Dubois",
      action: "Started 'First Day Training' lesson",
      time: "5 days ago",
      xp: 50,
    },
  ];

  return {
    stats,
    players,
    recentActivity,
    loading,
    error,
  };
}
