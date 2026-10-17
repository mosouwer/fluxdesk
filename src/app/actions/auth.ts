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
    const wsId = "workspaceId" in found ? found.workspaceId : undefined;
    return {
      id: found.id,
      name: "name" in found ? found.name : found.fullName,
      email: found.email,
      avatar: "avatar" in found ? found.avatar : found.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${found.email}`,
      role: found.role,
      isActive: "isActive" in found ? found.isActive : true,
      workspaceId: wsId,
      workspace_id: wsId,
    };
  }

  // Check live Supabase database for user record by session ID or email
  if (isLiveSupabaseConfigured) {
    try {
      const { adminClient, isAdminConfigured } = await import("@/utils/supabase/admin");
      const client = isAdminConfigured ? adminClient : supabase;

      const isUuid = (val: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      let userQuery = client
        .from("users")
        .select("id, full_name, email, avatar_url, role, is_active, workspace_id");

      if (isUuid(sessionVal)) {
        userQuery = userQuery.eq("id", sessionVal);
      } else if (sessionVal.includes("@")) {
        userQuery = userQuery.eq("email", sessionVal.toLowerCase());
      } else {
        userQuery = userQuery.eq("id", sessionVal);
      }

      const { data: dbUser } = await userQuery.maybeSingle();

      if (dbUser) {
        if (dbUser.is_active === false) {
          // User is disabled/suspended
          return null;
        }

        let wsName: string | undefined = undefined;
        if (dbUser.workspace_id && isUuid(dbUser.workspace_id)) {
          try {
            const { data: ws } = await client
              .from("workspaces")
              .select("name")
              .eq("id", dbUser.workspace_id)
              .maybeSingle();
            if (ws?.name) {
              wsName = ws.name;
            }
          } catch {
            // Workspace fetch fallback
          }
        }

        return {
          id: dbUser.id,
          name: dbUser.full_name || dbUser.email?.split("@")[0] || "User",
          email: dbUser.email,
          avatar: dbUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${dbUser.email}`,
          role: dbUser.role as any,
          isActive: dbUser.is_active,
          workspaceId: dbUser.workspace_id,
          workspace_id: dbUser.workspace_id,
          workspaceName: wsName,
          company: wsName,
        };
      }

      // Also check live Supabase auth session if present
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: authDbUser } = await client
          .from("users")
          .select("id, full_name, email, avatar_url, role, is_active, workspace_id")
          .eq("id", user.id)
          .maybeSingle();

        const role = authDbUser?.role || user.user_metadata?.role || "customer";
        if (authDbUser && authDbUser.is_active === false) {
          return null;
        }
        const wsId = authDbUser?.workspace_id || user.user_metadata?.workspace_id;

        let wsName: string | undefined = undefined;
        if (wsId && isUuid(wsId)) {
          try {
            const { data: ws } = await client
              .from("workspaces")
              .select("name")
              .eq("id", wsId)
              .maybeSingle();
            if (ws?.name) {
              wsName = ws.name;
            }
          } catch {
            // Fallback
          }
        }

        return {
          id: user.id,
          name: authDbUser?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          avatar: authDbUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          role: role as any,
          isActive: authDbUser?.is_active ?? true,
          workspaceId: wsId,
          workspace_id: wsId,
          workspaceName: wsName,
          company: wsName,
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
