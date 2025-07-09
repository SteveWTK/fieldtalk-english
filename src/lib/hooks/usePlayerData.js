// src/lib/hooks/usePlayerData.js
import { useState, useEffect } from "react";
import {
  getPlayerProfile,
  getPlayerProgress,
  getAllPillars,
  getLessonsByPillar,
  getPlayerLessonCompletions,
  getPlayerAchievements,
} from "../supabase/queries";

export function usePlayerProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await getPlayerProfile(userId);
        setProfile(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  return { profile, loading, error };
}

export function usePlayerProgress(userId) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    async function fetchProgress() {
      try {
        setLoading(true);
        const data = await getPlayerProgress(userId);
        setProgress(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, [userId]);

  return { progress, loading, error, refetch: () => fetchProgress() };
}

export function usePillarsAndLessons() {
  const [pillars, setPillars] = useState([]);
  const [lessons, setLessons] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Get all pillars
        const pillarsData = await getAllPillars();
        setPillars(pillarsData);

        // Get lessons for each pillar
        const lessonsData = {};
        for (const pillar of pillarsData) {
          lessonsData[pillar.name] = await getLessonsByPillar(pillar.id);
        }
        setLessons(lessonsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { pillars, lessons, loading, error };
}

export function usePlayerCompletions(userId) {
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    async function fetchCompletions() {
      try {
        setLoading(true);
        const data = await getPlayerLessonCompletions(userId);
        setCompletions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCompletions();
  }, [userId]);

  return { completions, loading, error };
}

export function usePlayerAchievements(userId) {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    async function fetchAchievements() {
      try {
        setLoading(true);
        const data = await getPlayerAchievements(userId);
        setAchievements(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAchievements();
  }, [userId]);

  return { achievements, loading, error };
}

// Combined hook for dashboard data
export function usePlayerDashboard(userId) {
  const { profile, loading: profileLoading } = usePlayerProfile(userId);
  const {
    progress,
    loading: progressLoading,
    refetch: refetchProgress,
  } = usePlayerProgress(userId);
  const { pillars, lessons, loading: lessonsLoading } = usePillarsAndLessons();
  const { completions, loading: completionsLoading } =
    usePlayerCompletions(userId);
  const { achievements, loading: achievementsLoading } =
    usePlayerAchievements(userId);

  const loading =
    profileLoading ||
    progressLoading ||
    lessonsLoading ||
    completionsLoading ||
    achievementsLoading;

  // Calculate pillar progress based on completions
  const calculatePillarProgress = (pillarName) => {
    if (!lessons[pillarName] || !completions) return 0;

    const pillarLessons = lessons[pillarName];
    const completedLessons = completions.filter((c) =>
      pillarLessons.some((l) => l.id === c.lesson_id)
    );

    return pillarLessons.length > 0
      ? Math.round((completedLessons.length / pillarLessons.length) * 100)
      : 0;
  };

  // Enhanced pillars with progress
  const enhancedPillars = pillars.map((pillar) => ({
    ...pillar,
    progress: calculatePillarProgress(pillar.name),
    lessons: lessons[pillar.name] || [],
    level: Math.max(1, Math.floor(calculatePillarProgress(pillar.name) / 10)),
  }));

  return {
    profile,
    progress,
    pillars: enhancedPillars,
    lessons,
    completions,
    achievements,
    loading,
    refetchProgress,
  };
}
