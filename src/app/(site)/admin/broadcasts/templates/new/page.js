// src/app/(site)/admin/broadcasts/templates/new/page.js
//
// Thin wrapper around TemplateForm in "create" mode. Empty initial
// data lets the form's own defaults land (weekly Fridays at 18:00 BRT,
// standard 8s interval + 08:00-21:00 window + Mon-Sat).
"use client";

import TemplateForm from "../TemplateForm";

export default function NewTemplatePage() {
  return <TemplateForm mode="create" />;
}
