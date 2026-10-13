/**
 * Re-exporting from @/utils/supabase/client for backwards compatibility.
 * Prefer importing directly from @/utils/supabase/client for Client Components
 * or @/utils/supabase/server for Server Components / Server Actions.
 */
export { supabase, createBrowserClient, isLiveSupabaseConfigured } from "@/utils/supabase/client";
