import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSessionUser, logoutUser } from "@/app/actions/auth";
import { createClient, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { getActiveWorkspace } from "@/data/workspaceStore";
import { WidgetBrandingManager } from "@/components/admin/WidgetBrandingManager";
import {
  LifeBuoy,
  Sparkles,
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  Settings,
  Users,
  BarChart3,
  Code2,
  Palette,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WidgetBrandingSettingsPage() {
  const supabase = isLiveSupabaseConfigured ? await createClient() : null;

  // 1. Verify user is an admin
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser && !isLiveSupabaseConfigured) {
    redirect("/login");
  }

  let isAdmin = sessionUser?.role === "admin" || sessionUser?.role === "superadmin";
  let userRole = sessionUser?.role || "agent";

  if (isLiveSupabaseConfigured) {
    try {
      const { adminClient, isAdminConfigured } = await import("@/utils/supabase/admin");
      const client = isAdminConfigured ? adminClient : (supabase || await createClient());

      const lookupId = sessionUser?.id;

      if (lookupId) {
        const isUuid = (val: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        let userQuery = client.from("users").select("role");
        if (isUuid(lookupId)) {
          userQuery = userQuery.eq("id", lookupId);
        } else if (lookupId.includes("@")) {
          userQuery = userQuery.eq("email", lookupId.toLowerCase());
        } else {
          userQuery = userQuery.eq("id", lookupId);
        }

        const { data: userRecord } = await userQuery.maybeSingle();

        if (userRecord?.role) {
          userRole = userRecord.role;
          isAdmin = userRecord.role === "admin" || userRecord.role === "superadmin";
        }
      }
    } catch {
      // In local mode, admin verified via sessionUser
    }
  }

  // Access Denied Screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-md w-full text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Denied</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              You must have the <strong>Admin</strong> role to customize Widget Branding.
              Your current role is <span className="font-semibold text-slate-700 capitalize">{userRole}</span>.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link href="/" className="w-full sm:w-auto">
              <Button className="w-full h-8.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
                Return to Agent Desk
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full h-8.5 text-xs font-medium">
                Switch to Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Resolve Active Workspace
  let workspace = getActiveWorkspace();

  if (isLiveSupabaseConfigured && supabase) {
    try {
      const { data: dbWorkspace } = await supabase
        .from("workspaces")
        .select(
          "id, name, slug, brand_color, public_key, welcome_title, welcome_subtitle, logo_url, launcher_icon_url, launcher_text, show_launcher_text, created_at"
        )
        .limit(1)
        .maybeSingle();

      if (dbWorkspace) {
        workspace = {
          id: dbWorkspace.id,
          name: dbWorkspace.name,
          slug: dbWorkspace.slug,
          publicKey: dbWorkspace.public_key || `pk_live_${dbWorkspace.id.replace(/-/g, "")}`,
          brandColor: dbWorkspace.brand_color || "#2563eb",
          welcomeTitle: dbWorkspace.welcome_title || "Hi there! 👋 How can we help you today?",
          welcomeSubtitle:
            dbWorkspace.welcome_subtitle ||
            "Fill in your details below and a member of our team will assist you right away.",
          logoUrl: dbWorkspace.logo_url || "",
          launcherIconUrl: dbWorkspace.launcher_icon_url || "",
          launcherText: dbWorkspace.launcher_text || "Chat with us",
          showLauncherText: Boolean(dbWorkspace.show_launcher_text),
          createdAt: dbWorkspace.created_at,
        };
      }
    } catch (err) {
      console.warn("Supabase workspace fetch error, using active workspace fallback:", err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base block leading-tight">
                  mellowDesk Admin
                </span>
                <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                  Widget Branding
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {workspace.name} &bull; /{workspace.slug}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/settings"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <ArrowLeft className="h-3 w-3 text-slate-400" />
              <span>General Settings</span>
            </Link>

            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
              <span>Analytics</span>
            </Link>

            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <span>Agent Desk</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>

            <form action={logoutUser} className="inline-flex">
              <button
                type="submit"
                title="Sign Out"
                className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 bg-slate-100 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200/60 cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Banner */}
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 px-2.5 py-0.5 rounded-full text-blue-100">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>Dynamic Multi-Tenant Customization</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">
              Customize Widget Branding
            </h1>
            <p className="text-xs text-blue-100/90 max-w-xl leading-relaxed">
              Tailor the floating chat bubble, company logo, theme colors, and welcome prompts to seamlessly match your brand identity across all embedded external websites.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/widget-demo" target="_blank" rel="noopener noreferrer">
              <Button className="h-8.5 text-xs font-bold bg-white text-slate-900 hover:bg-blue-50 shadow-sm gap-1.5">
                <span>Open Sandbox Demo</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Side-by-Side Manager & Preview */}
        <WidgetBrandingManager workspace={workspace} />
      </main>
    </div>
  );
}
