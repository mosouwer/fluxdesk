import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client using SUPABASE_SERVICE_ROLE_KEY.
 * MUST only be imported and used on the server (Server Actions, Route Handlers).
 * This client allows creating and provisioning auth users via admin API
 * (e.g. adminClient.auth.admin.createUser) without disrupting active client sessions.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY ERROR: @/utils/supabase/admin must only be imported and called on the server."
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder-project.supabase.co";

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const adminClient = createAdminClient();

export const isAdminConfigured = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project") &&
    !process.env.SUPABASE_URL?.includes("placeholder-project") &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
);
