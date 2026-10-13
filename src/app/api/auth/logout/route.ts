import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serverSupabase as supabase, isLiveSupabaseConfigured } from "@/utils/supabase/server";

const SESSION_COOKIE_NAME = "fluxdesk_session_user";

export const dynamic = "force-dynamic";

async function performLogout(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
  });

  if (isLiveSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Invariant
    }
  }

  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url);
  // Also explicitly set Set-Cookie deletion on HTTP response header
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function GET(request: Request) {
  return performLogout(request);
}

export async function POST(request: Request) {
  return performLogout(request);
}
