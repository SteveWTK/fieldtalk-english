"use client";

import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
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