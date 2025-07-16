/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/RoleBasedRoute.js
"use client";

import React from "react";
import { useUserRole } from "@/lib/hooks/useUserRole";
import { useAuth } from "@/components/AuthProvider";
import { redirect } from "next/navigation";

export default function RoleBasedRoute({
  children,
  allowedRoles = [],
  requiredPermission = null,
  fallbackComponent = null,
}) {
  const { user, loading: authLoading } = useAuth();
  const {
    userProfile,
    loading: roleLoading,
    hasPermission,
    isRole,
  } = useUserRole();

  // Show loading while checking auth and role
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!user) {
    redirect("/auth/signin");
  }

  // Check role-based access
  const hasRoleAccess =
    allowedRoles.length === 0 || allowedRoles.some((role) => isRole(role));
  const hasPermissionAccess =
    !requiredPermission || hasPermission(requiredPermission);

  if (!hasRoleAccess || !hasPermissionAccess) {
    if (fallbackComponent) {
      return fallbackComponent;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You don&apos;t have permission to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}
