// FIXED src/components/AuthProvider.js
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/auth";
import { ensurePlayerProgress } from "@/lib/supabase/queries";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log("🔄 Initializing auth...");

        const currentSession = await auth.getCurrentSession();

        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user || null);
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Auth initialization error:", error);
        if (mounted) {
          setError(error.message);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: authListener } = auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔄 Auth state change:", { event, hasSession: !!session });

        if (!mounted) return;

        setSession(session);
        setUser(session?.user || null);
        setError(null);

        // Handle successful sign in
        if (session?.user && ["SIGNED_IN", "TOKEN_REFRESHED"].includes(event)) {
          try {
            // Ensure user has progress record
            await ensurePlayerProgress(session.user.id);
          } catch (error) {
            console.warn("⚠️ Could not ensure player progress:", error);
          }
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, metadata = {}) => {
    setLoading(true);
    setError(null);

    const result = await auth.signUp(email, password, metadata);

    if (result.error) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  };

  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);

    const result = await auth.signIn(email, password);

    if (result.error) {
      setError(result.error);
    }

    setLoading(false);
    return result;
  };

  const signInWithGoogle = async () => {
    setError(null);
    return await auth.signInWithGoogle();
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);

    const result = await auth.signOut();

    if (!result.error) {
      setUser(null);
      setSession(null);
    } else {
      setError(result.error);
    }

    setLoading(false);
    return result;
  };

  const resendConfirmation = async (email) => {
    return await auth.resendConfirmation(email);
  };

  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resendConfirmation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// // Updated src/components/AuthProvider.js to include role management
// "use client";

// import React, { createContext, useContext, useEffect, useState } from "react";
// import { auth } from "@/lib/auth";
// import { roleQueries } from "@/lib/supabase/role-queries";

// const AuthContext = createContext({});

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // Get initial user
//     auth.getCurrentUser().then((user) => {
//       setUser(user);
//       setLoading(false);
//     });

//     // Listen for auth changes
//     const { data: authListener } = auth.onAuthStateChange(
//       async (event, session) => {
//         setUser(session?.user || null);
//         setLoading(false);
//       }
//     );

//     return () => {
//       authListener?.subscription?.unsubscribe();
//     };
//   }, []);

//   const signUp = async (email, password, metadata = {}) => {
//     const result = await auth.signUp(email, password, metadata);

//     // If signup successful and user confirmed, create player profile
//     if (result.user && !result.error) {
//       // Note: Profile creation happens automatically via database trigger
//       // Additional player data can be added here if needed
//       if (metadata.position || metadata.nationality) {
//         await roleQueries.createPlayerProfile(result.user.id, {
//           full_name: metadata.full_name,
//           position: metadata.position,
//           nationality: metadata.nationality,
//         });
//       }
//     }

//     return result;
//   };

//   const signIn = async (email, password) => {
//     return await auth.signIn(email, password);
//   };

//   const signInWithGoogle = async () => {
//     return await auth.signInWithGoogle();
//   };

//   const signOut = async () => {
//     const result = await auth.signOut();
//     if (!result.error) {
//       setUser(null);
//     }
//     return result;
//   };

//   const value = {
//     user,
//     loading,
//     signUp,
//     signIn,
//     signInWithGoogle,
//     signOut,
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error("useAuth must be used within an AuthProvider");
//   }
//   return context;
// }
