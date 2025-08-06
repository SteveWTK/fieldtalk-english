// src/lib/supabase/academyDemo.js
// Helper functions for Academy Demo Lesson

import { createClient } from "./client";

const supabase = createClient();

/**
 * Find the Academy Demo Lesson by its metadata
 * Since the lesson uses a UUID, we search by the original_id metadata
 */
export async function getAcademyDemoLesson() {
  try {
    // Find lesson by metadata
    const { data: metadataResult, error: metadataError } = await supabase
      .from('lesson_metadata')
      .select('lesson_id')
      .eq('key', 'original_id')
      .eq('value', 'academy-demo-001')
      .single();

    if (metadataError || !metadataResult) {
      console.error('Academy demo lesson metadata not found:', metadataError);
      return null;
    }

    // Get the full lesson data
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        *,
        pillar:pillars(*)
      `)
      .eq('id', metadataResult.lesson_id)
      .single();

    if (lessonError) {
      console.error('Academy demo lesson not found:', lessonError);
      return null;
    }

    return lesson;
  } catch (error) {
    console.error('Error fetching academy demo lesson:', error);
    return null;
  }
}

/**
 * Get the Academy Demo Lesson UUID for direct access
 */
export async function getAcademyDemoLessonId() {
  try {
    const { data, error } = await supabase
      .from('lesson_metadata')
      .select('lesson_id')
      .eq('key', 'original_id')
      .eq('value', 'academy-demo-001')
      .single();

    if (error || !data) {
      console.error('Academy demo lesson ID not found:', error);
      return null;
    }

    return data.lesson_id;
  } catch (error) {
    console.error('Error fetching academy demo lesson ID:', error);
    return null;
  }
}

/**
 * Check if Academy Demo Lesson exists in database
 */
export async function academyDemoLessonExists() {
  try {
    const lessonId = await getAcademyDemoLessonId();
    return lessonId !== null;
  } catch (error) {
    console.error('Error checking academy demo lesson existence:', error);
    return false;
  }
}