"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { serverSupabase as supabase, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { adminClient, isAdminConfigured } from "@/utils/supabase/admin";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { addSharedWorkspace, setActiveWorkspace, getActiveWorkspace } from "@/data/workspaceStore";
import { addSharedTeamMember, getSharedTeamMembers, TeamMember } from "@/data/teamStore";
import { AVAILABLE_AGENTS } from "@/data/mockDeskData";
import { sanitizeSlug } from "@/lib/slug";

const SESSION_COOKIE_NAME = "fluxdesk_session_user";

export interface OnboardBrandAccountInput {
  brandName: string;
  slug: string;
  fullName: string;
  email: string;
  password: string;
}

export interface CreateBrandUserInput {
  email: string;
  password: string;
  fullName: string;
  role?: "admin" | "agent";
}

export interface LoginUserInput {
  email: string;
  password?: string;
}

/**
 * 1. onboardBrandWithAccount
 * Creates a brand admin via Supabase auth (or adminClient), inserts the new workspaces
 * record, and assigns the user profile with role: 'admin'.
 */
export async function onboardBrandWithAccount(input: OnboardBrandAccountInput) {
  try {
    const brandName = (input.brandName || "").trim();
    const fullName = (input.fullName || "").trim();
    const email = (input.email || "").trim().toLowerCase();
    const password = input.password || "";
    const rawSlug = input.slug || brandName;
    const slug = sanitizeSlug(rawSlug);

    // Validation
    if (!brandName) {
      return { success: false, error: "Company or Brand Name is required." };
    }
    if (!fullName) {
      return { success: false, error: "Admin Full Name is required." };
    }
    if (!email || !email.includes("@")) {
      return { success: false, error: "A valid email address is required." };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }
    if (!slug || slug.length < 2) {
      return {
        success: false,
        error: "Workspace slug must be at least 2 alphanumeric characters or hyphens (e.g. acme-support).",
      };
    }

    const workspaceId = crypto.randomUUID();
    const publicKey = `pk_live_${crypto.randomUUID().replace(/-/g, "")}`;
    const brandColor = "#2563eb";
    const now = new Date().toISOString();
    let authUserId = `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // If Supabase is configured, create the auth user
    if (isLiveSupabaseConfigured || isAdminConfigured) {
      try {
        if (isAdminConfigured) {
          const { data: createdUser, error: createError } =
            await adminClient.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
              user_metadata: { full_name: fullName, role: "admin" },
            });

          if (createError) {
            // If already exists, attempt standard signup or signin
            console.warn("admin.createUser returned error:", createError.message);
            if (createError.message.toLowerCase().includes("already registered")) {
              return {
                success: false,
                error: "An account with this email address is already registered. Please sign in instead.",
              };
            }
          } else if (createdUser.user) {
            authUserId = createdUser.user.id;
          }
        } else {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName, role: "admin" },
            },
          });
          if (signUpError && !signUpError.message.includes("rate limit")) {
            return { success: false, error: signUpError.message };
          }
          if (signUpData?.user?.id) {
            authUserId = signUpData.user.id;
          }
        }
      } catch (authEx: any) {
        console.warn("Supabase auth user creation warning:", authEx?.message);
      }

      const dbClient = isAdminConfigured ? adminClient : supabase;

      // Insert workspaces record in database
      try {
        const { error: wsError } = await dbClient.from("workspaces").insert({
          id: workspaceId,
          name: brandName,
          slug,
          public_key: publicKey,
          brand_color: brandColor,
          status: "active",
          tier: "standard",
          created_at: now,
          updated_at: now,
        });

        if (wsError) {
          console.error("Workspace insert error:", wsError);
          if (wsError.code === "23505") {
            return {
              success: false,
              error: `Workspace slug "${slug}" is already taken. Please choose another slug.`,
            };
          }
        }
      } catch (wsEx: any) {
        console.warn("Supabase workspaces insert warning:", wsEx?.message);
      }

      // Assign user profile with role: 'admin'
      try {
        await dbClient.from("users").upsert({
          id: authUserId,
          email,
          full_name: fullName,
          role: "admin",
          workspace_id: workspaceId,
          is_active: true,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          created_at: now,
          updated_at: now,
        });

        await dbClient.from("profiles").upsert({
          id: authUserId,
          email,
          full_name: fullName,
          workspace_id: workspaceId,
          updated_at: now,
        });

        await dbClient.from("workspace_members").upsert({
          workspace_id: workspaceId,
          user_id: authUserId,
          role: "admin",
          is_active: true,
          created_at: now,
          updated_at: now,
        }, { onConflict: "workspace_id,user_id" });
      } catch (userEx: any) {
        console.error("Supabase user/member creation error:", userEx);
      }

      // Automatically sign in the user via Supabase Auth so cookies are set!
      if (isLiveSupabaseConfigured) {
        try {
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        } catch (signInErr) {
          console.warn("Auto signInWithPassword warning:", signInErr);
        }
      }
    }

    // Persist to runtime stores
    const newWorkspace = {
      id: workspaceId,
      name: brandName,
      slug,
      publicKey,
      brandColor,
      adminName: fullName,
      createdAt: now,
    };
    addSharedWorkspace(newWorkspace);
    setActiveWorkspace(newWorkspace);

    const adminMember: TeamMember = {
      id: authUserId,
      email,
      fullName,
      role: "admin",
      workspaceId,
      password,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      createdAt: now,
    };
    addSharedTeamMember(adminMember);

    // Set authenticated session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, authUserId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    try {
      revalidatePath("/");
      revalidatePath("/admin/dashboard");
      revalidatePath("/admin/team");
      revalidatePath("/admin/settings");
    } catch {
      // Invariant
    }

    return {
      success: true,
      workspace: newWorkspace,
      user: adminMember,
      redirectUrl: "/admin/dashboard",
    };
  } catch (err: any) {
    console.error("onboardBrandWithAccount exception:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred during brand onboarding.",
    };
  }
}

/**
 * 2. createBrandUser
 * Validates the caller is an admin, invokes adminClient.auth.admin.createUser({ email, password, email_confirm: true }),
 * and inserts the profile into users tied to the current admin's workspace_id.
 */
export async function createBrandUser(input: CreateBrandUserInput) {
  try {
    const email = (input.email || "").trim().toLowerCase();
    const password = input.password || "";
    const fullName = (input.fullName || "").trim();
    const role: "admin" | "agent" = input.role === "admin" ? "admin" : "agent";

    // Validate calling user permissions
    const callingUser = await getCurrentSessionUser();
    if (!callingUser || callingUser.role !== "admin") {
      return {
        success: false,
        error: "Unauthorized: Only administrators can create or provision team members.",
      };
    }

    // Validation
    if (!email || !email.includes("@")) {
      return { success: false, error: "A valid email address is required." };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }
    if (!fullName) {
      return { success: false, error: "Full name is required." };
    }

    const activeWorkspace = getActiveWorkspace();
    const targetWorkspaceId = activeWorkspace.id;
    const now = new Date().toISOString();
    let authUserId = `u-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;

    // Admin API User Provisioning (without disrupting active admin session)
    if (isAdminConfigured) {
      try {
        const { data: newUser, error: createError } =
          await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              role,
              workspace_id: targetWorkspaceId,
            },
          });

        if (createError) {
          console.error("adminClient.auth.admin.createUser error:", createError);
          return {
            success: false,
            error: createError.message || "Failed to create user in authentication directory.",
          };
        }

        if (newUser?.user?.id) {
          authUserId = newUser.user.id;
        }
      } catch (authErr: any) {
        console.warn("adminClient call warning:", authErr?.message);
      }
    }

    // Insert user record in public.users tied to current admin's workspace_id
    if (isLiveSupabaseConfigured || isAdminConfigured) {
      try {
        const dbClient = isAdminConfigured ? adminClient : supabase;
        await dbClient.from("users").upsert({
          id: authUserId,
          email,
          full_name: fullName,
          role,
          workspace_id: targetWorkspaceId,
          avatar_url: avatarUrl,
          created_at: now,
          updated_at: now,
        });

        await dbClient.from("profiles").upsert({
          id: authUserId,
          email,
          full_name: fullName,
          workspace_id: targetWorkspaceId,
          avatar_url: avatarUrl,
          updated_at: now,
        });

        await dbClient.from("workspace_members").upsert({
          workspace_id: targetWorkspaceId,
          user_id: authUserId,
          role,
          is_active: true,
        }, { onConflict: "workspace_id,user_id" });
      } catch (dbErr: any) {
        console.warn("Database user insert warning:", dbErr?.message);
      }
    }

    // Sync to shared runtime store
    const member: TeamMember = {
      id: authUserId,
      email,
      fullName,
      role,
      workspaceId: targetWorkspaceId,
      password,
      avatarUrl,
      createdAt: now,
    };
    addSharedTeamMember(member);

    try {
      revalidatePath("/admin/team");
      revalidatePath("/admin/dashboard");
      revalidatePath("/");
    } catch {
      // Invariant
    }

    return {
      success: true,
      member,
      credentials: {
        email,
        password,
        role,
      },
    };
  } catch (err: any) {
    console.error("createBrandUser exception:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while creating user.",
    };
  }
}

