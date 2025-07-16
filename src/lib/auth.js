// FIXED src/lib/auth.js
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export const auth = {
  // Sign up with email and password - FIXED
  async signUp(email, password, metadata = {}) {
    try {
      console.log("🔐 Starting signup process...", {
        email,
        metadata: Object.keys(metadata),
      });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name || "",
            user_type: metadata.user_type || "player",
            position: metadata.position || "",
            nationality: metadata.nationality || "",
            role_title: metadata.role_title || "",
            club_name: metadata.club_name || "",
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        console.error("❌ Signup error:", error);
        throw error;
      }

      console.log("✅ Signup successful:", {
        user: !!data.user,
        session: !!data.session,
        needsConfirmation: !data.session,
      });

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error("❌ Signup failed:", error);
      return { user: null, session: null, error: error.message };
    }
  },

  // Sign in with email and password - IMPROVED
  async signIn(email, password) {
    try {
      console.log("🔐 Starting sign in process...", { email });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Sign in error:", error);
        throw error;
      }

      console.log("✅ Sign in successful:", {
        user: !!data.user,
        session: !!data.session,
      });

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error("❌ Sign in failed:", error);
      return { user: null, session: null, error: error.message };
    }
  },

  // Sign in with Google - FIXED
  async signInWithGoogle() {
    try {
      console.log("🔐 Starting Google OAuth...");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("❌ Google OAuth error:", error);
        throw error;
      }

      console.log("✅ Google OAuth initiated successfully");
      return { data, error: null };
    } catch (error) {
      console.error("❌ Google OAuth failed:", error);
      return { data: null, error: error.message };
    }
  },

  // Resend confirmation email - IMPROVED
  async resendConfirmation(email) {
    try {
      console.log("📧 Resending confirmation email...", { email });

      const { data, error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        console.error("❌ Resend confirmation error:", error);
        throw error;
      }

      console.log("✅ Confirmation email resent successfully");
      return { data, error: null };
    } catch (error) {
      console.error("❌ Failed to resend confirmation:", error);
      return { data: null, error: error.message };
    }
  },

  // Sign out - IMPROVED
  async signOut() {
    try {
      console.log("🔐 Signing out...");

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ Sign out error:", error);
        throw error;
      }

      console.log("✅ Signed out successfully");
      return { error: null };
    } catch (error) {
      console.error("❌ Sign out failed:", error);
      return { error: error.message };
    }
  },

  // Get current user - IMPROVED
  async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("❌ Get current user error:", error);
        throw error;
      }

      console.log("👤 Current user:", !!user);
      return user;
    } catch (error) {
      console.error("❌ Error getting current user:", error);
      return null;
    }
  },

  // Get current session - NEW
  async getCurrentSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("❌ Get current session error:", error);
        throw error;
      }

      console.log("🎫 Current session:", !!session);
      return session;
    } catch (error) {
      console.error("❌ Error getting current session:", error);
      return null;
    }
  },

  // Listen to auth changes - IMPROVED
  onAuthStateChange(callback) {
    console.log("👂 Setting up auth state listener...");

    return supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔄 Auth state changed:", {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
      });
      callback(event, session);
    });
  },

  // Manual user profile creation - NEW (for fixing stuck users)
  async createUserProfile(user, metadata = {}) {
    try {
      console.log("👤 Creating user profile manually...", { userId: user.id });

      // This will trigger our database function
      const response = await fetch("/api/auth/create-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create user profile");
      }

      const result = await response.json();
      console.log("✅ User profile created:", result);
      return { success: true, data: result };
    } catch (error) {
      console.error("❌ Failed to create user profile:", error);
      return { success: false, error: error.message };
    }
  },
};

// Updated src/lib/auth.js - Fix email confirmation
// import { createClient } from "@/lib/supabase/client";

// const supabase = createClient();

// export const auth = {
//   // Sign up with email and password - FIXED
//   async signUp(email, password, metadata = {}) {
//     try {
//       const { data, error } = await supabase.auth.signUp({
//         email,
//         password,
//         options: {
//           data: {
//             full_name: metadata.full_name || "",
//             user_type: metadata.user_type || "player",
//             position: metadata.position || "",
//             nationality: metadata.nationality || "",
//             role_title: metadata.role_title || "",
//             club_name: metadata.club_name || "",
//           },
//           emailRedirectTo: `${window.location.origin}/auth/confirm`,
//         },
//       });

//       if (error) throw error;

//       console.log("Signup successful:", data);
//       return { user: data.user, error: null };
//     } catch (error) {
//       console.error("Signup error:", error);
//       return { user: null, error: error.message };
//     }
//   },

//   // Sign in with email and password
//   async signIn(email, password) {
//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//       });

//       if (error) throw error;
//       return { user: data.user, error: null };
//     } catch (error) {
//       return { user: null, error: error.message };
//     }
//   },

//   // Sign in with Google - FIXED
//   async signInWithGoogle() {
//     try {
//       const { data, error } = await supabase.auth.signInWithOAuth({
//         provider: "google",
//         options: {
//           redirectTo: `${window.location.origin}/auth/callback`,
//           queryParams: {
//             access_type: "offline",
//             prompt: "consent",
//           },
//         },
//       });

//       if (error) throw error;
//       return { data, error: null };
//     } catch (error) {
//       return { data: null, error: error.message };
//     }
//   },

//   // Resend confirmation email
//   async resendConfirmation(email) {
//     try {
//       const { data, error } = await supabase.auth.resend({
//         type: "signup",
//         email: email,
//         options: {
//           emailRedirectTo: `${window.location.origin}/auth/confirm`,
//         },
//       });

//       if (error) throw error;
//       return { data, error: null };
//     } catch (error) {
//       return { data: null, error: error.message };
//     }
//   },

//   // Sign out
//   async signOut() {
//     try {
//       const { error } = await supabase.auth.signOut();
//       if (error) throw error;
//       return { error: null };
//     } catch (error) {
//       return { error: error.message };
//     }
//   },

//   // Get current user
//   async getCurrentUser() {
//     try {
//       const {
//         data: { user },
//         error,
//       } = await supabase.auth.getUser();
//       if (error) throw error;
//       return user;
//     } catch (error) {
//       console.error("Error getting current user:", error);
//       return null;
//     }
//   },

//   // Listen to auth changes
//   onAuthStateChange(callback) {
//     return supabase.auth.onAuthStateChange(callback);
//   },

//   // Verify OTP for email confirmation
//   async verifyOtp(token_hash, type) {
//     try {
//       const { data, error } = await supabase.auth.verifyOtp({
//         token_hash,
//         type,
//       });

//       if (error) throw error;
//       return { data, error: null };
//     } catch (error) {
//       return { data: null, error: error.message };
//     }
//   },
// };
