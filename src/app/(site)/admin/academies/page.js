/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Trophy,
  Users,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAllAcademies } from "@/lib/supabase/academies-queries";
import Button from "@/components/ui/button";

function AcademiesManagementContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [academies, setAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadAcademies();
  }, []);

  async function loadAcademies() {
    try {
      setLoading(true);
      const academiesData = await getAllAcademies();
      setAcademies(academiesData);
    } catch (error) {
      console.error("Error loading academies:", error);
      alert("Failed to load academies. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const filteredAcademies = academies.filter(
    (academy) =>
      academy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      academy.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      academy.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-400 mx-auto"></div>
          <p className="mt-4 text-primary-300">
            Loading academies...
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
              Academies & Clubs Management
            </h1>
            <p className="text-primary-300">
              Manage football academies, clubs, and players
            </p>
          </div>
          <Button
            variant="primary"
            Icon={Plus}
            onClick={() => router.push("/admin/academies/new")}
          >
            Add Academy
          </Button>
        </div>

        <div className="bg-primary-panel border border-primary-700 rounded-card mb-6">
          <div className="p-4 border-b border-primary-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search academies by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-primary-600 rounded-control bg-primary-900 text-primary-50 focus:border-accent-400 focus:ring-accent-400/30 focus:outline-none"
              />
            </div>
          </div>

          {filteredAcademies.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="w-12 h-12 text-primary-500 mx-auto mb-4" />
              <p className="text-primary-300 mb-2">
                {searchTerm ? "No academies found" : "No academies yet"}
              </p>
              <p className="text-sm text-primary-400 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by adding your first academy or club"}
              </p>
              {!searchTerm && (
                <Button
                  variant="secondary"
                  onClick={() => router.push("/admin/academies/new")}
                >
                  Add First Academy
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-primary-700">
              {filteredAcademies.map((academy) => (
                <button
                  key={academy.id}
                  onClick={() => router.push(`/admin/academies/${academy.id}`)}
                  className="w-full p-6 text-left hover:bg-primary-800 transition-colors flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="w-6 h-6 text-accent-400" />
                      <h3 className="text-lg font-semibold text-primary-50">
                        {academy.name}
                      </h3>
                      {academy.is_active ? (
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
                      {academy.city && academy.country && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {academy.city}, {academy.country}
                          </span>
                        </div>
                      )}
                      {academy.contact_email && (
                        <span>{academy.contact_email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-primary-400 mt-2">
                      <span>
                        Created{" "}
                        {new Date(academy.created_at).toLocaleDateString()}
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
                  Total Academies
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {academies.length}
                </p>
              </div>
              <div className="p-3 bg-accent-400/15 rounded-control">
                <Trophy className="w-6 h-6 text-accent-400" />
              </div>
            </div>
          </div>

          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Active Academies
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {academies.filter((a) => a.is_active).length}
                </p>
              </div>
              <div className="p-3 bg-signal-english/10 rounded-control">
                <Users className="w-6 h-6 text-signal-english" />
              </div>
            </div>
          </div>

          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Inactive Academies
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {academies.filter((a) => !a.is_active).length}
                </p>
              </div>
              <div className="p-3 bg-primary-800 rounded-control">
                <Trophy className="w-6 h-6 text-primary-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcademiesManagement() {
  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <AcademiesManagementContent />
    </ProtectedRoute>
  );
}
