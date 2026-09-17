"use client";

import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState(null);
  const [checkingRole, setCheckingRole] = useState(!!allowedRoles);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/signin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && allowedRoles) {
      checkUserRole();
    }
  }, [user, allowedRoles]);

  async function checkUserRole() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("players")
        .select("user_type")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setUserRole(data?.user_type);

      if (data?.user_type && !allowedRoles.includes(data.user_type)) {
        router.push("/");
      }
    } catch (error) {
      console.error("Error checking user role:", error);
      router.push("/");
    } finally {
      setCheckingRole(false);
    }
  }

  if (loading || checkingRole) {
    // App splash — the first thing every authed user sees on route
    // change or cold load. Uses the DS "Crest draw" sting reserved
    // for this moment per MIGRATION.md Stage 5: shield outline draws,
    // then bars stamp in with a staggered lime highlight. Falls back
    // to a 200ms fade under prefers-reduced-motion (declared in
    // globals.css).
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <GlobalPlayerLogo
          variant="crest"
          tone="tonalDark"
          size={96}
          sting="draw"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return null;
  }

  return children;
}