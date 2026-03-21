"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Minimal layout for the guest activation flow.
 * No site header/footer — just a branded background with SessionProvider
 * for the signIn() call in the guest page.
 */
export default function GuestLayout({ children }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-accent-900">
        {children}
      </div>
    </SessionProvider>
  );
}
