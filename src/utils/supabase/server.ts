import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client that strictly enforces Row-Level Security (RLS)
 * by using the public Anon Key and forwarding the user's authentication cookies.
 * MUST only be imported in Server Components, Server Actions, or Route Handlers.
 */
export async function createClient() {
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

  let cookieHeader = "";
  let authBearer = "";

  try {
    const cookieStore = await cookies();
    cookieHeader = cookieStore.toString();

    // Look for JWT auth tokens in cookies
    for (const cookie of cookieStore.getAll()) {
      if (
        cookie.name.includes("-auth-token") ||
        cookie.name === "sb-access-token" ||
        cookie.name === "supabase-auth-token"
      ) {
        try {
          const parsed = JSON.parse(cookie.value);
          if (Array.isArray(parsed) && parsed[0]) {
            authBearer = parsed[0];
          } else if (parsed?.access_token) {
            authBearer = parsed.access_token;
          }
        } catch {
          if (cookie.value.startsWith("ey")) {
            authBearer = cookie.value;
          }
        }
      }
    }
  } catch {
    // In contexts where cookies() is not available (e.g. static generation)
  }

  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
  }
  if (authBearer) {
    headers["Authorization"] = `Bearer ${authBearer}`;
  }

  return createSupabaseClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers,
    },
  });
}

/**
 * Fallback static server instance using the public Anon Key.
 * Notice: SUPABASE_SERVICE_ROLE_KEY is NEVER used here to ensure RLS is never bypassed.
 */
export function createServerClient() {
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

export const serverSupabase = createServerClient();
