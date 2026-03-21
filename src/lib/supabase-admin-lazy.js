import { createClient } from "@supabase/supabase-js";

let adminClient = null;

/**
 * Lazy-loaded Supabase admin client with service role key.
 * Used for server-side operations that require elevated privileges,
 * such as creating/deleting users, bypassing RLS, etc.
 *
 * This is a singleton - the client is created once and reused.
 */
export default async function getSupabaseAdmin() {
  if (!adminClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
      );
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
