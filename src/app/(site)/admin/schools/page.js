/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit,
  School,
  Users,
  BookOpen,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAllSchools } from "@/lib/supabase/schools-queries";

function SchoolsManagementContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadSchools();
  }, []);

  async function loadSchools() {
    try {
      setLoading(true);
      const schoolsData = await getAllSchools();
      setSchools(schoolsData);
    } catch (error) {
      console.error("Error loading schools:", error);
      alert("Failed to load schools. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading schools...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Schools Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage schools, classes, and student subscriptions
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/schools/new")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium"
          >
            <Plus className="w-5 h-5" />
            Add School
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search schools by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {filteredSchools.length === 0 ? (
            <div className="p-12 text-center">
              <School className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {searchTerm ? "No schools found" : "No schools yet"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by adding your first school"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => router.push("/admin/schools/new")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Add First School
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSchools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => router.push(`/admin/schools/${school.id}`)}
                  className="w-full p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <School className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {school.name}
                      </h3>
                      {school.is_active ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                      {school.city && school.country && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {school.city}, {school.country}
                          </span>
                        </div>
                      )}
                      {school.contact_email && (
                        <span>{school.contact_email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-500 mt-2">
                      <span>
                        Created{" "}
                        {new Date(school.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Schools
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {schools.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <School className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Active Schools
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {schools.filter((s) => s.is_active).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Inactive Schools
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {schools.filter((s) => !s.is_active).length}
                </p>
              </div>
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <BookOpen className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchoolsManagement() {
  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <SchoolsManagementContent />
    </ProtectedRoute>
  );
}
