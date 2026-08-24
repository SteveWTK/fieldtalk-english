// src/app/(site)/admin/layout.js
//
// Server-side gate for every /admin/* page. Fetches the caller's
// player row and redirects to /dashboard if they aren't a
// platform_admin.
//
// This is additive to the existing pages' own client-side checks — the
// existing pages remain safe on their own, and this layout catches any
// unauthenticated access attempts BEFORE any client JS ships. Zero
// impact on existing admin pages other than the extra guarantee.

import { getAdminOrRedirect } from "@/lib/admin/gate";

export default async function AdminLayout({ children }) {
  await getAdminOrRedirect();
  return children;
}
