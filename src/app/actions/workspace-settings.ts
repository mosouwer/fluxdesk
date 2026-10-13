"use server";

import { revalidatePath } from "next/cache";
import { serverSupabase as supabase, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { getCurrentSessionUser } from "@/app/actions/auth";
import {
  getActiveWorkspace,
  updateSharedWorkspaceBranding,
  Workspace,
} from "@/data/workspaceStore";

export interface UpdateWorkspaceBrandingInput {
  workspaceId?: string;
  brandColor?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  logoUrl?: string;
  launcherIconUrl?: string;
  launcherText?: string;
  showLauncherText?: boolean;
}

/**
 * 1. Process asset upload to 'workspace-assets' bucket
 */
export async function uploadWorkspaceAsset(formData: FormData) {
  try {
    // 1. Verify user is admin
    const currentUser = await getCurrentSessionUser();
    if (currentUser && currentUser.role !== "admin") {
      return {
        success: false,
        error: "Unauthorized: Only administrators can upload brand assets.",
      };
    }

    const file = formData.get("file");
    const assetType = (formData.get("assetType") as string) || "logo";

    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: "No file provided or file is empty." };
    }

    // Maximum 10MB
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, error: "File exceeds 10MB limit." };
    }

    const activeWs = getActiveWorkspace();
    const workspaceId = activeWs.id;
    const cleanFileName = `${workspaceId}/${assetType}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    let publicUrl = "";

    if (isLiveSupabaseConfigured) {
      try {
        const fileBuffer = await file.arrayBuffer();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("workspace-assets")
          .upload(cleanFileName, fileBuffer, {
            contentType: file.type || "image/png",
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from("workspace-assets")
            .getPublicUrl(cleanFileName);
          publicUrl = urlData.publicUrl;
        } else if (uploadError) {
          console.warn("Supabase storage upload error:", uploadError);
        }
      } catch (err) {
        console.warn("Storage upload exception, falling back:", err);
      }
    }

    // In local dev fallback or if storage returns no public URL:
    // Generate an inline base64 Data URL so the uploaded preview works immediately
    if (!publicUrl) {
      try {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mime = file.type || "image/png";
        publicUrl = `data:${mime};base64,${base64}`;
      } catch {
        publicUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(file.name)}`;
      }
    }

    return {
      success: true,
      url: publicUrl,
    };
  } catch (err: any) {
    console.error("uploadWorkspaceAsset exception:", err);
    return {
      success: false,
      error: err?.message || "Failed to upload asset.",
    };
  }
}

/**
 * 2. Update workspace branding settings in database and runtime memory store
 */
export async function updateWorkspaceBrandingSettings(input: UpdateWorkspaceBrandingInput) {
  try {
    // 1. Verify user is admin
    const currentUser = await getCurrentSessionUser();
    if (currentUser && currentUser.role !== "admin") {
      return {
        success: false,
        error: "Unauthorized: Only administrators can update workspace branding.",
      };
    }

    const activeWs = getActiveWorkspace();
    const targetWorkspaceId = input.workspaceId || activeWs.id;

    // Validate brand color format if provided
    let cleanBrandColor = (input.brandColor || "").trim();
    if (cleanBrandColor) {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexRegex.test(cleanBrandColor)) {
        return { success: false, error: "Please enter a valid hex color code (e.g. #2563eb)." };
      }
    } else {
      cleanBrandColor = activeWs.brandColor || "#2563eb";
    }

    const cleanWelcomeTitle = (input.welcomeTitle ?? "Hi there! 👋 How can we help you today?").trim();
    const cleanWelcomeSubtitle = (
      input.welcomeSubtitle ?? "Fill in your details below and a member of our team will assist you right away."
    ).trim();
    const cleanLauncherText = (input.launcherText ?? "Chat with us").trim();
    const showLauncherText = Boolean(input.showLauncherText);
    const logoUrl = input.logoUrl ?? activeWs.logoUrl ?? "";
    const launcherIconUrl = input.launcherIconUrl ?? activeWs.launcherIconUrl ?? "";

    // 2. Persist to Supabase if live database is configured
    if (isLiveSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from("workspaces")
          .update({
            brand_color: cleanBrandColor,
            welcome_title: cleanWelcomeTitle,
            welcome_subtitle: cleanWelcomeSubtitle,
            logo_url: logoUrl,
            launcher_icon_url: launcherIconUrl,
            launcher_text: cleanLauncherText,
            show_launcher_text: showLauncherText,
            updated_at: new Date().toISOString(),
          })
          .eq("id", targetWorkspaceId);

        if (error) {
          console.error("Supabase workspaces branding update error:", error);
        }
      } catch (dbErr) {
        console.warn("Supabase branding update fallback:", dbErr);
      }
    }

    // 3. Persist to runtime memory store
    const updated = updateSharedWorkspaceBranding(targetWorkspaceId, {
      brandColor: cleanBrandColor,
      welcomeTitle: cleanWelcomeTitle,
      welcomeSubtitle: cleanWelcomeSubtitle,
      logoUrl,
      launcherIconUrl,
      launcherText: cleanLauncherText,
      showLauncherText,
    });

    try {
      revalidatePath("/admin/settings/widget");
      revalidatePath("/admin/settings");
      revalidatePath("/admin/dashboard");
      revalidatePath("/embed/chat");
      revalidatePath("/widget-demo");
    } catch {
      // Invariant outside request context
    }

    return {
      success: true,
      workspace: updated,
    };
  } catch (err: any) {
    console.error("updateWorkspaceBrandingSettings exception:", err);
    return {
      success: false,
      error: err?.message || "Failed to update branding settings.",
    };
  }
}
