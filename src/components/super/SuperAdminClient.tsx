"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Shield,
  Building2,
  Users,
  Ticket,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
  Unlock,
  Key,
  Trash2,
  Edit,
  Eye,
  LogOut,
  ChevronRight,
  Filter,
  Copy,
  Check,
  PlusCircle,
  Sliders,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { logoutUser } from "@/app/actions/auth";
import {
  SuperAdminPlatformData,
  SuperAdminBusinessView,
  SuperAdminUserView,
  toggleUserStatusAction,
  updateUserRoleAction,
  resetUserPasswordAction,
  deleteUserAction,
  toggleBusinessStatusAction,
  updateBusinessAction,
  deleteBusinessAction,
  switchActiveWorkspaceAction,
} from "@/app/actions/superadmin";

interface SuperAdminClientProps {
  initialData: SuperAdminPlatformData;
}

export function SuperAdminClient({ initialData }: SuperAdminClientProps) {
  const [data, setData] = useState<SuperAdminPlatformData>(initialData);
  const [activeTab, setActiveTab] = useState<"businesses" | "users" | "security">("businesses");
  const [isPending, startTransition] = useTransition();

  // Search & Filter state for Businesses
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessStatusFilter, setBusinessStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // Search & Filter state for Users
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "disabled">("all");

  // Modals & Feedback
  const [passwordModalData, setPasswordModalData] = useState<{
    user: SuperAdminUserView;
    newPass: string;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

  const [editBusiness, setEditBusiness] = useState<SuperAdminBusinessView | null>(null);
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editBusinessColor, setEditBusinessColor] = useState("");
  const [editBusinessTier, setEditBusinessTier] = useState<"Free" | "Starter" | "Pro" | "Enterprise VIP">("Pro");

  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Filtered Businesses
  const filteredBusinesses = data.businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(businessSearch.toLowerCase()) ||
      b.slug.toLowerCase().includes(businessSearch.toLowerCase()) ||
      (b.ownerEmail && b.ownerEmail.toLowerCase().includes(businessSearch.toLowerCase()));

    const matchesStatus =
      businessStatusFilter === "all" || b.status === businessStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtered Users
  const filteredUsers = data.users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.workspaceName.toLowerCase().includes(userSearch.toLowerCase());

    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;

    const matchesStatus =
      userStatusFilter === "all"
        ? true
        : userStatusFilter === "active"
        ? u.isActive
        : !u.isActive;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Action Handlers
  const handleToggleUserStatus = (userId: string, currentActive: boolean) => {
    const targetState = !currentActive;
    startTransition(async () => {
      try {
        await toggleUserStatusAction(userId, targetState);
        setData((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId ? { ...u, isActive: targetState } : u
          ),
          stats: {
            ...prev.stats,
            activeUsers: targetState ? prev.stats.activeUsers + 1 : prev.stats.activeUsers - 1,
            disabledUsers: targetState ? prev.stats.disabledUsers - 1 : prev.stats.disabledUsers + 1,
          },
        }));
        showToast(`User account ${targetState ? "enabled" : "disabled"} successfully.`);
      } catch (err: any) {
        showToast(err?.message || "Failed to toggle user status", "error");
      }
    });
  };

  const handleUpdateUserRole = (userId: string, newRole: any) => {
    startTransition(async () => {
      try {
        await updateUserRoleAction(userId, newRole);
        setData((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
        }));
        showToast(`User role updated to ${newRole}.`);
      } catch (err: any) {
        showToast(err?.message || "Failed to update role", "error");
      }
    });
  };

  const handleResetPassword = (user: SuperAdminUserView) => {
    startTransition(async () => {
      try {
        const res = await resetUserPasswordAction(user.id);
        if (res.success && res.newPassword) {
          setPasswordModalData({ user, newPass: res.newPassword });
          setCopiedPass(false);
          showToast(`Password generated for ${user.email}.`);
        }
      } catch (err: any) {
        showToast(err?.message || "Failed to reset password", "error");
      }
    });
  };

  const handleDeleteUser = (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to permanently delete user ${userEmail}?`)) return;

    startTransition(async () => {
      try {
        await deleteUserAction(userId);
        setData((prev) => ({
          ...prev,
          users: prev.users.filter((u) => u.id !== userId),
          stats: { ...prev.stats, totalUsers: prev.stats.totalUsers - 1 },
        }));
        showToast(`User ${userEmail} deleted.`);
      } catch (err: any) {
        showToast(err?.message || "Failed to delete user", "error");
      }
    });
  };

  const handleToggleBusinessStatus = (workspaceId: string, currentStatus: "active" | "suspended") => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    startTransition(async () => {
      try {
        await toggleBusinessStatusAction(workspaceId, nextStatus);
        setData((prev) => ({
          ...prev,
          businesses: prev.businesses.map((b) =>
            b.id === workspaceId ? { ...b, status: nextStatus } : b
          ),
          stats: {
            ...prev.stats,
            activeBusinesses: nextStatus === "active" ? prev.stats.activeBusinesses + 1 : prev.stats.activeBusinesses - 1,
            suspendedBusinesses: nextStatus === "suspended" ? prev.stats.suspendedBusinesses + 1 : prev.stats.suspendedBusinesses - 1,
          },
        }));
        showToast(`Business ${nextStatus === "active" ? "reactivated" : "suspended"}.`);
      } catch (err: any) {
        showToast(err?.message || "Failed to update business status", "error");
      }
    });
  };

  const handleSaveBusiness = () => {
    if (!editBusiness) return;
    startTransition(async () => {
      try {
        await updateBusinessAction(editBusiness.id, {
          name: editBusinessName.trim() || editBusiness.name,
          brandColor: editBusinessColor || editBusiness.brandColor,
          tier: editBusinessTier,
        });
        setData((prev) => ({
          ...prev,
          businesses: prev.businesses.map((b) =>
            b.id === editBusiness.id
              ? {
                  ...b,
                  name: editBusinessName.trim() || b.name,
                  brandColor: editBusinessColor || b.brandColor,
                  tier: editBusinessTier,
                }
              : b
          ),
        }));
        setEditBusiness(null);
        showToast("Business details updated successfully.");
      } catch (err: any) {
        showToast(err?.message || "Failed to update business", "error");
      }
    });
  };

  const handleSwitchWorkspace = (workspaceId: string, workspaceName: string) => {
    startTransition(async () => {
      try {
        await switchActiveWorkspaceAction(workspaceId);
        showToast(`Switched active view to ${workspaceName}. Redirecting...`);
        setTimeout(() => {
          window.location.href = "/admin/dashboard";
        }, 800);
      } catch (err: any) {
        showToast(err?.message || "Failed to switch workspace", "error");
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Super Admin Top Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">
                  mellowDesk Root
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                SaaS Owner Multi-Tenant Authority & Control Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/agent">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <span>Agent Desk</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>

            <Link href="/admin/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
              >
                <span>Brand Admin</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>

            <form action={logoutUser} className="inline-flex">
              <button
                type="submit"
                title="Sign out of Super Admin"
                className="h-8 px-2.5 rounded-md text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in duration-200 ${
              toastMessage.type === "success"
                ? "bg-emerald-950/80 border-emerald-800/80 text-emerald-200"
                : "bg-rose-950/80 border-rose-800/80 text-rose-200"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Global SaaS KPI Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Businesses</span>
              <Building2 className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white">{data.stats.totalBusinesses}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">{data.stats.activeBusinesses} active</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{data.stats.suspendedBusinesses} suspended</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
              <Users className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white">{data.stats.totalUsers}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">{data.stats.activeUsers} enabled</span>
              <span>•</span>
              <span className="text-rose-400 font-semibold">{data.stats.disabledUsers} disabled</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">SaaS Total Tickets</span>
              <Ticket className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">{data.stats.totalTickets}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-amber-400 font-semibold">{data.stats.openTickets} open</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">{data.stats.solvedTickets} resolved</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Multi-Tenant Status</span>
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 flex items-center gap-1.5">
              <span>Healthy</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              RLS Isolation & Policies Active
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("businesses")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "businesses"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Businesses & Tenants ({data.businesses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>All Platform Users ({data.users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>SaaS Authority & Security</span>
          </button>
        </div>

        {/* TAB 1: BUSINESSES & TENANTS */}
        {activeTab === "businesses" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search businesses by name, slug, email..."
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={businessStatusFilter}
                  onChange={(e) => setBusinessStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>
            </div>

            {/* Businesses Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">Business / Brand</th>
                      <th className="py-3.5 px-4">Plan Tier</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Metrics</th>
                      <th className="py-3.5 px-4">Created</th>
                      <th className="py-3.5 px-4 text-right">Super Admin Authority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredBusinesses.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs"
                              style={{ backgroundColor: b.brandColor || "#2563eb" }}
                            >
                              {b.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-white">{b.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                /{b.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                            {b.tier}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {b.status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              Suspended
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-[11px] text-slate-300">
                            <strong>{b.totalTickets}</strong> tickets ({b.openTickets} open)
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {b.membersCount} team members
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Switch active workspace */}
                            <button
                              type="button"
                              onClick={() => handleSwitchWorkspace(b.id, b.name)}
                              title="View as Tenant"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {/* Edit details */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditBusiness(b);
                                setEditBusinessName(b.name);
                                setEditBusinessColor(b.brandColor || "#2563eb");
                                setEditBusinessTier(b.tier);
                              }}
                              title="Edit Business Details"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>

                            {/* Toggle Suspend */}
                            <button
                              type="button"
                              onClick={() => handleToggleBusinessStatus(b.id, b.status)}
                              title={b.status === "active" ? "Suspend Business" : "Activate Business"}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                b.status === "active"
                                  ? "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20"
                              }`}
                            >
                              {b.status === "active" ? (
                                <Lock className="h-3.5 w-3.5" />
                              ) : (
                                <Unlock className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MASTER USERS MANAGEMENT */}
        {activeTab === "users" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search users by name, email, brand..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Brand Admin</option>
                  <option value="agent">Staff Agent</option>
                  <option value="customer">Customer</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Business / Tenant</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Owner Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              src={u.avatarUrl}
                              fallback={u.name.charAt(0)}
                              size="sm"
                            />
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.role === "superadmin" && (
                                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                                    ROOT
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-200">
                            {u.workspaceName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                            disabled={isPending}
                            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-[11px] focus:outline-hidden cursor-pointer"
                          >
                            <option value="superadmin">Super Admin</option>
                            <option value="admin">Brand Admin</option>
                            <option value="agent">Agent</option>
                            <option value="customer">Customer</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Disable / Enable Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                              disabled={isPending || u.role === "superadmin"}
                              title={u.isActive ? "Disable User Account" : "Enable User Account"}
                              className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                u.isActive
                                  ? "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20"
                              } disabled:opacity-30 disabled:cursor-not-allowed`}
                            >
                              {u.isActive ? (
                                <>
                                  <Lock className="h-3 w-3" />
                                  <span>Disable</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="h-3 w-3" />
                                  <span>Enable</span>
                                </>
                              )}
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              onClick={() => handleResetPassword(u)}
                              disabled={isPending}
                              title="Reset Password"
                              className="h-7 px-2 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Key className="h-3 w-3" />
                              <span className="hidden sm:inline">Pass</span>
                            </button>

                            {/* Delete User */}
                            {u.role !== "superadmin" && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.email)}
                                disabled={isPending}
                                title="Delete User Permanently"
                                className="h-7 w-7 rounded-lg bg-slate-850 hover:bg-rose-950 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SAAS SECURITY & PLATFORM HEALTH */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm">
                <Shield className="h-5 w-5" />
                <span>Tenant Isolation & Row-Level Security</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                mellowDesk runs strict PostgreSQL Row-Level Security (RLS) policies enforcing complete tenant isolation.
                Cross-tenant queries are blocked at the database engine level via <code>auth_user_workspace_id()</code>.
              </p>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Tickets Table RLS</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Enforced
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Ticket Messages RLS</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Enforced
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Customer Internal Note Redaction</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Active
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm">
                <Sparkles className="h-5 w-5" />
                <span>Super Admin Root Credential Reference</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                As the SaaS Owner, you have complete root privileges over all tenant workspaces, brand admins, agents, and customer tickets.
              </p>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Root Account:</span>
                  <span className="font-mono text-slate-200">superadmin@fluxdesk.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Authority Level:</span>
                  <span className="font-semibold text-indigo-400">Platform Super Admin</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Scope:</span>
                  <span className="text-slate-300">All Multi-Tenant Workspaces</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Password Reset Modal */}
      {passwordModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-base">
              <Key className="h-5 w-5" />
              <span>Password Generated</span>
            </div>
            <p className="text-xs text-slate-400">
              New credentials generated for user{" "}
              <strong className="text-white">{passwordModalData.user.email}</strong>:
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-indigo-300 flex items-center justify-between select-all">
              <span>{passwordModalData.newPass}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(passwordModalData.newPass);
                  setCopiedPass(true);
                  setTimeout(() => setCopiedPass(false), 2000);
                }}
                className="text-xs text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                {copiedPass ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setPasswordModalData(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {editBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Building2 className="h-5 w-5 text-indigo-400" />
                <span>Edit Business Settings</span>
              </div>
              <button
                onClick={() => setEditBusiness(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Business Name</label>
                <input
                  type="text"
                  value={editBusinessName}
                  onChange={(e) => setEditBusinessName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Brand Color (Hex)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editBusinessColor}
                    onChange={(e) => setEditBusinessColor(e.target.value)}
                    className="h-8 w-10 rounded bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editBusinessColor}
                    onChange={(e) => setEditBusinessColor(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Plan Tier</label>
                <select
                  value={editBusinessTier}
                  onChange={(e) => setEditBusinessTier(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-hidden cursor-pointer"
                >
                  <option value="Free">Free</option>
                  <option value="Starter">Starter</option>
                  <option value="Pro">Pro</option>
                  <option value="Enterprise VIP">Enterprise VIP</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditBusiness(null)}
                className="border-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveBusiness}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
