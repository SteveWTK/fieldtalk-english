// src/components/Footer.js
//
// Standard site footer. Two responsibilities:
//   1. Copyright + standard navigation links (privacy, terms, contact).
//   2. An "Admin" link that only renders for platform_admin users —
//      a tasteful single entry point into the admin section without
//      polluting the public chrome.
//
// The admin gate uses usePlayerProfile so the link doesn't flicker
// for non-admins on auth-resolve; the profile fetch is the same one
// the dashboard already uses, so this is effectively free.
"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";

export default function Footer() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile(user?.id);
  const isAdmin = profile?.user_type === "platform_admin";

  return (
    <footer className="bg-gray-900 text-white py-4 border-t border-gray-700">
      <div className="px-6 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-3">
        <p className="text-gray-400 text-sm">
          © 2026 FieldTalk English. All rights reserved.
        </p>
        <div className="flex items-center gap-4 sm:gap-6 text-sm">
          <a href="/privacy" className="text-gray-400 hover:text-white">
            Privacy
          </a>
          <a href="/terms" className="text-gray-400 hover:text-white">
            Terms
          </a>
          <a href="/contact" className="text-gray-400 hover:text-white">
            Contact
          </a>
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 hover:border-emerald-400/50 text-emerald-200 hover:text-emerald-100 text-xs font-semibold transition-colors"
            >
              <Shield className="w-3 h-3" />
              Admin
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
}
