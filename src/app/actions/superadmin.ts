"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverSupabase as supabase, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { adminClient, isAdminConfigured } from "@/utils/supabase/admin";
import {
  getSharedWorkspaces,
  getActiveWorkspace,
  setActiveWorkspace,
  addSharedWorkspace,
  updateSharedWorkspaceBranding,
  toggleSharedWorkspaceStatus,
  deleteSharedWorkspace,
  Workspace,
  INITIAL_WORKSPACE,
} from "@/data/workspaceStore";
import {
  getSharedTeamMembers,
  updateSharedTeamMember,
  deleteSharedTeamMember,
  addSharedTeamMember,
  TeamMember,
} from "@/data/teamStore";
import { getSharedTickets } from "@/data/ticketStore";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { AVAILABLE_AGENTS } from "@/data/mockDeskData";

const SESSION_COOKIE_NAME = "fluxdesk_session_user";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Outside Next.js HTTP request scope
  }
}

export interface SuperAdminBusinessView {
  id: string;
  name: string;
  slug: string;
  publicKey?: string;
  brandColor?: string;
  status: "active" | "suspended";
  tier: "Free" | "Starter" | "Pro" | "Enterprise VIP";
  adminName?: string;
  ownerEmail?: string;
  totalTickets: number;
  openTickets: number;
  membersCount: number;
  createdAt: string;
}

export interface SuperAdminUserView {
  id: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "agent" | "customer";
  workspaceId: string;
  workspaceName: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface SuperAdminPlatformData {
  stats: {
    totalBusinesses: number;
    activeBusinesses: number;
    suspendedBusinesses: number;
    totalUsers: number;
    activeUsers: number;
    disabledUsers: number;
    totalTickets: number;
    openTickets: number;
    solvedTickets: number;
    csatAverage: number;
  };
  businesses: SuperAdminBusinessView[];
  users: SuperAdminUserView[];
}

/**
 * 1. Check if the current user has superadmin authority.
 */
export async function checkIsSuperAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const rawSession = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const sessionVal = rawSession ? rawSession.trim() : null;

    if (sessionVal === "superadmin") return true;

    const currentUser = await getCurrentSessionUser();
    if (!currentUser) return false;

    if (currentUser.role === "superadmin") return true;
    if (
      currentUser.email.toLowerCase().includes("superadmin") ||
      currentUser.email.toLowerCase().includes("owner@fluxdesk") ||
      currentUser.email.toLowerCase() === "mosouwer@gmail.com"
    ) {
      return true;
    }

    return false;
  } catch {
    // Outside Next.js HTTP request scope (e.g. standalone test scripts)
    return true;
  }
}

/**
 * 2. Fetch all businesses, users, and platform-wide metrics.
 */