/**
 * 3. loginUser
 * Logs in via supabase.auth.signInWithPassword (or runtime credentials),
 * redirects admins to /admin/dashboard and agents to /agent (or /).
 */
export async function loginUser(
  param1: string | LoginUserInput,
  param2?: string
): Promise<void | { success: boolean; error?: string; redirectUrl?: string }> {
  let email = "";
  let password = "";
  let rolePreset: string | null = null;

  if (typeof param1 === "string") {
    if (["superadmin", "admin", "agent", "customer"].includes(param1)) {
      rolePreset = param1;
    } else {
      email = param1.trim().toLowerCase();
      password = param2 || "";
    }
  } else if (typeof param1 === "object" && param1 !== null) {
    email = (param1.email || "").trim().toLowerCase();
    password = param1.password || "";
  }

  const cookieStore = await cookies();

  // Quick 1-click Preset Login
  if (rolePreset) {
    cookieStore.set(SESSION_COOKIE_NAME, rolePreset, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    if (rolePreset === "superadmin") {
      redirect("/super");
    } else if (rolePreset === "admin") {
      redirect("/admin/dashboard");
    } else if (rolePreset === "customer") {
      redirect("/portal");
    } else {
      redirect("/agent");
    }
  }

  // Live Supabase Authentication
  if (isLiveSupabaseConfigured && password) {
    try {
      const { data: authData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (!signInError && authData.user) {
        // Fetch role from users table
        let targetRole: "superadmin" | "admin" | "agent" | "customer" = "agent";
        try {
          const dbClient = isAdminConfigured ? adminClient : supabase;
          const { data: userProfile } = await dbClient
            .from("users")
            .select("role")
            .eq("id", authData.user.id)
            .maybeSingle();

          if (userProfile?.role) {
            targetRole = userProfile.role;
          } else if (authData.user.user_metadata?.role) {
            targetRole = authData.user.user_metadata.role;
          }
        } catch {
          // Default
        }

        cookieStore.set(SESSION_COOKIE_NAME, authData.user.id, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });

        if (targetRole === "superadmin") {
          redirect("/super");
        } else if (targetRole === "admin") {
          redirect("/admin/dashboard");
        } else if (targetRole === "customer") {
          redirect("/portal");
        } else {
          redirect("/agent");
        }
      }
    } catch (err: any) {
      if (err?.digest?.includes("NEXT_REDIRECT")) {
        throw err;
      }
      console.warn("Live Supabase login attempted, checking runtime fallback:", err?.message);
    }
  }

  // Runtime Store / Mock Authentication Fallback
  const allTeam = [...AVAILABLE_AGENTS, ...getSharedTeamMembers()];
  const matchedUser = allTeam.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() || u.id === email
  );

  let targetRole = "agent";
  let sessionIdentifier = email;

  if (matchedUser) {
    if (matchedUser.isActive === false) {
      return { success: false, error: "This account has been disabled by the system administrator." };
    }
    sessionIdentifier = matchedUser.id;
    targetRole = matchedUser.role;

    // If a password was saved for this member and provided, verify it (unless empty demo password)
    if ("password" in matchedUser && matchedUser.password && password) {
      if (matchedUser.password !== password) {
        return { success: false, error: "Invalid password for this account." };
      }
    }
  } else if (email.includes("superadmin") || email.includes("owner")) {
    targetRole = "superadmin";
    sessionIdentifier = "superadmin";
  } else if (email.includes("admin")) {
    targetRole = "admin";
    sessionIdentifier = "admin";
  } else if (email.includes("customer") || email.includes("client")) {
    targetRole = "customer";
    sessionIdentifier = "customer";
  } else {
    // Default staff agent
    targetRole = "agent";
    sessionIdentifier = email;
  }

  cookieStore.set(SESSION_COOKIE_NAME, sessionIdentifier, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  if (targetRole === "superadmin") {
    redirect("/super");
  } else if (targetRole === "admin") {
    redirect("/admin/dashboard");
  } else if (targetRole === "customer") {
    redirect("/portal");
  } else {
    redirect("/agent");
  }
}
