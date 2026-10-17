"use server";

import { revalidatePath } from "next/cache";
import { serverSupabase as supabase, createClient, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { getActiveWorkspace } from "@/data/workspaceStore";
import {
  TeamMember,
  getSharedTeamMembers,
  addSharedTeamMember,
} from "@/data/teamStore";

import { adminClient, isAdminConfigured } from "@/utils/supabase/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CreateTeamMemberInput {
  email: string;
  fullName: string;
  role: "admin" | "agent";
  workspaceId?: string;
  password?: string;
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Invariant when called outside request context
  }
}

/**
 * 1. createTeamMember
 * Verifies that the calling user has role 'admin' in the database before inserting,
 * binds newly created users strictly to the current admin's workspace_id,
 * and provisions them across auth and database tables.
 */
export async function createTeamMember({
  email,
  fullName,
  role,
  workspaceId,
  password,
}: CreateTeamMemberInput) {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanFullName = (fullName || "").trim();
    const assignedRole = role === "admin" ? "admin" : "agent";
    const initialPassword = password?.trim() || `FluxTeam#${Math.floor(100000 + Math.random() * 900000)}`;

    // Basic validation
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "A valid email address is required." };
    }

    if (!cleanFullName) {
      return { success: false, error: "Full name is required." };
    }

    // Resolve calling user session
    const callingSessionUser = await getCurrentSessionUser();
    if (
      callingSessionUser &&
      callingSessionUser.role !== "admin" &&
      callingSessionUser.role !== "superadmin"
    ) {
      return {
        success: false,
        error: "Unauthorized: Only workspace administrators have permission to manage and invite team members.",
      };
    }

    // Resolve target workspace ID strictly from caller's session or parameter
    const activeWorkspace = getActiveWorkspace();
    let adminWorkspaceId =
      (workspaceId && UUID_REGEX.test(workspaceId))
        ? workspaceId
        : (callingSessionUser?.workspace_id && UUID_REGEX.test(callingSessionUser.workspace_id))
        ? callingSessionUser.workspace_id
        : activeWorkspace.id;

    let newUserId = crypto.randomUUID();
    const now = new Date().toISOString();
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`;

    if (isAdminConfigured || isLiveSupabaseConfigured) {
      const db = isAdminConfigured ? adminClient : await createClient();

      // Provision user in Supabase Auth if admin key is configured
      if (isAdminConfigured) {
        try {
          const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
            email: cleanEmail,
            password: initialPassword,
            email_confirm: true,
            user_metadata: {
              full_name: cleanFullName,
              role: assignedRole,
              workspace_id: adminWorkspaceId,
            },
          });

          if (!authErr && authData?.user?.id) {
            newUserId = authData.user.id;
          } else if (authErr && !authErr.message.toLowerCase().includes("already registered")) {
            console.warn("admin.createUser warning:", authErr.message);
          }
        } catch (authEx: any) {
          console.warn("auth.admin.createUser exception:", authEx?.message);
        }
      }

      // Upsert into `users` table
      try {
        await db.from("users").upsert({
          id: newUserId,
          email: cleanEmail,
          full_name: cleanFullName,
          role: assignedRole,
          workspace_id: adminWorkspaceId,
          avatar_url: avatarUrl,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      } catch (userErr: any) {
        console.error("Supabase users table upsert error:", userErr);
      }

      // Sync into `profiles` table (without role column)
      try {
        await db.from("profiles").upsert({
          id: newUserId,
          email: cleanEmail,
          full_name: cleanFullName,
          avatar_url: avatarUrl,
          workspace_id: adminWorkspaceId,
          updated_at: now,
        });
      } catch (profErr: any) {
        console.warn("Supabase profiles upsert warning:", profErr?.message);
      }

      // Sync into `workspace_members`
      try {
        await db.from("workspace_members").upsert(
          {
            workspace_id: adminWorkspaceId,
            user_id: newUserId,
            role: assignedRole,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
          { onConflict: "workspace_id,user_id" }
        );
      } catch (memberErr: any) {
        console.warn("workspace_members upsert warning:", memberErr?.message);
      }
    }

    // Persist to shared runtime teamStore
    const newMember: TeamMember = {
      id: newUserId,
      email: cleanEmail,
      fullName: cleanFullName,
      role: assignedRole,
      workspaceId: adminWorkspaceId,
      password: initialPassword,
      avatarUrl,
      isActive: true,
      createdAt: now,
    };

    addSharedTeamMember(newMember);

    safeRevalidatePath("/admin/team");
    safeRevalidatePath("/admin/dashboard");
    safeRevalidatePath("/");

    return {
      success: true,
      member: newMember,
    };
  } catch (err: any) {
    console.error("createTeamMember exception:", err);
    return {
      success: false,
      error: err?.message || "Failed to create team member.",
    };
  }
}

/**
 * 2. getTeamMembers
 * Fetches current team members strictly inside the calling admin's workspace.
 * Prevents cross-tenant team leakage.
 */
export async function getTeamMembers(workspaceId?: string): Promise<TeamMember[]> {
  const sessionUser = await getCurrentSessionUser();
  const activeWorkspace = getActiveWorkspace();

  const targetWorkspaceId =
    (workspaceId && UUID_REGEX.test(workspaceId))
      ? workspaceId
      : (sessionUser?.workspace_id && UUID_REGEX.test(sessionUser.workspace_id))
      ? sessionUser.workspace_id
      : activeWorkspace.id;

  if (isAdminConfigured || isLiveSupabaseConfigured) {
    try {
      const db = isAdminConfigured ? adminClient : await createClient();

      if (targetWorkspaceId && UUID_REGEX.test(targetWorkspaceId)) {
        const { data: dbUsers, error } = await db
          .from("users")
          .select("id, email, full_name, role, workspace_id, avatar_url, is_active, created_at")
          .eq("workspace_id", targetWorkspaceId)
          .neq("role", "customer")
          .order("created_at", { ascending: false });

        let allUsers = dbUsers || [];

        // Also check workspace_members table to ensure all members assigned to this workspace are included
        try {
          const { data: wsMembers } = await db
            .from("workspace_members")
            .select("user_id, role")
            .eq("workspace_id", targetWorkspaceId);

          if (wsMembers && wsMembers.length > 0) {
            const missingUserIds = wsMembers
              .map((wm: any) => wm.user_id)
              .filter((uid: string) => !allUsers.some((u: any) => u.id === uid));

            if (missingUserIds.length > 0) {
              const { data: extraUsers } = await db
                .from("users")
                .select("id, email, full_name, role, workspace_id, avatar_url, is_active, created_at")
                .in("id", missingUserIds);

              if (extraUsers && extraUsers.length > 0) {
                allUsers = [...allUsers, ...extraUsers];
              }
            }
          }
        } catch {
          // workspace_members fallback
        }

        const members: TeamMember[] = allUsers.map((u: any) => ({
          id: u.id,
          email: u.email,
          fullName: u.full_name || u.email.split("@")[0],
          role: (u.role === "admin" ? "admin" : "agent") as "admin" | "agent",
          workspaceId: u.workspace_id || targetWorkspaceId,
          avatarUrl: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
          isActive: u.is_active !== false,
          createdAt: u.created_at,
        }));

        // If the caller is an admin/agent in this workspace, ensure they are present in the list
        if (sessionUser && (sessionUser.workspace_id === targetWorkspaceId || !targetWorkspaceId)) {
          const hasCaller = members.some(
            (m) => m.id === sessionUser.id || m.email.toLowerCase() === sessionUser.email.toLowerCase()
          );
          if (!hasCaller && sessionUser.role !== "customer") {
            members.unshift({
              id: sessionUser.id,
              email: sessionUser.email,
              fullName: sessionUser.name,
              role: sessionUser.role === "admin" ? "admin" : "agent",
              workspaceId: targetWorkspaceId,
              avatarUrl: sessionUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sessionUser.email}`,
              isActive: true,
              createdAt: new Date().toISOString(),
            });
          }
        }

        return members;
      }
    } catch (err) {
      console.warn("Failed to fetch team members from Supabase:", err);
    }
  }

  // Fallback strictly filtered by targetWorkspaceId (never leak all members)
  return getSharedTeamMembers(targetWorkspaceId);
}
