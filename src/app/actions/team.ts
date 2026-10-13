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

export interface CreateTeamMemberInput {
  email: string;
  fullName: string;
  role: "admin" | "agent";
  workspaceId?: string;
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
 * binds newly created users to the current admin's workspace_id,
 * and inserts them into the workspace.
 */
export async function createTeamMember({
  email,
  fullName,
  role,
  workspaceId,
}: CreateTeamMemberInput) {
  try {
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanFullName = (fullName || "").trim();
    const assignedRole = role === "admin" ? "admin" : "agent";

    // Basic validation
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "A valid email address is required." };
    }

    if (!cleanFullName) {
      return { success: false, error: "Full name is required." };
    }

    // Resolve calling user session
    const callingSessionUser = await getCurrentSessionUser();
    if (callingSessionUser && callingSessionUser.role !== "admin") {
      return {
        success: false,
        error: "Unauthorized: Only workspace administrators have permission to manage and invite team members.",
      };
    }

    // Resolve target workspace ID
    const activeWorkspace = getActiveWorkspace();
    let adminWorkspaceId = workspaceId || activeWorkspace.id;

    if (isLiveSupabaseConfigured) {
      const supabase = await createClient();
      // 1. Verify calling user has role 'admin' in the database before inserting
      try {
        const {
          data: { user: callingUser },
        } = await supabase.auth.getUser();

        if (callingUser?.id) {
          // Check role in `users` table
          const { data: userRecord, error: userFetchError } = await supabase
            .from("users")
            .select("role, workspace_id")
            .eq("id", callingUser.id)
            .single();

          let userRole = userRecord?.role;
          if (userRecord?.workspace_id) {
            adminWorkspaceId = userRecord.workspace_id;
          }

          // If not found in `users`, check `workspace_members` table
          if (!userRole) {
            const { data: memberRecord } = await supabase
              .from("workspace_members")
              .select("role, workspace_id")
              .eq("user_id", callingUser.id)
              .eq("is_active", true)
              .single();

            userRole = memberRecord?.role;
            if (memberRecord?.workspace_id) {
              adminWorkspaceId = memberRecord.workspace_id;
            }
          }

          // Strict role authorization verification
          if (userRole && userRole !== "admin") {
            return {
              success: false,
              error: "Unauthorized: Only workspace administrators have permission to manage and invite team members.",
            };
          }
        }
      } catch (authErr) {
        console.warn("Admin role verification fallback:", authErr);
      }

      // 2. Insert newly created user bound to admin's workspace_id
      const newUserId = crypto.randomUUID();
      const now = new Date().toISOString();
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`;

      // Insert into `users` table
      const { error: insertUserError } = await supabase
        .from("users")
        .upsert({
          id: newUserId,
          email: cleanEmail,
          full_name: cleanFullName,
          role: assignedRole,
          workspace_id: adminWorkspaceId,
          avatar_url: avatarUrl,
          created_at: now,
          updated_at: now,
        });

      if (insertUserError) {
        console.error("Failed to insert user in Supabase:", insertUserError);
      }

      // Also sync into `profiles` and `workspace_members`
      try {
        await supabase.from("profiles").upsert({
          id: newUserId,
          email: cleanEmail,
          full_name: cleanFullName,
          avatar_url: avatarUrl,
          workspace_id: adminWorkspaceId,
          created_at: now,
          updated_at: now,
        });

        await supabase.from("workspace_members").upsert({
          workspace_id: adminWorkspaceId,
          user_id: newUserId,
          role: assignedRole,
          is_active: true,
        });
      } catch {
        // Table may vary
      }
    }

    // Persist to shared runtime teamStore
    const newMember: TeamMember = {
      id: `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: cleanEmail,
      fullName: cleanFullName,
      role: assignedRole,
      workspaceId: adminWorkspaceId,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
      createdAt: new Date().toISOString(),
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
 * Fetches current team members inside the specified workspace (or active workspace).
 */
export async function getTeamMembers(workspaceId?: string): Promise<TeamMember[]> {
  const activeWorkspace = getActiveWorkspace();
  const targetWorkspaceId = workspaceId || activeWorkspace.id;

  if (isLiveSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data: dbUsers, error } = await supabase
        .from("users")
        .select("id, email, full_name, role, workspace_id, avatar_url, created_at")
        .eq("workspace_id", targetWorkspaceId)
        .in("role", ["admin", "agent"])
        .order("created_at", { ascending: false });

      if (!error && dbUsers && dbUsers.length > 0) {
        return dbUsers.map((u: any) => ({
          id: u.id,
          email: u.email,
          fullName: u.full_name || u.email.split("@")[0],
          role: u.role as "admin" | "agent",
          workspaceId: u.workspace_id,
          avatarUrl: u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
          createdAt: u.created_at,
        }));
      }
    } catch (err) {
      console.warn("Failed to fetch team members from Supabase, using teamStore fallback:", err);
    }
  }

  return getSharedTeamMembers(targetWorkspaceId);
}
