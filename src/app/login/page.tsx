"use client";

import React, { useState } from "react";
import Link from "next/link";
import { loginUser } from "@/app/actions/auth-team";
import {
  Lock,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Users,
  ChevronDown,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

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
    <div className="min-h-screen bg-[#edf2f7] flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      {/* Centered Dual-Pane Login Card */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/60 grid grid-cols-1 lg:grid-cols-2">
        {/* ================= LEFT COLUMN: LOGIN FORM ================= */}
        <div className="p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-white">
          <div>
            {/* Brand Logo Header */}
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <span className="h-2 w-2 rounded-full bg-white block" />
              </div>
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                dotwork
              </span>
            </div>

            {/* Page Title & Subtitle */}
            <div className="mt-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Log in to your Account
              </h1>
              <p className="text-xs text-slate-500 mt-2 font-normal">
                Welcome back! Select method to log in:
              </p>
            </div>

            {/* Social Logins: Google & Facebook */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              {/* Google Button */}
              <button
                type="button"
                onClick={() => handleRoleLogin("admin")}
                disabled={isLoading !== null}
                className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/80 hover:border-slate-300 transition-colors duration-100 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs"
                title="Sign in with Google (Demo Admin)"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              {/* Facebook Button */}
              <button
                type="button"
                onClick={() => handleRoleLogin("agent")}
                disabled={isLoading !== null}
                className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/80 hover:border-slate-300 transition-colors duration-100 text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs"
                title="Sign in with Facebook (Demo Agent)"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
              </button>
            </div>

            {/* Divider: or continue with email */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/80" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-normal text-slate-400">
                or continue with email
              </span>
            </div>

            {/* Error Message Feedback */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleCredentialSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 transition-colors duration-100 bg-white"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 transition-colors duration-100 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => alert("Please contact your workspace admin to reset your credentials.")}
                  className="text-blue-600 font-medium hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Primary Log In Button */}
              <button
                type="submit"
                disabled={isLoading !== null}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-medium text-xs sm:text-sm rounded-xl shadow-md transition-colors duration-100 cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {isLoading === "credentials" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Log In</span>
                )}
              </button>
            </form>
          </div>

          {/* Bottom Link: Create an Account & Demo Quick Selector */}
          <div className="mt-8 pt-4 border-t border-slate-100 space-y-3">
            <p className="text-center text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link href="/onboard" className="text-blue-600 font-semibold hover:underline">
                Create an account
              </Link>
            </p>

            {/* Quick Demo Access Switcher for Testers */}
            <div className="relative text-center">
              <button
                type="button"
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <span>Quick demo identities</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {showDemoMenu && (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-200/80 rounded-xl shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-left">
                  <button
                    type="button"
                    onClick={() => handleRoleLogin("admin")}
                    disabled={isLoading !== null}
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">Admin</div>
                    <div className="text-[10px] text-slate-400 truncate">Alex Vance</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleLogin("agent")}
                    disabled={isLoading !== null}
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">Agent</div>
                    <div className="text-[10px] text-slate-400 truncate">Sarah Connor</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleLogin("customer")}
                    disabled={isLoading !== null}
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">Customer</div>
                    <div className="text-[10px] text-slate-400 truncate">Emily Watson</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleLogin("superadmin")}
                    disabled={isLoading !== null}
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-800 text-[11px]">Super</div>
                    <div className="text-[10px] text-slate-400 truncate">Root Admin</div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: VISUAL SHOWCASE ================= */}
        <div className="relative bg-[#0c66e4] p-8 sm:p-12 lg:p-14 flex flex-col justify-between items-center text-white overflow-hidden min-h-[480px]">
          {/* Concentric Subtle Background Circles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[420px] h-[420px] rounded-full bg-white/5 border border-white/10" />
            <div className="absolute w-[300px] h-[300px] rounded-full bg-white/5 border border-white/10" />
            <div className="absolute w-[180px] h-[180px] rounded-full bg-white/5" />
          </div>

          {/* Central Illustrated Integration Diagram & Dashboard Preview */}
          <div className="relative z-10 w-full flex-1 flex items-center justify-center my-6">
            <div className="relative flex items-center">
              {/* Three Left Integration Node Badges */}
              <div className="flex flex-col gap-5 z-20">
                {/* 1. Slack Badge */}
                <div className="w-11 h-11 rounded-full bg-white shadow-xl flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#E01E5A"
                      d="M5.04 14.28a2.52 2.52 0 0 1-2.52-2.52c0-1.39 1.13-2.52 2.52-2.52h2.52v2.52c0 1.39-1.13 2.52-2.52 2.52zm1.26 0a2.52 2.52 0 0 1 2.52-2.52 2.52 2.52 0 0 1 2.52 2.52v6.3a2.52 2.52 0 0 1-2.52 2.52 2.52 2.52 0 0 1-2.52-2.52v-6.3z"
                    />
                    <path
                      fill="#36C5F0"
                      d="M9.72 5.04a2.52 2.52 0 0 1-2.52-2.52c0-1.39 1.13-2.52 2.52-2.52s2.52 1.13 2.52 2.52v2.52H9.72zm0 1.26a2.52 2.52 0 0 1 2.52 2.52 2.52 2.52 0 0 1-2.52 2.52H3.42A2.52 2.52 0 0 1 .9 8.82c0-1.39 1.13-2.52 2.52-2.52h6.3z"
                    />
                    <path
                      fill="#2EB67D"
                      d="M18.96 9.72a2.52 2.52 0 0 1 2.52 2.52c0 1.39-1.13 2.52-2.52 2.52h-2.52V12.24c0-1.39 1.13-2.52 2.52-2.52zm-1.26 0a2.52 2.52 0 0 1-2.52 2.52 2.52 2.52 0 0 1-2.52-2.52V3.42A2.52 2.52 0 0 1 15.18.9c1.39 0 2.52 1.13 2.52 2.52v6.3z"
                    />
                    <path
                      fill="#ECB22E"
                      d="M14.28 18.96a2.52 2.52 0 0 1 2.52 2.52c0 1.39-1.13 2.52-2.52 2.52s-2.52-1.13-2.52-2.52v-2.52h2.52zm0-1.26a2.52 2.52 0 0 1-2.52-2.52 2.52 2.52 0 0 1 2.52-2.52h6.3a2.52 2.52 0 0 1 2.52 2.52 2.52 2.52 0 0 1-2.52 2.52h-6.3z"
                    />
                  </svg>
                </div>

                {/* 2. Brand Dotwork Badge */}
                <div className="w-11 h-11 rounded-full bg-blue-600 ring-3 ring-white/30 shadow-xl flex items-center justify-center">
                  <div className="h-5 w-5 rounded-md border-2 border-white flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-white block" />
                  </div>
                </div>

                {/* 3. Google Badge */}
                <div className="w-11 h-11 rounded-full bg-white shadow-xl flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
              </div>

              {/* Connecting Pipeline Diagram (SVG) */}
              <div className="w-16 h-40 relative flex items-center justify-center -mx-1 pointer-events-none z-10">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 64 160"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Top branch line */}
                  <path
                    d="M0 24 H32 Q44 24 44 36 V80"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Middle straight line */}
                  <path
                    d="M0 80 H64"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Bottom branch line */}
                  <path
                    d="M0 136 H32 Q44 136 44 124 V80"
                    stroke="rgba(255,255,255,0.45)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>

              {/* White Dashboard Window Card Preview */}
              <div className="w-56 sm:w-64 bg-white rounded-2xl shadow-2xl p-4 text-slate-800 z-20 transform transition-transform duration-300">
                {/* Window Dots Header */}
                <div className="flex items-center gap-1.5 pb-3">
                  <span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
                  <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                  <span className="h-2 w-2 rounded-full bg-[#27c93f]" />
                </div>

                {/* Skeleton Header Bars */}
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="h-2.5 w-16 bg-slate-200 rounded-full" />
                  <div className="h-2.5 w-12 bg-slate-100 rounded-full" />
                </div>

                {/* 3 Contact / Ticket Rows */}
                <div className="space-y-3">
                  {/* Row 1 */}
                  <div className="flex items-center gap-2.5 p-1.5 rounded-lg bg-slate-50/80 border border-slate-100">
                    <Avatar
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
                      fallback="E"
                      size="sm"
                      className="h-6 w-6 text-[10px]"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="h-2 bg-slate-300 rounded-full w-20" />
                      <div className="h-1.5 bg-slate-200 rounded-full w-12" />
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="flex items-center gap-2.5 p-1.5 rounded-lg bg-slate-50/80 border border-slate-100">
                    <Avatar
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                      fallback="M"
                      size="sm"
                      className="h-6 w-6 text-[10px]"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="h-2 bg-slate-300 rounded-full w-16" />
                      <div className="h-1.5 bg-slate-200 rounded-full w-24" />
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="flex items-center gap-2.5 p-1.5 rounded-lg bg-slate-50/80 border border-slate-100">
                    <Avatar
                      src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80"
                      fallback="J"
                      size="sm"
                      className="h-6 w-6 text-[10px]"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="h-2 bg-slate-300 rounded-full w-20" />
                      <div className="h-1.5 bg-slate-200 rounded-full w-14" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column Bottom Text & Pagination Indicators */}
          <div className="relative z-10 text-center space-y-3 max-w-sm">
            <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
              Connect with every application.
            </h2>
            <p className="text-xs text-blue-100/90 leading-relaxed font-normal">
              Everything you need in an easily customizable dashboard.
            </p>

            {/* Pagination Dots */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <span className="h-1.5 w-3.5 rounded-full bg-white block" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 block" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/40 block" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
