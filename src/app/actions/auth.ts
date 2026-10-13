"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { User } from "@/types/desk";
import { CURRENT_AGENT, AVAILABLE_AGENTS, CUSTOMER_EMILY } from "@/data/mockDeskData";
import { getSharedTeamMembers } from "@/data/teamStore";
import { serverSupabase as supabase, isLiveSupabaseConfigured } from "@/utils/supabase/server";

const SESSION_COOKIE_NAME = "fluxdesk_session_user";

/**
 * Resolves the currently logged-in user from the session cookie.
 * Returns null if no user is signed in.
 */
export async function getCurrentSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionVal = rawSession ? rawSession.trim() : null;

  // If no session cookie or explicit logout marker, user is strictly unauthenticated
  if (
    !sessionVal ||
    sessionVal === "logged_out" ||
    sessionVal === "null" ||
    sessionVal === "undefined" ||
    sessionVal === ""
  ) {
    return null;
  }

  // Pre-configured role presets
  if (sessionVal === "superadmin") {
    return {
      id: "u-superadmin-master-001",
      name: "Platform Super Admin (Owner)",
      email: "superadmin@fluxdesk.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "superadmin",
      isActive: true,
    };
  }

  if (sessionVal === "admin") {
    const adminUser = AVAILABLE_AGENTS.find((a) => a.role === "admin") || AVAILABLE_AGENTS[2];
    return adminUser;
  }

  if (sessionVal === "agent") {
    return CURRENT_AGENT; // Sarah Connor (agent)
  }

  if (sessionVal === "customer") {
    return CUSTOMER_EMILY;
  }

  // Check in teamStore or AVAILABLE_AGENTS by ID or email
  const allTeam = [...AVAILABLE_AGENTS, ...getSharedTeamMembers()];
  const found = allTeam.find((u) => u.id === sessionVal || u.email.toLowerCase() === sessionVal.toLowerCase());
  if (found) {
    if ("isActive" in found && found.isActive === false) {
      // User is disabled/suspended by Super Admin
      return null;
    }
    return {
      id: found.id,
      name: "name" in found ? found.name : found.fullName,
      email: found.email,
      avatar: "avatar" in found ? found.avatar : found.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${found.email}`,
      role: found.role,
      isActive: "isActive" in found ? found.isActive : true,
    };
  }

  // Check live Supabase auth if configured
  if (isLiveSupabaseConfigured) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        return {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          role: "agent",
        };
      }
    } catch {
      // Invariant
    }
  }

  // Do NOT fallback to agent if unknown session! Return null so login is required.
  return null;
}

/**
 * Signs in a user by setting the session cookie and redirecting to the target page.
 */
export async function loginUser(targetRoleOrId: "admin" | "agent" | "customer" | string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, targetRoleOrId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  if (targetRoleOrId === "customer") {
    redirect("/portal");
  } else {
    redirect("/");
  }
}

/**
 * Signs out the current user, clears the session cookie across the root path,
 * signs out of Supabase if active, and redirects to /login.
 */
export async function logoutUser() {
  const cookieStore = await cookies();

  // Clear cookie with exact path and expired maxAge
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
      // Continue
    }
  }

  redirect("/login");
}
