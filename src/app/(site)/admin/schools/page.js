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
import Button from "@/components/ui/button";

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
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-400 mx-auto"></div>
          <p className="mt-4 text-primary-300">
            Loading schools...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary-50 mb-2">
              Schools Management
            </h1>
            <p className="text-primary-300">
              Manage schools, classes, and student subscriptions
            </p>
          </div>
          <Button
            variant="primary"
            Icon={Plus}
            onClick={() => router.push("/admin/schools/new")}
          >
            Add School
          </Button>
        </div>

        <div className="bg-primary-panel border border-primary-700 rounded-card mb-6">
          <div className="p-4 border-b border-primary-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search schools by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-primary-600 rounded-control bg-primary-900 text-primary-50 focus:border-accent-400 focus:ring-accent-400/30 focus:outline-none"
              />
            </div>
          </div>

          {filteredSchools.length === 0 ? (
            <div className="p-12 text-center">
              <School className="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <p className="text-primary-300 mb-2">
                {searchTerm ? "No schools found" : "No schools yet"}
              </p>
              <p className="text-sm text-primary-400 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by adding your first school"}
              </p>
              {!searchTerm && (
                <Button
                  variant="secondary"
                  onClick={() => router.push("/admin/schools/new")}
                >
                  Add First School
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-primary-700">
              {filteredSchools.map((school) => (
                <button
                  key={school.id}
                  onClick={() => router.push(`/admin/schools/${school.id}`)}
                  className="w-full p-6 text-left hover:bg-primary-800 transition-colors flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <School className="w-6 h-6 text-accent-400" />
                      <h3 className="text-lg font-semibold text-primary-50">
                        {school.name}
                      </h3>
                      {school.is_active ? (
                        <span className="px-2 py-1 text-xs font-medium bg-accent-400/15 text-accent-400 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-signal-alert/10 text-signal-alert rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-primary-300">
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
                    <div className="flex items-center gap-6 text-sm text-primary-400 mt-2">
                      <span>
                        Created{" "}
                        {new Date(school.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary-500 group-hover:text-primary-300 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Total Schools
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {schools.length}
                </p>
              </div>
              <div className="p-3 bg-signal-english/10 rounded-control">
                <School className="w-6 h-6 text-signal-english" />
              </div>
            </div>
          </div>

          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Active Schools
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {schools.filter((s) => s.is_active).length}
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
                  Inactive Schools
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {schools.filter((s) => !s.is_active).length}
                </p>
              </div>
              <div className="p-3 bg-primary-800 rounded-control">
                <BookOpen className="w-6 h-6 text-primary-400" />
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
