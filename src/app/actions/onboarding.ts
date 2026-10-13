"use server";

import { revalidatePath } from "next/cache";
import { serverSupabase as supabase, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { addSharedWorkspace, setActiveWorkspace } from "@/data/workspaceStore";

import { sanitizeSlug } from "@/lib/slug";

export interface OnboardBrandInput {
  brandName: string;
  slug: string;
  fullName: string;
}

/**
 * Handles self-serve brand onboarding:
 * 1. Validates brandName, slug, fullName
 * 2. Sanitizes slug (alphanumeric and hyphens only)
 * 3. Inserts into `workspaces` table
 * 4. Updates `users` table with `role: 'admin'`, full_name, and workspace_id
 * 5. Persists in active workspace session
 */
export async function onboardBrand({ brandName, slug, fullName }: OnboardBrandInput) {
  try {
    const cleanBrandName = (brandName || "").trim();
    const cleanFullName = (fullName || "").trim();

    if (!cleanBrandName) {
      return { success: false, error: "Company / Brand Name is required." };
    }

    if (!cleanFullName) {
      return { success: false, error: "Admin Full Name is required." };
    }

    const sanitizedSlug = sanitizeSlug(slug || cleanBrandName);
    if (!sanitizedSlug || sanitizedSlug.length < 2) {
      return {
        success: false,
        error: "Workspace slug must be at least 2 alphanumeric characters or hyphens (e.g. acme-support).",
      };
    }

    const workspaceId = crypto.randomUUID();
    const publicKey = `pk_live_${crypto.randomUUID().replace(/-/g, "")}`;
    const brandColor = "#2563eb";
    const now = new Date().toISOString();

    if (isLiveSupabaseConfigured) {
      // 1. Resolve current auth user if available
      let userId: string | null = null;
      let userEmail: string = `admin@${sanitizedSlug}.com`;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          userId = user.id;
          userEmail = user.email || userEmail;
        }
      } catch {
        // Continue if unauthenticated session
      }

      // 2. Insert into workspaces table
      const { data: wsData, error: wsError } = await supabase
        .from("workspaces")
        .insert({
          id: workspaceId,
          name: cleanBrandName,
          slug: sanitizedSlug,
          public_key: publicKey,
          brand_color: brandColor,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (wsError) {
        console.error("Supabase workspaces insert error:", wsError);
        if (wsError.code === "23505") {
          return {
            success: false,
            error: `Workspace slug "${sanitizedSlug}" is already taken. Please choose another slug.`,
          };
        }
      }

      const activeWorkspaceId = wsData?.id || workspaceId;

      // 3. Update/upsert users table with role: 'admin'
      if (userId) {
        await supabase
          .from("users")
          .upsert({
            id: userId,
            email: userEmail,
            full_name: cleanFullName,
            role: "admin",
            workspace_id: activeWorkspaceId,
            updated_at: now,
          });

        // Also update profiles table if present
        await supabase
          .from("profiles")
          .update({
            full_name: cleanFullName,
            workspace_id: activeWorkspaceId,
            updated_at: now,
          })
          .eq("id", userId);

        // Also add or update workspace_members table if present
        await supabase
          .from("workspace_members")
          .upsert({
            workspace_id: activeWorkspaceId,
            user_id: userId,
            role: "admin",
            is_active: true,
          }, { onConflict: "workspace_id,user_id" });
      }
    }

    // Persist in runtime workspace store
    const newWorkspace = {
      id: workspaceId,
      name: cleanBrandName,
      slug: sanitizedSlug,
      publicKey,
      brandColor,
      adminName: cleanFullName,
      createdAt: now,
    };
    addSharedWorkspace(newWorkspace);
    setActiveWorkspace(newWorkspace);

    try {
      revalidatePath("/");
      revalidatePath("/admin/dashboard");
      revalidatePath("/onboarding");
    } catch {
      // Invariant when called outside request context
    }

    return {
      success: true,
      workspace: newWorkspace,
    };
  } catch (err: any) {
    console.error("onboardBrand exception:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred during brand onboarding.",
    };
  }
}
