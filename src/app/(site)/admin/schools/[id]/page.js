/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  School,
  Users,
  BookOpen,
  GraduationCap,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Plus,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getSchoolById,
  getClassesBySchool,
  getStudentsBySchool,
  updateSchool,
} from "@/lib/supabase/schools-queries";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

function SchoolDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id;

  const [school, setSchool] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (schoolId) {
      loadSchoolData();
    }
  }, [schoolId]);

  async function loadSchoolData() {
    try {
      setLoading(true);
      const [schoolData, classesData, studentsData] = await Promise.all([
        getSchoolById(schoolId),
        getClassesBySchool(schoolId),
        getStudentsBySchool(schoolId),
      ]);

      setSchool(schoolData);
      setClasses(classesData);
      setStudents(studentsData);
      setEditData(schoolData);
    } catch (error) {
      console.error("Error loading school:", error);
      alert("Failed to load school data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updateSchool(schoolId, editData);
      setSchool(editData);
      setEditing(false);
      alert("School updated successfully!");
    } catch (error) {
      console.error("Error updating school:", error);
      alert("Failed to update school. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const stats = {
    totalClasses: classes.length,
    activeClasses: classes.filter((c) => c.is_active).length,
    totalStudents: students.length,
    totalTeachers: new Set(classes.map((c) => c.teacher_id).filter(Boolean))
      .size,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-400 mx-auto"></div>
          <p className="mt-4 text-primary-300">
            Loading school...
          </p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary-300 mb-4">
            School not found
          </p>
          <button
            onClick={() => router.push("/admin/schools")}
            className="text-accent-400 hover:text-accent-300"
          >
            Back to Schools
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin/schools")}
            className="flex items-center gap-2 text-primary-300 hover:text-primary-50 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schools
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <School className="w-8 h-8 text-accent-400" />
              <div>
                <h1 className="text-3xl font-bold text-primary-50">
                  {school.name}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  {school.is_active ? (
                    <span className="px-2 py-1 text-xs font-medium bg-accent-400/15 text-accent-400 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-signal-alert/10 text-signal-alert rounded">
                      Inactive
                    </span>
                  )}
                  {school.subscription_type && (
                    <span className="px-2 py-1 text-xs font-medium bg-signal-english/10 text-signal-english rounded">
                      {school.subscription_type.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              Icon={Edit}
              loading={saving}
              onClick={() => (editing ? handleSave() : setEditing(true))}
            >
              {editing
                ? saving
                  ? "Saving..."
                  : "Save Changes"
                : "Edit School"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Total Classes
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {stats.totalClasses}
                </p>
              </div>
              <div className="p-3 bg-signal-english/10 rounded-control">
                <BookOpen className="w-6 h-6 text-signal-english" />
              </div>
            </div>
          </div>

          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Total Students
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="p-3 bg-accent-400/15 rounded-control">
                <Users className="w-6 h-6 text-accent-400" />
              </div>
            </div>
          </div>

          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Teachers
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {stats.totalTeachers}
                </p>
              </div>
              <div className="p-3 bg-signal-mental/10 rounded-control">
                <GraduationCap className="w-6 h-6 text-signal-mental" />
              </div>
            </div>
          </div>

          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Active Classes
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {stats.activeClasses}
                </p>
              </div>
              <div className="p-3 bg-signal-performance/10 rounded-control">
                <BookOpen className="w-6 h-6 text-signal-performance" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 border-b border-primary-700">
          <nav className="flex gap-4">
            {["overview", "classes", "students"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "border-accent-400 text-accent-400"
                    : "border-transparent text-primary-300 hover:text-primary-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
              <h2 className="text-xl font-semibold text-primary-50 mb-4">
                School Information
              </h2>
              {editing ? (
                <div className="space-y-4">
                  <Input
                    label="School Name"
                    type="text"
                    value={editData.name}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      type="text"
                      value={editData.city || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, city: e.target.value })
                      }
                    />
                    <Input
                      label="Country"
                      type="text"
                      value={editData.country || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, country: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Contact Email"
                      type="email"
                      value={editData.contact_email || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          contact_email: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Contact Phone"
                      type="tel"
                      value={editData.contact_phone || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          contact_phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editData.is_active}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          is_active: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-accent-400 border-primary-600 rounded"
                    />
                    <label className="ml-2 text-sm text-primary-100">
                      School is active
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {school.city && school.country && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary-500 mt-1" />
                      <div>
                        <p className="text-sm text-primary-300">
                          Location
                        </p>
                        <p className="text-lg font-medium text-primary-50">
                          {school.city}, {school.country}
                        </p>
                      </div>
                    </div>
                  )}
                  {school.contact_email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-primary-500 mt-1" />
                      <div>
                        <p className="text-sm text-primary-300">
                          Contact Email
                        </p>
                        <p className="text-lg font-medium text-primary-50">
                          {school.contact_email}
                        </p>
                      </div>
                    </div>
                  )}
                  {school.contact_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-primary-500 mt-1" />
                      <div>
                        <p className="text-sm text-primary-300">
                          Contact Phone
                        </p>
                        <p className="text-lg font-medium text-primary-50">
                          {school.contact_phone}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary-500 mt-1" />
                    <div>
                      <p className="text-sm text-primary-300">
                        Created
                      </p>
                      <p className="text-lg font-medium text-primary-50">
                        {new Date(school.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "classes" && (
          <div className="bg-primary-panel border border-primary-700 rounded-card">
            <div className="p-6 border-b border-primary-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary-50">
                  All Classes
                </h2>
                <p className="text-sm text-primary-300">
                  Classes are managed by School Admins
                </p>
              </div>
            </div>

            {classes.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                <p className="text-primary-300 mb-2">
                  No classes yet
                </p>
                <p className="text-sm text-primary-400">
                  School admin needs to create classes
                </p>
              </div>
            ) : (
              <div className="divide-y divide-primary-700">
                {classes.map((cls) => (
                  <div key={cls.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-primary-50">
                            {cls.name}
                          </h3>
                          {cls.is_active ? (
                            <span className="px-2 py-1 text-xs font-medium bg-accent-400/15 text-accent-400 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-primary-800 text-primary-400 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-sm text-primary-300">
                          <div className="flex items-center gap-1">
                            <GraduationCap className="w-4 h-4" />
                            <span>
                              {cls.teacher?.full_name || "No teacher"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{cls.students?.length || 0} students</span>
                          </div>
                          {cls.level && (
                            <span className="px-2 py-1 bg-signal-english/10 text-signal-english rounded text-xs">
                              {cls.level}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "students" && (
          <div className="bg-primary-panel border border-primary-700 rounded-card">
            <div className="p-6 border-b border-primary-700">
              <h2 className="text-xl font-semibold text-primary-50">
                All Students
              </h2>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                <p className="text-primary-300">
                  No students enrolled yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-primary-700">
                {students.map((student, index) => (
                  <div key={student.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-signal-english/10 flex items-center justify-center">
                          <span className="text-signal-english font-semibold">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-primary-50">
                            {student.full_name}
                          </p>
                          <p className="text-sm text-primary-300">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-primary-300">
                            Class
                          </p>
                          <p className="font-medium text-primary-50">
                            {student.class?.name || "Not assigned"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-primary-300">
                            XP
                          </p>
                          <p className="font-medium text-primary-50">
                            {student.total_xp || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SchoolDetail() {
  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <SchoolDetailContent />
    </ProtectedRoute>
  );
}
