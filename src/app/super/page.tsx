import React from "react";
import Link from "next/link";
import { Shield, Lock, Key, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  checkIsSuperAdmin,
  getSuperPlatformData,
  loginAsSuperAdminAction,
} from "@/app/actions/superadmin";
import { SuperAdminClient } from "@/components/super/SuperAdminClient";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const isSuper = await checkIsSuperAdmin();

  // If not authenticated as Super Admin, display the Root Access Gate
  if (!isSuper) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-inner">
            <Shield className="h-7 w-7" />
          </div>

          <div>
            <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
              Root Authority Required
            </span>
            <h1 className="text-xl font-black text-white mt-3 tracking-tight">
              SaaS Owner & Super Admin
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              The <code>/super</code> endpoint controls multi-tenant isolation, businesses, and all user accounts across the entire SaaS.
            </p>
          </div>

          <form action={loginAsSuperAdminAction} className="pt-2">
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Authenticate as Platform Super Admin</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-500">
            <Link
              href="/agent"
              className="hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Back to Agent Desk</span>
            </Link>
            <Link
              href="/admin/dashboard"
              className="hover:text-slate-300 transition-colors"
            >
              Brand Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Load SaaS platform data
  const platformData = await getSuperPlatformData();

  return <SuperAdminClient initialData={platformData} />;
}
