import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";

/**
 * Client-side Supabase instance using @supabase/ssr to share auth session cookies.
 * Safe to import and use in Client Components ("use client").
 */
export function createBrowserClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";

  return createSsrBrowserClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export const isLiveSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createBrowserClient();
