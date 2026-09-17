/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { createSchool } from "@/lib/supabase/schools-queries";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";

function NewSchoolContent() {
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
    subscription_type: "per_student",
  });

  function updateField(field, value) {
    setFormData({ ...formData, [field]: value });
  }

  async function handleCreate() {
    if (!formData.name) {
      alert("Please enter a school name");
      return;
    }

    if (!formData.contact_email) {
      alert("Please enter a contact email");
      return;
    }

    try {
      setSaving(true);
      const newSchool = await createSchool(formData);
      alert("School created successfully!");
      router.push(`/admin/schools/${newSchool.id}`);
    } catch (error) {
      console.error("Error creating school:", error);
      alert("Failed to create school. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary-900">
      <div className="sticky top-0 z-10 bg-primary-panel border-b border-primary-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/schools")}
              className="p-2 hover:bg-primary-800 rounded-control text-primary-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-primary-50">
                Add New School
              </h1>
              <p className="text-sm text-primary-300">
                Create a new school profile
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            Icon={Save}
            loading={saving}
            onClick={handleCreate}
          >
            {saving ? "Creating..." : "Create School"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
          <div className="space-y-6">
            <Input
              label="School Name *"
              type="text"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., International School of Lisbon"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="City"
                type="text"
                value={formData.city}
                onChange={(e) => updateField("city", e.target.value)}
                placeholder="e.g., Lisbon"
              />

              <Input
                label="Country"
                type="text"
                value={formData.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="e.g., Portugal"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Contact Email *"
                type="email"
                value={formData.contact_email}
                onChange={(e) => updateField("contact_email", e.target.value)}
                placeholder="admin@school.com"
              />

              <Input
                label="Contact Phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => updateField("contact_phone", e.target.value)}
                placeholder="+351 123 456 789"
              />
            </div>

            <Select
              label="Subscription Type"
              value={formData.subscription_type}
              onChange={(e) => updateField("subscription_type", e.target.value)}
              hint="Per Student: School pays for each student account created"
              options={[
                { value: "per_student", label: "Per Student (Pay as you add students)" },
                { value: "unlimited", label: "Unlimited (Fixed annual fee)" },
                { value: "trial", label: "Trial (Free for limited time)" },
              ]}
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
                className="w-4 h-4 text-accent-400 border-primary-600 rounded focus:ring-accent-400/30"
              />
              <label className="ml-2 text-sm font-medium text-primary-100">
                School is active (can create classes and students)
              </label>
            </div>

            <div className="border-t border-primary-700 pt-6">
              <div className="bg-signal-english/10 border border-signal-english/40 rounded-control p-4">
                <p className="text-sm text-signal-english">
                  <strong>Next Steps:</strong> After creating the school,
                  you&apos;ll need to:
                </p>
                <ul className="list-disc list-inside text-sm text-signal-english/80 mt-2 space-y-1">
                  <li>Create a school admin user account</li>
                  <li>
                    Assign them to this school (set school_id in players table)
                  </li>
                  <li>They can then create classes and teachers</li>
                  <li>Students are added per class (triggers billing)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewSchool() {
  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <NewSchoolContent />
    </ProtectedRoute>
  );
}
