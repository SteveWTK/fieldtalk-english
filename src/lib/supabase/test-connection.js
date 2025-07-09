/* eslint-disable @typescript-eslint/no-unused-vars */
// src/lib/supabase/test-connection.js
// Use this to test your Supabase connection

import { createClient } from "./client";

export async function testSupabaseConnection() {
  try {
    const supabase = createClient();

    console.log("🔍 Testing Supabase connection...");

    // Test 1: Check if we can connect
    const { data: connectionTest, error: connectionError } = await supabase
      .from("pillars")
      .select("count")
      .limit(1);

    if (connectionError) {
      console.error("❌ Connection failed:", connectionError);
      return { success: false, error: connectionError.message };
    }

    console.log("✅ Connection successful!");

    // Test 2: Check if pillars exist
    const { data: pillars, error: pillarsError } = await supabase
      .from("pillars")
      .select("*")
      .order("sort_order");

    if (pillarsError) {
      console.error("❌ Pillars query failed:", pillarsError);
      return { success: false, error: pillarsError.message };
    }

    console.log("📊 Pillars found:", pillars?.length || 0);
    if (pillars?.length > 0) {
      console.log(
        "Pillars:",
        pillars.map((p) => p.name)
      );
    }

    // Test 3: Check if lessons exist
    const { data: lessons, error: lessonsError } = await supabase
      .from("lessons")
      .select("count");

    if (lessonsError) {
      console.error("❌ Lessons query failed:", lessonsError);
    } else {
      console.log("📚 Lessons found:", lessons?.length || 0);
    }

    return {
      success: true,
      pillars: pillars?.length || 0,
      lessons: lessons?.length || 0,
    };
  } catch (error) {
    console.error("❌ Test failed:", error);
    return { success: false, error: error.message };
  }
}

// Test auth connection
export async function testAuthConnection() {
  try {
    const supabase = createClient();

    console.log("🔐 Testing Auth connection...");

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error && error.message !== "Auth session missing!") {
      console.error("❌ Auth test failed:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Auth system working!");
    console.log("Current user:", user ? user.email : "No user logged in");

    return { success: true, user };
  } catch (error) {
    console.error("❌ Auth test failed:", error);
    return { success: false, error: error.message };
  }
}

// Run all tests
export async function runAllTests() {
  console.log("🧪 Running Supabase tests...\n");

  const dbTest = await testSupabaseConnection();
  const authTest = await testAuthConnection();

  console.log("\n📋 Test Results:");
  console.log("Database:", dbTest.success ? "✅ Working" : "❌ Failed");
  console.log("Auth:", authTest.success ? "✅ Working" : "❌ Failed");

  if (dbTest.success) {
    console.log(
      `Found ${dbTest.pillars} pillars and ${dbTest.lessons} lessons`
    );
  }

  return { database: dbTest, auth: authTest };
}
