import { createClient } from "./client";

const supabase = createClient();

export async function getAllLessonsForCMS() {
  try {
    const { data, error } = await supabase
      .from("lessons")
      .select(
        `
        *,
        pillar:pillars(*)
      `
      )
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching lessons:", error);
    throw error;
  }
}

export async function getLessonByIdForCMS(lessonId) {
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

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching lesson:", error);
    throw error;
  }
}

export async function createLesson(lessonData) {
  try {
    const allowedFields = [
      'title',
      'description',
      'description_pt',
      'pillar_id',
      'difficulty',
      'xp_reward',
      'content',
      'image_url',
      'audio_url',
      'estimated_duration',
      'is_active',
      'sort_order',
      'audio_assets',
      'visual_assets',
      'interactive_config',
      'lesson_code',
      'unit_number',
      'lesson_number',
      'level_name',
      'under_construction'
    ];

    const cleanedData = {};
    allowedFields.forEach(field => {
      if (field in lessonData) {
        if (field === 'pillar_id') {
          cleanedData[field] = lessonData[field] ? parseInt(lessonData[field]) : null;
        } else {
          cleanedData[field] = lessonData[field];
        }
      }
    });

    const { data, error } = await supabase
      .from("lessons")
      .insert([cleanedData])
      .select()
      .single();

    if (error) {
      console.error("Supabase error details:", error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error creating lesson:", error);
    throw error;
  }
}

export async function updateLesson(lessonId, lessonData) {
  try {
    const allowedFields = [
      'title',
      'description',
      'description_pt',
      'pillar_id',
      'difficulty',
      'xp_reward',
      'content',
      'image_url',
      'audio_url',
      'estimated_duration',
      'is_active',
      'sort_order',
      'audio_assets',
      'visual_assets',
      'interactive_config',
      'lesson_code',
      'unit_number',
      'lesson_number',
      'level_name',
      'under_construction'
    ];

    const cleanedData = {};
    allowedFields.forEach(field => {
      if (field in lessonData) {
        if (field === 'pillar_id') {
          cleanedData[field] = lessonData[field] ? parseInt(lessonData[field]) : null;
        } else {
          cleanedData[field] = lessonData[field];
        }
      }
    });

    const { data, error } = await supabase
      .from("lessons")
      .update(cleanedData)
      .eq("id", lessonId)
      .select()
      .single();

    if (error) {
      console.error("Supabase error details:", error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error("Error updating lesson:", error);
    throw error;
  }
}

export async function deleteLesson(lessonId) {
  try {
    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting lesson:", error);
    throw error;
  }
}

export async function cloneLesson(lessonId) {
  try {
    const original = await getLessonByIdForCMS(lessonId);

    const cloneData = {
      ...original,
      id: undefined,
      pillar_id: undefined,
      title: `${original.title} (Copy)`,
      is_active: false,
      created_at: undefined,
      updated_at: undefined,
    };

    return await createLesson(cloneData);
  } catch (error) {
    console.error("Error cloning lesson:", error);
    throw error;
  }
}

export async function uploadMedia(file, folder = "lesson-media") {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from("videos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("videos").getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading media:", error);
    throw error;
  }
}

export async function getAllPillarsForCMS() {
  try {
    const { data, error } = await supabase
      .from("pillars")
      .select("*")
      .order("sort_order");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching pillars:", error);
    throw error;
  }
}
