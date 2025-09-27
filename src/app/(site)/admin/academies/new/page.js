/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { createAcademy } from "@/lib/supabase/academies-queries";

function NewAcademyContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    country: "",
    city: "",
    contact_email: "",
    contact_phone: "",
    is_active: true,
    subscription_type: "per_player",
  });

  function updateField(field, value) {
    setFormData({ ...formData, [field]: value });
  }

  async function handleCreate() {
    if (!formData.name) {
      alert("Please enter an academy name");
      return;
    }

    if (!formData.contact_email) {
      alert("Please enter a contact email");
      return;
    }

    try {
      setSaving(true);
      const newAcademy = await createAcademy(formData);
      alert("Academy created successfully!");
      router.push(`/admin/academies/${newAcademy.id}`);
    } catch (error) {
      console.error("Error creating academy:", error);
      alert("Failed to create academy. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/academies")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Add New Academy/Club
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create a new academy or club profile
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Creating..." : "Create Academy"}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Academy/Club Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Watford FC Academy"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="e.g., Watford"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="e.g., England"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => updateField("contact_email", e.target.value)}
                  placeholder="admin@academy.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => updateField("contact_phone", e.target.value)}
                  placeholder="+44 123 456 789"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subscription Type
              </label>
              <select
                value={formData.subscription_type}
                onChange={(e) =>
                  updateField("subscription_type", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="per_player">
                  Per Player (Pay for each player added)
                </option>
                <option value="unlimited">Unlimited (Fixed annual fee)</option>
                <option value="trial">Trial (Free for limited time)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Per Player: Academy pays for each player account created
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Academy is active (can create players)
              </label>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Next Steps:</strong> After creating the academy,
                  you&apos;ll need to:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                  <li>Create an academy admin user account</li>
                  <li>
                    Assign them to this academy (set academy_id in players
                    table)
                  </li>
                  <li>
                    They can then create player accounts (triggers billing)
                  </li>
                  <li>Players will see player-focused lessons</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewAcademy() {
  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <NewAcademyContent />
    </ProtectedRoute>
  );
}
