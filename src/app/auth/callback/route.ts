import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      // Check user role to redirect appropriately
      try {
        const { data: dbUser } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        const role = dbUser?.role || data.user.user_metadata?.role;
        if (role === "admin" || role === "superadmin") {
          return NextResponse.redirect(`${origin}/admin/dashboard`);
        } else if (role === "customer") {
          return NextResponse.redirect(`${origin}/portal`);
        } else {
          return NextResponse.redirect(`${origin}/agent`);
        }
      } catch {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
