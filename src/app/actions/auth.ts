"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { User } from "@/types/desk";
import { CURRENT_AGENT, AVAILABLE_AGENTS, CUSTOMER_EMILY } from "@/data/mockDeskData";
import { getSharedTeamMembers } from "@/data/teamStore";
import { createClient, isLiveSupabaseConfigured } from "@/utils/supabase/server";

const SESSION_COOKIE_NAME = "fluxdesk_session_user";

/**
 * Resolves the currently logged-in user.
 * 1. Primary: Checks the live Supabase Auth session via cookies.
 * 2. Fallback: Checks SESSION_COOKIE_NAME for presets / offline mocks.
 * Returns null if no user is signed in.
 */
export async function getCurrentSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const sessionVal = rawSession ? rawSession.trim() : null;

  // 1. PRIMARY: Check live Supabase Auth session
  if (isLiveSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (user?.id && !authError) {
        const { adminClient, isAdminConfigured } = await import("@/utils/supabase/admin");
        const client = isAdminConfigured ? adminClient : supabase;

        const { data: dbUser } = await client
          .from("users")
          .select("id, full_name, email, avatar_url, role, is_active, workspace_id")
          .eq("id", user.id)
          .maybeSingle();

        if (dbUser && dbUser.is_active === false) {
          return null;
        }

        const role = (dbUser?.role || user.user_metadata?.role || "agent") as any;
        const wsId = dbUser?.workspace_id || user.user_metadata?.workspace_id;

        let wsName: string | undefined = undefined;
        if (wsId) {
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
            // Workspace lookup fallback
          }
        }

        return {
          id: user.id,
          name: dbUser?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email || "",
          avatar: dbUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          role,
          isActive: dbUser?.is_active ?? true,
          workspaceId: wsId,
          workspace_id: wsId,
          workspaceName: wsName,
          company: wsName,
        };
      }
    } catch (err) {
      console.warn("Supabase auth session resolution exception:", err);
    }
  }

  // 2. FALLBACK: Check session cookie for demo roles or local runtime members
  if (
    !sessionVal ||
    sessionVal === "logged_out" ||
    sessionVal === "null" ||
    sessionVal === "undefined" ||
    sessionVal === ""
  ) {
    return null;
  }

  // Pre-configured role presets (for 1-click test identities)
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

  // Check live Supabase database for user record by session ID if auth cookie was missing
  if (isLiveSupabaseConfigured) {
    try {
      const { adminClient, isAdminConfigured } = await import("@/utils/supabase/admin");
      const client = isAdminConfigured ? adminClient : await createClient();

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
    } catch {
      // Invariant
    }
  }

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
 * signs out of Supabase Auth, and redirects to /login.
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
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Continue
    }
  }

  redirect("/login");
}
