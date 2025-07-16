/* eslint-disable @typescript-eslint/no-unused-vars */
// FIXED src/app/auth/confirm/page.js
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Globe, CheckCircle, AlertCircle, Loader } from "lucide-react";
import Link from "next/link";

export default function ConfirmPage() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const supabase = createClient();

      try {
        console.log("🔍 Starting email confirmation process...");
        console.log("Current URL:", window.location.href);
        console.log(
          "Search params:",
          Object.fromEntries(searchParams.entries())
        );

        // Get URL hash parameters (Supabase uses URL hash for auth tokens)
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );
        const urlParams = searchParams;

        console.log("Hash params:", Object.fromEntries(hashParams.entries()));

        // Try to get token from either hash or query params
        const access_token =
          hashParams.get("access_token") || urlParams.get("access_token");
        const refresh_token =
          hashParams.get("refresh_token") || urlParams.get("refresh_token");
        const token_hash =
          hashParams.get("token_hash") || urlParams.get("token_hash");
        const type = hashParams.get("type") || urlParams.get("type");

        console.log("Extracted tokens:", {
          access_token: !!access_token,
          refresh_token: !!refresh_token,
          token_hash: !!token_hash,
          type,
        });

        if (access_token && refresh_token) {
          // Handle OAuth tokens
          console.log("📱 Handling OAuth tokens...");

          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            console.error("❌ OAuth session error:", error);
            throw error;
          }

          console.log("✅ OAuth session set successfully:", data);
          setStatus("success");
          setMessage("Successfully signed in with OAuth!");

          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else if (token_hash && type) {
          // Handle email confirmation
          console.log("📧 Handling email confirmation...");

          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type,
          });

          if (error) {
            console.error("❌ Email confirmation error:", error);
            throw error;
          }

          console.log("✅ Email confirmed successfully:", data);
          setStatus("success");
          setMessage("Your email has been confirmed successfully!");

          setTimeout(() => {
            router.push("/dashboard");
          }, 2000);
        } else {
          // Check if user is already signed in
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("❌ Session check error:", sessionError);
            throw sessionError;
          }

          if (session) {
            console.log("✅ User already has valid session");
            setStatus("success");
            setMessage("You're already signed in!");

            setTimeout(() => {
              router.push("/dashboard");
            }, 1000);
          } else {
            console.log("❌ No valid tokens or session found");
            throw new Error(
              "Invalid confirmation link. Please try signing up again."
            );
          }
        }
      } catch (error) {
        console.error("❌ Confirmation process failed:", error);
        setStatus("error");
        setMessage(error.message || "Confirmation failed. Please try again.");
      }
    };

    handleEmailConfirmation();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              FieldTalk English
            </span>
          </div>
        </div>

        {/* Confirmation Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          {status === "loading" && (
            <>
              <Loader className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Confirming Your Account
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Please wait while we verify your account...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Account Confirmed!
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Redirecting you to your dashboard...
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <span>Go to Dashboard</span>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Confirmation Failed
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>

              {/* Debug info for development */}
              {process.env.NODE_ENV === "development" && (
                <details className="mb-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Debug Info
                  </summary>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                    URL: {window.location.href}
                    Hash: {window.location.hash}
                    Search: {window.location.search}
                  </pre>
                </details>
              )}

              <div className="space-y-3">
                <Link
                  href="/auth/signup"
                  className="block w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-2 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Try Signing Up Again
                </Link>
                <Link
                  href="/auth/signin"
                  className="block w-full bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
