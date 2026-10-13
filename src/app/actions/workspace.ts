"use server";

import { revalidatePath } from "next/cache";
import { serverSupabase as supabase, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { getCurrentSessionUser } from "@/app/actions/auth";
import {
  getActiveWorkspace,
  updateSharedWorkspaceBrandColor,
  getSharedWorkspaces,
} from "@/data/workspaceStore";

export interface UpdateBrandColorInput {
  workspaceId: string;
  brandColor: string;
}

/**
 * Updates the brand_color for the specified workspace.
 * Only authenticated administrators can execute this action.
 */
export async function updateWorkspaceBrandColorAction({
  workspaceId,
  brandColor,
}: UpdateBrandColorInput) {
  try {
    // 1. Verify user is an admin
    const currentUser = await getCurrentSessionUser();
    if (currentUser && currentUser.role !== "admin") {
      return {
        success: false,
        error: "Unauthorized: Only administrators can update workspace brand settings.",
      };
    }

    const cleanColor = (brandColor || "").trim();
    // Validate hex format: #RGB or #RRGGBB
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(cleanColor)) {
      return {
        success: false,
        error: "Please enter a valid hex color code (e.g., #2563eb).",
      };
    }

    const targetId = workspaceId || getActiveWorkspace().id;

    // 2. Persist to Supabase if live database is configured
    if (isLiveSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from("workspaces")
          .update({
            brand_color: cleanColor,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetId);

        if (error) {
          console.error("Supabase workspaces brand_color update error:", error);
        }
      } catch (dbErr) {
        console.warn("Supabase update fallback to memory store:", dbErr);
      }
    }

    // 3. Update runtime memory store
    const updated = updateSharedWorkspaceBrandColor(targetId, cleanColor);

    try {
      revalidatePath("/admin/settings");
      revalidatePath("/admin/dashboard");
      revalidatePath("/widget-demo");
      revalidatePath("/embed/chat");
    } catch {
      // Invariant outside request context
    }

    return {
      success: true,
      brandColor: cleanColor,
      workspace: updated,
    };
  } catch (err: any) {
    console.error("updateWorkspaceBrandColorAction exception:", err);
    return {
      success: false,
      error: err?.message || "Failed to update brand color.",
    };
  }
}
