"use client";

import React, { useState } from "react";
import Link from "next/link";
import { loginUser } from "@/app/actions/auth-team";
import {
  LifeBuoy,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleLogin = async (role: "superadmin" | "admin" | "agent" | "customer") => {
    setErrorMessage(null);
    setIsLoading(role);
    try {
      await loginUser(role);
    } catch (err: any) {
      if (err?.digest?.includes("NEXT_REDIRECT")) {
        return;
      }
      setIsLoading(null);
    }
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isLoading) return;

    setErrorMessage(null);
    setIsLoading("credentials");

    try {
      const result = await loginUser({
        email: email.trim(),
        password: password,
      });

      if (result && !result.success) {
        setErrorMessage(result.error || "Invalid email or password.");
        setIsLoading(null);
      }
    } catch (err: any) {
      if (err?.digest?.includes("NEXT_REDIRECT")) {
        return;
      }
      setErrorMessage(err?.message || "Login failed. Please check your credentials.");
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-800">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 text-white shadow-md mb-3">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Sign In to FluxDesk
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 max-w-md mx-auto">
          Enter your email and password, or select a demo role. Brand administrators have full access to the Admin Panel.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl space-y-6">
        {/* Email & Password Credential Login */}
        <div className="bg-white p-6 sm:p-7 shadow-sm border border-slate-200/80 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Sign In with Account Credentials
            </h2>
            <Link
              href="/onboard"
              className="text-[11px] text-blue-600 font-semibold hover:underline"
            >
              + Register New Brand
            </Link>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCredentialSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
              </div>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!email.trim() || !password || isLoading !== null}
              className="w-full h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs gap-1.5"
            >
              {isLoading === "credentials" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Role-Based Quick Sign-In Cards (Instant Access) */}
        <div className="bg-white p-6 sm:p-7 shadow-sm border border-slate-200/80 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Or Select Demo Identity (1-Click)
            </h2>
            <span className="text-[11px] text-blue-600 font-medium">Instant Test Access</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Admin Option */}
            <div className="border border-purple-200 bg-purple-50/30 hover:bg-purple-50/70 p-4 rounded-xl transition-all flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                      fallback="A"
                      size="sm"
                      className="h-8 w-8 rounded-full border border-purple-200"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Alex Vance</div>
                      <div className="text-[10px] text-slate-500">alex.admin@acmesupport.com</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                    <ShieldCheck className="h-3 w-3" />
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Full permissions: <strong>Admin Panel visible</strong>, team invites, and brand widget branding.
                </p>
              </div>

              <div className="pt-3 mt-2 border-t border-purple-100">
                <Button
                  onClick={() => handleRoleLogin("admin")}
                  disabled={isLoading !== null}
                  className="w-full h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-2xs"
                >
                  {isLoading === "admin" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Sign in as Admin</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 2. Agent Option */}
            <div className="border border-blue-200 bg-blue-50/30 hover:bg-blue-50/70 p-4 rounded-xl transition-all flex flex-col justify-between group">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                      fallback="S"
                      size="sm"
                      className="h-8 w-8 rounded-full border border-blue-200"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">Sarah Connor</div>
                      <div className="text-[10px] text-slate-500">sarah.agent@acmesupport.com</div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                    <UserCheck className="h-3 w-3" />
                    Agent
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-tight">
                  Standard staff: Handle support queue and messages. (<strong>Admin button hidden</strong>).
                </p>
              </div>

              <div className="pt-3 mt-2 border-t border-blue-100">
                <Button
                  onClick={() => handleRoleLogin("agent")}
                  disabled={isLoading !== null}
                  className="w-full h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-2xs"
                >
                  {isLoading === "agent" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>Sign in as Agent</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 3. Customer Option */}
          <div className="border border-slate-200 bg-slate-50/50 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"
                fallback="E"
                size="sm"
                className="h-7 w-7 rounded-full border border-slate-200"
              />
              <div>
                <div className="font-bold text-slate-900 text-xs">Emily Watson (Customer)</div>
                <div className="text-[10px] text-slate-500">Customer Portal &amp; Ticket Submissions</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRoleLogin("customer")}
              disabled={isLoading !== null}
              className="h-7 text-xs font-medium cursor-pointer"
            >
              Customer Portal
            </Button>
          </div>

          {/* 4. Super Admin (SaaS Owner) Option */}
          <div className="border border-indigo-200 bg-indigo-50/40 p-3.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                🛡️
              </div>
              <div>
                <div className="font-bold text-slate-900 text-xs">SaaS Owner (Root Super Admin)</div>
                <div className="text-[10px] text-indigo-700 font-medium">Global authority for all businesses &amp; users</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleRoleLogin("superadmin")}
              disabled={isLoading !== null}
              className="h-7 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer"
            >
              /super Console
            </Button>
          </div>
        </div>

        {/* Brand Onboarding Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 px-2 py-0.5 rounded-full text-blue-100">
              <Sparkles className="h-3 w-3 text-amber-300" />
              <span>Multi-Tenant Self-Serve</span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Need to onboard a new organization?
            </h3>
            <p className="text-xs text-blue-100/90 max-w-sm">
              Create an isolated brand workspace with dedicated sequential numbering, CSAT, and custom widget.
            </p>
          </div>

          <Link href="/onboard" className="shrink-0 w-full sm:w-auto">
            <Button className="w-full sm:w-auto h-9 text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-sm gap-1.5 px-4">
              <span>+ Onboard Brand</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
