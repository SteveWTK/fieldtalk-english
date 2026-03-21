import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

/**
 * NextAuth configuration for FieldTalk.
 *
 * This uses a Credentials provider that validates against Supabase Auth.
 * Primary use case is the guest access system where temporary users
 * are created and signed in automatically.
 *
 * Regular users typically use the Supabase Auth directly via AuthProvider,
 * but this NextAuth setup enables the QR guest flow to work seamlessly.
 */

// Create a Supabase admin client for auth validation
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Create a regular Supabase client for sign-in
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          );

          // Attempt to sign in with Supabase Auth
          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email: credentials.email,
              password: credentials.password,
            });

          if (authError || !authData.user) {
            console.error("Supabase auth error:", authError?.message);
            return null;
          }

          // Fetch user details from the users table
          const adminSupabase = getSupabaseAdmin();
          const { data: userData, error: userError } = await adminSupabase
            .from("users")
            .select("id, email, name, role, is_premium, premium_until")
            .eq("id", authData.user.id)
            .single();

          if (userError) {
            console.error("Error fetching user data:", userError);
            // Still allow login even if users table entry is missing
          }

          // Check if this is a guest user
          const isGuest = userData?.role === "guest";

          return {
            id: authData.user.id,
            email: authData.user.email,
            name: userData?.name || "Player",
            role: userData?.role || "User",
            is_guest: isGuest,
            is_premium: userData?.is_premium || false,
            premium_until: userData?.premium_until || null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in - copy user data to token
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.is_guest = user.is_guest;
        token.is_premium = user.is_premium;
        token.guest_expires_at = user.premium_until;
      }
      return token;
    },
    async session({ session, token }) {
      // Copy token data to session for client access
      if (token) {
        session.user.userId = token.userId;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.is_guest = token.is_guest;
        session.user.is_premium = token.is_premium;
        session.user.guest_expires_at = token.guest_expires_at;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

// Export authOptions for use in API routes
export { authOptions };
