// src/components/AuthDebug.js
// Temporary component to debug auth issues

"use client";

import { useAuth } from "./AuthProvider";
import {
  testSupabaseConnection,
  testAuthConnection,
} from "@/lib/supabase/test-connection";
import { useState } from "react";

export default function AuthDebug() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [testResults, setTestResults] = useState(null);

  const runTests = async () => {
    console.log("Running tests...");
    const dbTest = await testSupabaseConnection();
    const authTest = await testAuthConnection();
    setTestResults({ database: dbTest, auth: authTest });
  };

  const testDemoLogin = async () => {
    console.log("Testing demo login...");
    try {
      const result = await signIn("demo@fieldtalkenglish.com", "demo123");
      console.log("Demo login result:", result);
    } catch (error) {
      console.error("Demo login error:", error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-lg max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2">🔧 Auth Debug</h3>

      <div className="space-y-2 text-xs">
        <div>
          <strong>Loading:</strong> {loading ? "Yes" : "No"}
        </div>
        <div>
          <strong>User:</strong> {user ? user.email : "None"}
        </div>
        <div>
          <strong>Auth functions:</strong>
          <ul className="ml-2">
            <li>signIn: {typeof signIn}</li>
            <li>signUp: {typeof signUp}</li>
            <li>signOut: {typeof signOut}</li>
          </ul>
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <button
          onClick={runTests}
          className="w-full bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
        >
          Test Supabase
        </button>
        <button
          onClick={testDemoLogin}
          className="w-full bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
        >
          Test Demo Login
        </button>
      </div>

      {testResults && (
        <div className="mt-2 text-xs">
          <div>DB: {testResults.database.success ? "✅" : "❌"}</div>
          <div>Auth: {testResults.auth.success ? "✅" : "❌"}</div>
        </div>
      )}
    </div>
  );
}
