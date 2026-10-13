"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onboardBrandWithAccount } from "@/app/actions/auth-team";
import { sanitizeSlug } from "@/lib/slug";
import {
  LifeBuoy,
  Building2,
  Globe,
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OnboardPage() {
  const router = useRouter();

  const [brandName, setBrandName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBrandNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setBrandName(newName);
    if (!isSlugManuallyEdited) {
      setSlug(sanitizeSlug(newName));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(sanitizeSlug(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);

    const cleanBrand = brandName.trim();
    const cleanAdminName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanSlug = sanitizeSlug(slug || cleanBrand);

    if (!cleanBrand) {
      setErrorMessage("Please enter your Company or Brand Name.");
      return;
    }

    if (!cleanAdminName) {
      setErrorMessage("Please enter your Admin Full Name.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (!cleanSlug || cleanSlug.length < 2) {
      setErrorMessage("Workspace slug must be at least 2 alphanumeric characters or hyphens.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await onboardBrandWithAccount({
        brandName: cleanBrand,
        slug: cleanSlug,
        fullName: cleanAdminName,
        email: cleanEmail,
        password,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to create brand workspace. Please try again.");
        setIsLoading(false);
        return;
      }

      // Success: redirect to target dashboard
      router.push(result.redirectUrl || "/admin/dashboard");
    } catch (err: any) {
      if (err?.digest?.includes("NEXT_REDIRECT")) {
        // Redirection in progress
        return;
      }
      setErrorMessage(err?.message || "An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-800">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-blue-600 text-white shadow-md mb-3">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Create Your Brand Workspace
        </h1>
        <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
          Set up an isolated multi-tenant support desk and create your administrator account in seconds.
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-sm border border-slate-200/80 rounded-2xl">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in duration-200">
              <span className="font-semibold shrink-0">Error:</span>
              <span className="flex-1 leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company / Brand Name */}
            <div>
              <label
                htmlFor="brandName"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Company / Brand Name <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="h-4 w-4" />
                </div>
                <input
                  id="brandName"
                  type="text"
                  required
                  value={brandName}
                  onChange={handleBrandNameChange}
                  placeholder="Acme Cloud Technologies"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>

            {/* Workspace Slug */}
            <div>
              <label
                htmlFor="slug"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Workspace Subdomain Slug <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Globe className="h-4 w-4" />
                </div>
                <input
                  id="slug"
                  type="text"
                  required
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="acme-support"
                  className="block w-full pl-9 pr-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Tenant Portal:{" "}
                <span className="font-mono text-blue-600 font-semibold">
                  {slug ? `${slug}.fluxdesk.io` : "acme-support.fluxdesk.io"}
                </span>
              </p>
            </div>

            {/* Admin Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Admin Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Vance"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>

            {/* Admin Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Admin Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.admin@acme.com"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>

            {/* Admin Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Minimum 6 characters for administrative account protection.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="pt-2 pb-1 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Isolated tenant workspace with Row-Level Security</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Full access to Admin Panel, team provisioning &amp; widget settings</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Brand Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Register Brand &amp; Admin</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-semibold">
              Sign In to Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
