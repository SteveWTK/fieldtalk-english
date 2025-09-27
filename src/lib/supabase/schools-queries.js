import { createClient } from "./client";

const supabase = createClient();

// =====================================================
// SCHOOLS QUERIES
// =====================================================

export async function getAllSchools() {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching schools:", error);
    throw error;
  }
}

export async function getSchoolById(schoolId) {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching school:", error);
    throw error;
  }
}

export async function createSchool(schoolData) {
  try {
    const { data, error } = await supabase
      .from("schools")
      .insert([schoolData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating school:", error);
    throw error;
  }
}

export async function updateSchool(schoolId, schoolData) {
  try {
    const { data, error } = await supabase
      .from("schools")
      .update(schoolData)
      .eq("id", schoolId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating school:", error);
    throw error;
  }
}

// =====================================================
// CLASSES QUERIES
// =====================================================

export async function getClassesBySchool(schoolId) {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select(`
        *,
        teacher:players!classes_teacher_id_fkey(id, full_name),
        school:schools(id, name)
      `)
      .eq("school_id", schoolId)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching classes:", error);
    throw error;
  }
}

export async function getClassesByTeacher(teacherId) {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select(`
        *,
        school:schools(id, name),
        students:players!players_class_id_fkey(count)
      `)
      .eq("teacher_id", teacherId)
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching teacher classes:", error);
    throw error;
  }
}

export async function getClassById(classId) {
  try {
    const { data, error } = await supabase
      .from("classes")
      .select(`
        *,
        teacher:players!classes_teacher_id_fkey(id, full_name, email),
        school:schools(id, name),
        students:players!players_class_id_fkey(id, full_name, email, user_type)
      `)
      .eq("id", classId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching class:", error);
    throw error;
  }
}

export async function createClass(classData) {
  try {
    const { data, error } = await supabase
      .from("classes")
      .insert([classData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating class:", error);
    throw error;
  }
}

export async function updateClass(classId, classData) {
  try {
    const { data, error } = await supabase
      .from("classes")
      .update(classData)
      .eq("id", classId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error updating class:", error);
    throw error;
  }
}

// =====================================================
// STUDENTS QUERIES
// =====================================================

export async function getStudentsByClass(classId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select(`
        *,
        progress:player_progress(*),
        completions:lesson_completions(count)
      `)
      .eq("class_id", classId)
      .eq("user_type", "student")
      .order("full_name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
}

export async function getStudentsBySchool(schoolId) {
  try {
    const { data, error } = await supabase
      .from("players")
      .select(`
        *,
        class:classes(id, name),
        progress:player_progress(*),
        completions:lesson_completions(count)
      `)
      .eq("school_id", schoolId)
      .eq("user_type", "student")
      .order("full_name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching school students:", error);
    throw error;
  }
}

// =====================================================
// LESSON VOTING (Embedded Topics)
// =====================================================

export async function voteForLessonTopic(lessonId, stepId, topicIndex, playerId, classId = null) {
  try {
    const { data, error } = await supabase
      .from("lesson_votes")
      .insert([{
        lesson_id: lessonId,
        step_id: stepId,
        topic_index: topicIndex,
        player_id: playerId,
        class_id: classId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error voting:", error);
    throw error;
  }
}

export async function hasUserVotedInStep(lessonId, stepId, playerId) {
  try {
    const { data, error } = await supabase
      .from("lesson_votes")
      .select("id, topic_index")
      .eq("lesson_id", lessonId)
      .eq("step_id", stepId)
      .eq("player_id", playerId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (error) {
    console.error("Error checking vote:", error);
    return null;
  }
}

export async function getStepVoteResults(lessonId, stepId) {
  try {
    const { data, error } = await supabase
      .from("lesson_votes")
      .select("topic_index")
      .eq("lesson_id", lessonId)
      .eq("step_id", stepId);

    if (error) throw error;

    const results = {};
    (data || []).forEach(vote => {
      results[vote.topic_index] = (results[vote.topic_index] || 0) + 1;
    });

    return results;
  } catch (error) {
    console.error("Error getting vote results:", error);
    return {};
  }
}

export async function getClassVoteResults(lessonId, stepId, classId) {
  try {
    const { data, error } = await supabase
      .from("lesson_votes")
      .select("topic_index, player_id")
      .eq("lesson_id", lessonId)
      .eq("step_id", stepId)
      .eq("class_id", classId);

    if (error) throw error;

    const results = {
      byTopic: {},
      total: data?.length || 0
    };

    (data || []).forEach(vote => {
      results.byTopic[vote.topic_index] = (results.byTopic[vote.topic_index] || 0) + 1;
    });

    return results;
  } catch (error) {
    console.error("Error getting class vote results:", error);
    return { byTopic: {}, total: 0 };
  }
}

// =====================================================
// CONVERSATION TOPICS & VOTING (Legacy - for future use)
// =====================================================

export async function getActiveTopicsForClass(classId) {
  try {
    const { data, error } = await supabase
      .from("conversation_topics")
      .select("*")
      .eq("class_id", classId)
      .eq("is_active", true)
      .gte("vote_deadline", new Date().toISOString())
      .order("vote_deadline");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching active topics:", error);
    throw error;
  }
}

export async function createConversationTopic(topicData) {
  try {
    const { data, error } = await supabase
      .from("conversation_topics")
      .insert([topicData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating topic:", error);
    throw error;
  }
}

export async function getTopicsWithResultsForClass(classId) {
  try {
    const { data, error } = await supabase
      .from("conversation_topics")
      .select(`
        *,
        votes:topic_votes(count)
      `)
      .eq("class_id", classId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching topics with results:", error);
    throw error;
  }
}

// =====================================================
// ATTENDANCE QUERIES
// =====================================================

export async function markAttendance(attendanceData) {
  try {
    const { data, error } = await supabase
      .from("conversation_attendance")
      .upsert([attendanceData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error marking attendance:", error);
    throw error;
  }
}

export async function getAttendanceForClass(classId, startDate, endDate) {
  try {
    let query = supabase
      .from("conversation_attendance")
      .select(`
        *,
        student:players!conversation_attendance_player_id_fkey(id, full_name)
      `)
      .eq("class_id", classId);

    if (startDate) {
      query = query.gte("conversation_date", startDate);
    }
    if (endDate) {
      query = query.lte("conversation_date", endDate);
    }

    const { data, error } = await query.order("conversation_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching attendance:", error);
    throw error;
  }
}

export async function getAttendanceForStudent(playerId) {
  try {
    const { data, error } = await supabase
      .from("conversation_attendance")
      .select("*")
      .eq("player_id", playerId)
      .order("conversation_date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    throw error;
  }
}

export async function getAttendanceStats(classId) {
  try {
    const { data, error } = await supabase
      .from("conversation_attendance")
      .select("player_id, attended")
      .eq("class_id", classId);

    if (error) throw error;

    const stats = {};
    data.forEach(record => {
      if (!stats[record.player_id]) {
        stats[record.player_id] = { total: 0, attended: 0 };
      }
      stats[record.player_id].total++;
      if (record.attended) {
        stats[record.player_id].attended++;
      }
    });

    return stats;
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    return {};
  }
}