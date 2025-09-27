/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Calendar,
  TrendingUp,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getClassById,
  getAttendanceForClass,
  markAttendance,
  getClassVoteResults,
} from "@/lib/supabase/schools-queries";

function ClassDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const classId = params.id;

  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("students");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);

  useEffect(() => {
    if (classId) {
      loadClassData();
    }
  }, [classId]);

  useEffect(() => {
    if (classId && activeTab === "attendance") {
      loadAttendance();
    }
  }, [classId, activeTab, attendanceDate]);

  async function loadClassData() {
    try {
      setLoading(true);
      const data = await getClassById(classId);
      setClassData(data);
      setStudents(data.students || []);
    } catch (error) {
      console.error("Error loading class:", error);
      alert("Failed to load class data.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance() {
    try {
      const records = await getAttendanceForClass(
        classId,
        attendanceDate,
        attendanceDate
      );
      const attendanceMap = {};
      records.forEach((record) => {
        attendanceMap[record.player_id] = record.attended;
      });
      setAttendanceRecords(attendanceMap);
    } catch (error) {
      console.error("Error loading attendance:", error);
    }
  }

  async function handleSaveAttendance() {
    try {
      setSavingAttendance(true);
      const promises = students.map((student) => {
        const attended = attendanceRecords[student.id] || false;
        return markAttendance({
          class_id: classId,
          player_id: student.id,
          conversation_date: attendanceDate,
          attended: attended,
          marked_by: user.id,
        });
      });

      await Promise.all(promises);
      alert("Attendance saved successfully!");
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Failed to save attendance. Please try again.");
    } finally {
      setSavingAttendance(false);
    }
  }

  function toggleAttendance(studentId) {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading class...
          </p>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Class not found
          </p>
          <button
            onClick={() => router.push("/teacher/dashboard")}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push("/teacher/dashboard")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {classData.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                {classData.school && <span>{classData.school.name}</span>}
                {classData.level && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded">
                    {classData.level}
                  </span>
                )}
                {classData.schedule && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {classData.schedule}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === "students"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Students ({students.length})
              </div>
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === "attendance"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Attendance
              </div>
            </button>
            <button
              onClick={() => setActiveTab("voting")}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === "voting"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Voting Results
              </div>
            </button>
          </nav>
        </div>

        {activeTab === "students" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Student Roster
              </h2>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No students enrolled yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map((student, index) => (
                  <div
                    key={student.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {student.full_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="text-right">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {student.total_xp || 0} XP
                          </p>
                          <p className="text-xs">Total Progress</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mark Attendance
                </h2>
                <div className="flex items-center gap-4">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleSaveAttendance}
                    disabled={savingAttendance}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {savingAttendance ? "Saving..." : "Save Attendance"}
                  </button>
                </div>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No students to track
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map((student, index) => (
                  <div
                    key={student.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {student.full_name}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleAttendance(student.id)}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          attendanceRecords[student.id]
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {attendanceRecords[student.id] ? "Present" : "Absent"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "voting" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Conversation Voting Results
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Voting results for lessons will appear here. This feature tracks
              which conversation topics your students vote for in their lessons.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ClassDetail() {
  return (
    <ProtectedRoute allowedRoles={["teacher", "platform_admin"]}>
      <ClassDetailContent />
    </ProtectedRoute>
  );
}
