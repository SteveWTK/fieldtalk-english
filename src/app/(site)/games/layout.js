// src/app/(site)/games/layout.js
//
// Full Edition gate for every route under /games. Free-edition users
// hit this and see the same PaywallCard the lesson flow uses, with
// CTAs back to /pricing. Admins bypass the gate (so we can demo).
//
// Server-enforced separately on /api/xp/award via the session check;
// this layout just keeps non-paying users out of the UI.
"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerAccess } from "@/lib/access/usePlayerAccess";
import PaywallCard from "@/components/PaywallCard";

function GamesGate({ children }) {
  const access = usePlayerAccess();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();

  if (access.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
      </div>
    );
  }

  // Admins (isAdmin) and Full-Edition holders (hasAccess) get through.
  if (access.hasAccess || access.isAdmin) return children;

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="mb-6 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-2">
            FieldTalk Game Centre
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Games & activities
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-xl mx-auto leading-relaxed">
            The Game Centre is part of the Full Edition — practise vocabulary
            from the course in fast, fun bursts and earn XP while you play.
          </p>
        </header>
        <PaywallCard />
      </main>
    </div>
  );
}

export default function GamesLayout({ children }) {
  return (
    <ProtectedRoute>
      <GamesGate>{children}</GamesGate>
    </ProtectedRoute>
  );
}
