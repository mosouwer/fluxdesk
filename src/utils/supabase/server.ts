import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client that strictly enforces Row-Level Security (RLS)
 * using @supabase/ssr to automatically persist and refresh authentication cookies.
 * MUST only be imported and called on the server (Server Components, Server Actions, Route Handlers).
 */
export async function createClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY ERROR: @/utils/supabase/server must only be imported and called on the server."
    );
  }

  const cookieStore = await cookies();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder-project.supabase.co";

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if middleware is refreshing sessions.
        }
      },
    },
  });
}

/**
 * Fallback static server instance using the public Anon Key without cookies.
 */
export function createStaticClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY ERROR: @/utils/supabase/server must only be imported and called on the server."
    );
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://placeholder-project.supabase.co";

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createSupabaseClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const isLiveSupabaseConfigured = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder-project") &&
    !process.env.SUPABASE_URL?.includes("placeholder-project") &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder")
);

export const serverSupabase = createStaticClient();