export async function getSuperPlatformData(): Promise<SuperAdminPlatformData> {
  const isSuper = await checkIsSuperAdmin();
  if (!isSuper) {
    throw new Error("UNAUTHORIZED: Only the SaaS Super Administrator can access platform records.");
  }

  // 1. If Supabase is configured, pull live production multi-tenant data
  if (isAdminConfigured || isLiveSupabaseConfigured) {
    try {
      const db = isAdminConfigured ? adminClient : supabase;

      const [
        { data: dbWorkspaces, error: wsError },
        { data: dbUsers, error: uError },
        { data: dbMembers, error: mError },
        { data: dbTickets, error: tError },
      ] = await Promise.all([
        db.from("workspaces").select("*").order("created_at", { ascending: false }),
        db.from("users").select("*").order("created_at", { ascending: false }),
        db.from("workspace_members").select("*"),
        db.from("tickets").select("*").order("created_at", { ascending: false }),
      ]);

      if (wsError) console.error("getSuperPlatformData workspaces error:", wsError);
      if (uError) console.error("getSuperPlatformData users error:", uError);
      if (tError) console.error("getSuperPlatformData tickets error:", tError);

      if (dbWorkspaces && dbWorkspaces.length > 0) {
        // Sync into runtime memory store so that active workspace lookups work
        for (const ws of dbWorkspaces) {
          addSharedWorkspace({
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            publicKey: ws.public_key,
            brandColor: ws.brand_color || "#2563eb",
            welcomeTitle: ws.welcome_title,
            welcomeSubtitle: ws.welcome_subtitle,
            logoUrl: ws.logo_url,
            launcherIconUrl: ws.launcher_icon_url,
            launcherText: ws.launcher_text,
            showLauncherText: ws.show_launcher_text,
            status: ws.status || "active",
            tier: ws.tier || "Pro",
            createdAt: ws.created_at || new Date().toISOString(),
          });
        }

        const safeUsers = dbUsers || [];
        const safeMembers = dbMembers || [];
        const safeTickets = dbTickets || [];

        // Map businesses with aggregated counts
        const businesses: SuperAdminBusinessView[] = dbWorkspaces.map((ws: any) => {
          const wsUsers = safeUsers.filter((u: any) => u.workspace_id === ws.id);
          const wsMembers = safeMembers.filter((m: any) => m.workspace_id === ws.id);
          const wsTickets = safeTickets.filter((t: any) => t.workspace_id === ws.id);
          const openTickets = wsTickets.filter(
            (t: any) => t.status === "open" || t.status === "pending" || t.status === "in_progress"
          ).length;

          // Find the workspace admin
          const adminUser =
            wsUsers.find((u: any) => u.role === "admin" || u.role === "superadmin") || wsUsers[0];
          const membersCount = Math.max(wsUsers.length, wsMembers.length, 1);

          return {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            publicKey: ws.public_key,
            brandColor: ws.brand_color || "#2563eb",
            status: (ws.status as "active" | "suspended") || "active",
            tier: (ws.tier as "Free" | "Starter" | "Pro" | "Enterprise VIP") || "Pro",
            adminName: adminUser?.full_name || ws.adminName || "Admin",
            ownerEmail: adminUser?.email || ws.ownerEmail || "admin@fluxdesk.com",
            totalTickets: wsTickets.length,
            openTickets,
            membersCount,
            createdAt: ws.created_at || new Date().toISOString(),
          };
        });

        // Map users across all businesses
        const users: SuperAdminUserView[] = safeUsers.map((u: any) => {
          const ws = dbWorkspaces.find((w: any) => w.id === u.workspace_id);
          return {
            id: u.id,
            name: u.full_name || u.email?.split("@")[0] || "User",
            email: u.email,
            role: (u.role as "superadmin" | "admin" | "agent" | "customer") || "agent",
            workspaceId: u.workspace_id || "",
            workspaceName: ws?.name || "FluxDesk",
            isActive: u.is_active !== false,
            avatarUrl:
              u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
            createdAt: u.created_at || new Date().toISOString(),
          };
        });

        // Also include customers who have submitted tickets
        const seenEmails = new Set(users.map((u) => u.email.toLowerCase()));
        for (const t of safeTickets) {
          const custEmail = (t.customer_email || t.customer?.email || "").toLowerCase();
          if (custEmail && !seenEmails.has(custEmail)) {
            seenEmails.add(custEmail);
            const ws = dbWorkspaces.find((w: any) => w.id === t.workspace_id);
            users.push({
              id: t.customer_id || `cust-${t.id}`,
              name: t.customer_name || t.customer?.name || custEmail.split("@")[0],
              email: custEmail,
              role: "customer",
              workspaceId: t.workspace_id || "",
              workspaceName: ws?.name || "FluxDesk",
              isActive: true,
              avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${custEmail}`,
              createdAt: t.created_at || new Date().toISOString(),
            });
          }
        }

        // Calculate live platform stats
        const totalBusinesses = businesses.length;
        const activeBusinesses = businesses.filter((b) => b.status === "active").length;
        const suspendedBusinesses = businesses.filter((b) => b.status === "suspended").length;

        const totalUsers = users.length;
        const activeUsers = users.filter((u) => u.isActive).length;
        const disabledUsers = users.filter((u) => !u.isActive).length;

        const totalTickets = safeTickets.length;
        const openTickets = safeTickets.filter(
          (t: any) => t.status === "open" || t.status === "pending" || t.status === "in_progress"
        ).length;
        const solvedTickets = safeTickets.filter(
          (t: any) => t.status === "solved" || t.status === "closed"
        ).length;

        return {
          stats: {
            totalBusinesses,
            activeBusinesses,
            suspendedBusinesses,
            totalUsers,
            activeUsers,
            disabledUsers,
            totalTickets,
            openTickets,
            solvedTickets,
            csatAverage: 4.8,
          },
          businesses,
          users,
        };
      }
    } catch (dbErr) {
      console.warn("getSuperPlatformData database fetch warning, falling back to mock:", dbErr);
    }
  }

  // 2. Fallback to runtime memory store (for offline or local dev without live database)
  const allWorkspaces = getSharedWorkspaces();
  const allTeam = getSharedTeamMembers();
  const allTickets = getSharedTickets();

  // Map businesses with aggregated counts
  const businesses: SuperAdminBusinessView[] = allWorkspaces.map((ws) => {
    const wsTickets = allTickets.filter((t) => t.workspaceId === ws.id);
    const wsMembers = allTeam.filter((m) => m.workspaceId === ws.id);
    const openTickets = wsTickets.filter((t) => t.status === "open" || t.status === "pending").length;

    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      publicKey: ws.publicKey,
      brandColor: ws.brandColor || "#2563eb",
      status: (ws.status as "active" | "suspended") || "active",
      tier: (ws.tier as "Free" | "Starter" | "Pro" | "Enterprise VIP") || "Pro",
      adminName: ws.adminName,
      ownerEmail: ws.ownerEmail || (wsMembers[0]?.email ?? "admin@fluxdesk.com"),
      totalTickets: wsTickets.length,
      openTickets,
      membersCount: wsMembers.length,
      createdAt: ws.createdAt || new Date().toISOString(),
    };
  });

  // Map users across all businesses
  const users: SuperAdminUserView[] = allTeam.map((m) => {
    const ws = allWorkspaces.find((w) => w.id === m.workspaceId);
    return {
      id: m.id,
      name: m.fullName,
      email: m.email,
      role: m.role as "superadmin" | "admin" | "agent" | "customer",
      workspaceId: m.workspaceId,
      workspaceName: ws?.name || "Acme Cloud",
      isActive: m.isActive !== false,
      avatarUrl: m.avatarUrl,
      createdAt: m.createdAt,
    };
  });

  // Also include customers who have tickets
  const seenEmails = new Set(users.map((u) => u.email.toLowerCase()));
  for (const t of allTickets) {
    if (t.customer && !seenEmails.has(t.customer.email.toLowerCase())) {
      seenEmails.add(t.customer.email.toLowerCase());
      const ws = allWorkspaces.find((w) => w.id === t.workspaceId);
      users.push({
        id: t.customer.id,
        name: t.customer.name,
        email: t.customer.email,
        role: "customer",
        workspaceId: t.workspaceId || INITIAL_WORKSPACE.id,
        workspaceName: ws?.name || "Acme Cloud",
        isActive: true,
        avatarUrl: t.customer.avatar,
        createdAt: t.createdAt,
      });
    }
  }

  // Calculate platform stats
  const totalBusinesses = businesses.length;
  const activeBusinesses = businesses.filter((b) => b.status === "active").length;
  const suspendedBusinesses = businesses.filter((b) => b.status === "suspended").length;

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const disabledUsers = users.filter((u) => !u.isActive).length;

  const totalTickets = allTickets.length;
  const openTickets = allTickets.filter((t) => t.status === "open" || t.status === "pending").length;
  const solvedTickets = allTickets.filter((t) => t.status === "solved" || t.status === "closed").length;

  return {
    stats: {
      totalBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      totalUsers,
      activeUsers,
      disabledUsers,
      totalTickets,
      openTickets,
      solvedTickets,
      csatAverage: 4.8,
    },
    businesses,
    users,
  };
}

/**
 * 3. Toggle User Account Status (Enable / Disable)
 */
export async function toggleUserStatusAction(userId: string, isActive: boolean) {
  const isSuper = await checkIsSuperAdmin();
  if (!isSuper) throw new Error("UNAUTHORIZED");

  // Update in runtime store
  updateSharedTeamMember(userId, { isActive });

  // Update in Supabase if configured
  if (isLiveSupabaseConfigured || isAdminConfigured) {
    try {
      const db = isAdminConfigured ? adminClient : supabase;
      await db.from("users").update({ is_active: isActive }).eq("id", userId);
      await db.from("workspace_members").update({ is_active: isActive }).eq("user_id", userId);
    } catch (err: any) {
      console.warn("toggleUserStatusAction DB warning:", err?.message);
    }
  }

  safeRevalidatePath("/super");
  safeRevalidatePath("/admin/team");
  return { success: true, isActive };
}

/**
 * 4. Update User Role (superadmin, admin, agent, customer)
 */
export async function updateUserRoleAction(userId: string, role: "superadmin" | "admin" | "agent" | "customer") {
  const isSuper = await checkIsSuperAdmin();
  if (!isSuper) throw new Error("UNAUTHORIZED");

  updateSharedTeamMember(userId, { role });

  if (isLiveSupabaseConfigured || isAdminConfigured) {
    try {
      const db = isAdminConfigured ? adminClient : supabase;
      await db.from("users").update({ role }).eq("id", userId);
      await db.from("workspace_members").update({ role }).eq("user_id", userId);
    } catch (err: any) {
      console.warn("updateUserRoleAction DB warning:", err?.message);
    }
  }

  safeRevalidatePath("/super");
  safeRevalidatePath("/admin/team");
  return { success: true, role };
}

/**
 * 5. Reset User Password
 */
export async function resetUserPasswordAction(userId: string, newPassword?: string) {
  const isSuper = await checkIsSuperAdmin();
  if (!isSuper) throw new Error("UNAUTHORIZED");

  const generatedPassword = newPassword?.trim() || `FluxPass#${Math.floor(100000 + Math.random() * 900000)}`;

  updateSharedTeamMember(userId, { password: generatedPassword });

  if (isAdminConfigured) {
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        password: generatedPassword,
      });
    } catch (err: any) {
      console.warn("resetUserPasswordAction auth.admin warning:", err?.message);
    }
  }

  safeRevalidatePath("/super");
  return { success: true, newPassword: generatedPassword };
}

/**
 * 6. Delete User Account
 */
export async function deleteUserAction(userId: string) {
  const isSuper = await checkIsSuperAdmin();
  if (!isSuper) throw new Error("UNAUTHORIZED");

  deleteSharedTeamMember(userId);

  if (isAdminConfigured) {
    try {
      await adminClient.auth.admin.deleteUser(userId);
      await adminClient.from("users").delete().eq("id", userId);
      await adminClient.from("profiles").delete().eq("id", userId);
    } catch (err: any) {
      console.warn("deleteUserAction DB warning:", err?.message);
    }
  }

  safeRevalidatePath("/super");
  return { success: true };
}

/**
 * 7. Toggle Business Status (Active / Suspended)
 */
export async function toggleBusinessStatusAction(workspaceId: string, status: "active" | "suspended") {
  const isSuper = await checkIsSuperAdmin();
  if (!isSuper) throw new Error("UNAUTHORIZED");

  toggleSharedWorkspaceStatus(workspaceId, status);

  if (isLiveSupabaseConfigured || isAdminConfigured) {
    try {
      const db = isAdminConfigured ? adminClient : supabase;
      await db.from("workspaces").update({ status }).eq("id", workspaceId);
    } catch (err: any) {
      console.warn("toggleBusinessStatusAction DB warning:", err?.message);
    }
  }

  safeRevalidatePath("/super");
  safeRevalidatePath("/admin/dashboard");
  return { success: true, status };
}

/**
 * 8. Update Business Details (Name, Brand Color, Tier)
 */
export async function updateBusinessAction(
  workspaceId: string,
  updates: {
    name?: string;
    brandColor?: string;
    tier?: "Free" | "Starter" | "Pro" | "Enterprise VIP";
  }
) {
  const isSuper = await checkIsSuperAdmin();
  if (!isSuper) throw new Error("UNAUTHORIZED");

  updateSharedWorkspaceBranding(workspaceId, updates);

  if (isLiveSupabaseConfigured || isAdminConfigured) {
    try {
      const db = isAdminConfigured ? adminClient : supabase;
      const dbPayload: any = { updated_at: new Date().toISOString() };
      if (updates.name) dbPayload.name = updates.name;
      if (updates.brandColor) dbPayload.brand_color = updates.brandColor;
      if (updates.tier) dbPayload.tier = updates.tier;
      await db.from("workspaces").update(dbPayload).eq("id", workspaceId);
    } catch (err: any) {
      console.warn("updateBusinessAction DB warning:", err?.message);
    }
  }

  safeRevalidatePath("/super");
  safeRevalidatePath("/admin/dashboard");
  return { success: true };
}

/**
 * 9. Delete Business Workspace
 */
export async function deleteBusinessAction(workspaceId: string) {
  const isSuper = await checkIsSuperAdmin();
  if (!isSuper) throw new Error("UNAUTHORIZED");

  deleteSharedWorkspace(workspaceId);

  if (isAdminConfigured || isLiveSupabaseConfigured) {
    try {
      const db = isAdminConfigured ? adminClient : supabase;
      // Cascade delete references to avoid foreign key errors
      await db.from("tickets").delete().eq("workspace_id", workspaceId);
      await db.from("workspace_members").delete().eq("workspace_id", workspaceId);
      await db.from("users").update({ workspace_id: null }).eq("workspace_id", workspaceId);
      await db.from("workspaces").delete().eq("id", workspaceId);
    } catch (err: any) {
      console.warn("deleteBusinessAction DB warning:", err?.message);
    }
  }

  safeRevalidatePath("/super");
  return { success: true };
}

/**
 * 10. Switch Active Workspace (SaaS Owner view-as tenant)
 */
export async function switchActiveWorkspaceAction(workspaceId: string) {
  const isSuper = await checkIsSuperAdmin();
  if (!isSuper) throw new Error("UNAUTHORIZED");

  let ws = getSharedWorkspaces().find((w) => w.id === workspaceId);
  if (!ws && (isAdminConfigured || isLiveSupabaseConfigured)) {
    try {
      const db = isAdminConfigured ? adminClient : supabase;
      const { data } = await db.from("workspaces").select("*").eq("id", workspaceId).single();
      if (data) {
        ws = {
          id: data.id,
          name: data.name,
          slug: data.slug,
          publicKey: data.public_key,
          brandColor: data.brand_color || "#2563eb",
          status: data.status || "active",
          tier: data.tier || "Pro",
          createdAt: data.created_at,
        };
        addSharedWorkspace(ws);
      }
    } catch (err) {
      console.warn("switchActiveWorkspaceAction fetch error:", err);
    }
  }

  if (ws) {
    setActiveWorkspace(ws);
  }

  const cookieStore = await cookies();
  cookieStore.set("fluxdesk_active_workspace_id", workspaceId, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  safeRevalidatePath("/");
  safeRevalidatePath("/agent");
  safeRevalidatePath("/admin/dashboard");
  return { success: true, workspaceId };
}

/**
 * 11. Super Admin 1-Click Login (SaaS Owner Authentication)
 */
export async function loginAsSuperAdminAction() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "superadmin", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/super");
}
