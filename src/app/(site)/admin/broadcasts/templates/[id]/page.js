// src/app/(site)/admin/broadcasts/templates/[id]/page.js
//
// Template edit page. Fetches the template on mount, then renders
// TemplateForm in "edit" mode with the existing data pre-populated.
// TemplateForm handles the PATCH on save + navigation back to the
// list.
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import TemplateForm from "../TemplateForm";

export default function EditTemplatePage() {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/broadcast-templates/${id}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(json.error || "Not found");
        else setTemplate(json.template);
      } catch {
        if (!cancelled) setError("Network error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#070707] text-white p-8">
        <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200">
          {error}
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-white/40" />
      </div>
    );
  }

  return <TemplateForm mode="edit" initial={template} templateId={id} />;
}
