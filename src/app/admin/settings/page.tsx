import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSessionUser, logoutUser } from "@/app/actions/auth";
import { createClient, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { getActiveWorkspace } from "@/data/workspaceStore";
import { WidgetSnippetBox } from "@/components/admin/WidgetSnippetBox";
import { BrandColorCustomizer } from "@/components/admin/BrandColorCustomizer";
import {
  LifeBuoy,
  Settings,
  Users,
  BarChart3,
  ExternalLink,
  ShieldAlert,
  Building2,
  Key,
  Globe,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = isLiveSupabaseConfigured ? await createClient() : null;

  // 1. Verify user is logged in as an Admin
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser && !isLiveSupabaseConfigured) {
    redirect("/login");
  }

  let isAdmin = sessionUser?.role === "admin";
  let userRole = sessionUser?.role || "agent";

  if (isLiveSupabaseConfigured && supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        const { data: userRecord } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (userRecord?.role) {
          userRole = userRecord.role;
          isAdmin = userRecord.role === "admin";
        }
      }
    } catch {
      // In local mode, admin access verified via sessionUser
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
              You must have the <strong>Admin</strong> role to access Workspace Settings.
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
        .select("id, name, slug, brand_color, public_key, created_at")
        .limit(1)
        .maybeSingle();

      if (dbWorkspace) {
        workspace = {
          id: dbWorkspace.id,
          name: dbWorkspace.name,
          slug: dbWorkspace.slug,
          publicKey: dbWorkspace.public_key || `pk_live_${dbWorkspace.id.replace(/-/g, "")}`,
          brandColor: dbWorkspace.brand_color || "#2563eb",
          createdAt: dbWorkspace.created_at,
        };
      }
    } catch (err) {
      console.warn("Supabase workspace fetch error in settings, using active workspace fallback:", err);
    }
  }

  const effectivePublicKey = workspace.publicKey || "pk_live_acme_cloud_tech";
  const effectiveBrandColor = workspace.brandColor || "#2563eb";

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
                  FluxDesk Admin
                </span>
                <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                  Brand &amp; Widget Settings
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {workspace.name} &bull; /{workspace.slug}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <span>Agent Desk</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>

            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
              <span>Analytics</span>
            </Link>

            <Link
              href="/admin/team"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span>Team</span>
            </Link>

            <span className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
              <Settings className="h-3.5 w-3.5 text-blue-600" />
              <span>Settings</span>
            </span>

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

      {/* Main Settings Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Workspace Identity Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-base shadow-2xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  {workspace.name}
                </h2>
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Active Workspace
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                <span>Slug: <strong className="text-slate-700 font-mono">/{workspace.slug}</strong></span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  Public Key:
                  <code className="text-slate-800 font-mono font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                    {effectivePublicKey}
                  </code>
                </span>
              </div>
            </div>
          </div>

          <Link href="/onboard">
            <Button variant="outline" size="sm" className="h-8.5 text-xs font-semibold gap-1.5">
              <span>+ Onboard New Brand</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Widget Branding Suite Banner */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 px-2 py-0.5 rounded-full text-purple-200">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>Full Branding Suite</span>
            </div>
            <h3 className="font-bold text-base text-white">
              Customize Widget Logo, Welcome Greetings &amp; Launcher
            </h3>
            <p className="text-xs text-purple-200/90 max-w-lg">
              Upload your company logo, tailor the headline greeting, and customize launcher bubble styles with a live side-by-side preview.
            </p>
          </div>
          <Link href="/admin/settings/widget">
            <Button className="h-9 px-4 text-xs font-bold bg-white text-purple-900 hover:bg-purple-50 shadow-sm gap-1.5 shrink-0">
              <span>Configure Branding &rarr;</span>
            </Button>
          </Link>
        </div>

        {/* 1. Brand Color Hex Customizer */}
        <BrandColorCustomizer
          workspaceId={workspace.id}
          initialColor={effectiveBrandColor}
          workspaceName={workspace.name}
        />

        {/* 2. Copyable Embed Widget Snippet Box */}
        <WidgetSnippetBox
          publicKey={effectivePublicKey}
          brandColor={effectiveBrandColor}
          appUrl={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
        />

        {/* Integration Instructions Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
            <Globe className="h-4 w-4 text-blue-600" />
            <span>How the Embeddable Chat Widget Works</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">1</span>
                <span>Copy Script Tag</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Add the snippet above to your external website before the <code className="text-slate-700 font-mono">&lt;/body&gt;</code> tag. It works with HTML, React, Webflow, Shopify, or WordPress.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">2</span>
                <span>Isolated Multi-Tenancy</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The widget resolves your workspace via <code className="text-slate-700 font-mono">data-workspace-key</code>, dynamically rendering your custom theme color and brand identity.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold flex items-center justify-center">3</span>
                <span>Direct Queue Routing</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Customer submissions directly populate your Agent Desk queue with isolated <code className="text-slate-700 font-mono">workspace_id</code> filtering and initial message threads.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
