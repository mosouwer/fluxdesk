"use client";

import React, { useState } from "react";
import {
  UserPlus,
  X,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  UserCheck,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBrandUser } from "@/app/actions/auth-team";
import { TeamMember } from "@/data/teamStore";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberCreated: (member: TeamMember) => void;
}

export function CreateAgentModal({
  isOpen,
  onClose,
  onMemberCreated,
}: CreateAgentModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success state showing credentials with copy button
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setErrorMessage("Please enter the user's full name.");
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

    setIsSubmitting(true);

    try {
      const res = await createBrandUser({
        fullName: cleanName,
        email: cleanEmail,
        password,
        role,
      });

      if (!res.success || !res.member) {
        setErrorMessage(res.error || "Failed to provision team member.");
        setIsSubmitting(false);
        return;
      }

      onMemberCreated(res.member);
      setCreatedCredentials({
        email: cleanEmail,
        password,
        role,
      });
      setIsSubmitting(false);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `mellowDesk Login Credentials:\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}\nRole: ${createdCredentials.role}\nPortal URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetAndClose = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setRole("agent");
    setCreatedCredentials(null);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {createdCredentials ? "Team Member Provisioned" : "Provision Team Member"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {createdCredentials
                  ? "Share credentials with your new team member"
                  : "Create agent or admin with full credentials"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success View */}
        {createdCredentials ? (
          <div className="p-6 space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Account Created Successfully!</span>
              </div>
              <p className="text-[11px] text-emerald-700">
                The account has been created in your workspace authentication directory. Give these credentials to the user.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">
                  Email
                </span>
                <span className="text-slate-900 font-semibold">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">
                  Temporary Password
                </span>
                <span className="text-blue-700 font-bold">{createdCredentials.password}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">
                  Assigned Role
                </span>
                <span className="text-slate-700 capitalize font-sans font-medium">
                  {createdCredentials.role}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 h-9 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied Credentials</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Login Credentials</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleResetAndClose}
                className="h-9 text-xs font-medium"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Create Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="elena@acme.com"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 bg-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Generate</span>
                </button>
              </div>
              <div className="relative rounded-md shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-3.5 w-3.5" />
                </div>
                <input
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
            </div>

            {/* Role Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assigned Role <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Agent Option */}
                <label
                  onClick={() => setRole("agent")}
                  className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all ${
                    role === "agent"
                      ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">Agent</span>
                    </div>
                    <input
                      type="radio"
                      name="memberRole"
                      checked={role === "agent"}
                      onChange={() => setRole("agent")}
                      className="text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Handle tickets, customer replies, and knowledge base.
                  </p>
                </label>

                {/* Admin Option */}
                <label
                  onClick={() => setRole("admin")}
                  className={`cursor-pointer rounded-xl border p-3 flex flex-col justify-between transition-all ${
                    role === "admin"
                      ? "border-purple-500 bg-purple-50/60 ring-1 ring-purple-500 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-bold text-slate-900">Admin</span>
                    </div>
                    <input
                      type="radio"
                      name="memberRole"
                      checked={role === "admin"}
                      onChange={() => setRole("admin")}
                      className="text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Full workspace settings, team provisioning &amp; widgets.
                  </p>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetAndClose}
                disabled={isSubmitting}
                className="h-8.5 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-8.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 px-4 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Create User</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
