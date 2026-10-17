"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  Search,
  ArrowLeft,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTeamMembers } from "@/app/actions/team";
import { logoutUser } from "@/app/actions/auth";
import { TeamMember } from "@/data/teamStore";
import { CreateAgentModal } from "@/components/admin/CreateAgentModal";
import { CommandMenuTrigger } from "@/components/CommandMenuTrigger";

export default function AdminTeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "agent">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadMembers() {
      try {
        const members = await getTeamMembers();
        setTeamMembers(members);
      } catch (err) {
        console.error("Failed to load team members:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMembers();
  }, []);

  const handleMemberCreated = (newMember: TeamMember) => {
    setTeamMembers((prev) => [newMember, ...prev.filter((m) => m.id !== newMember.id)]);
  };

  const filteredMembers = teamMembers.filter((m) => {
    const matchesRole = filterRole === "all" || m.role === filterRole;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.fullName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col font-sans text-zinc-900">
      {/* Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <LifeBuoy className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 tracking-tight text-sm block leading-tight">
                  mellowDesk Admin
                </span>
                <span className="text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 px-1.5 py-0.5 rounded-full">
                  Team Management
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">
                Workspace Roles &amp; Permissions
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <CommandMenuTrigger />

            <Link
              href="/admin/dashboard"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/70 px-2.5 py-1.5 rounded-md transition-colors border border-zinc-200/80"
            >
              <ArrowLeft className="h-3 w-3 text-zinc-400" />
              <span>Admin Dashboard</span>
            </Link>

            <Link
              href="/admin/settings"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/70 px-2.5 py-1.5 rounded-md transition-colors border border-zinc-200/80"
            >
              <Settings className="h-3 w-3 text-zinc-400" />
              <span>Settings</span>
            </Link>

            <Link
              href="/"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/70 px-2.5 py-1.5 rounded-md transition-colors border border-zinc-200/80"
            >
              <span>Agent Desk</span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </Link>

            <form action={logoutUser} className="inline-flex">
              <button
                type="submit"
                title="Sign Out"
                className="text-xs font-medium text-zinc-500 hover:text-rose-600 flex items-center gap-1 bg-zinc-100 hover:bg-rose-50 px-2 py-1.5 rounded-md transition-colors border border-zinc-200/80 cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                <span>Logout</span>
              </button>
            </form>

            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5 h-8 px-3 rounded-lg inline-flex items-center transition-colors shadow-2xs cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Provision Member</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                Workspace Agents &amp; Roles
              </h1>
              <span className="text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 px-2 py-0.5 rounded-full">
                {teamMembers.length} Members
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-xl">
              Control which team members have access to your brand workspace. Admins have complete control over brand settings, while Agents can answer customer tickets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5 h-8.5 px-3.5 rounded-lg inline-flex items-center transition-colors shadow-2xs cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Provision Member</span>
            </button>
          </div>
        </div>

        {/* 1. TOP KPI BENTO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Team */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-2xs hover:border-zinc-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Total Team</span>
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums mt-3">
              {teamMembers.length}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Active Workspace</span>
              <span className="font-medium text-zinc-700">Provisioned</span>
            </div>
          </div>

          {/* Card 2: Administrators */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-2xs hover:border-zinc-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Administrators</span>
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums mt-3">
              {teamMembers.filter((m) => m.role === "admin").length}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Permissions</span>
              <span className="font-medium text-zinc-700">Full Access</span>
            </div>
          </div>

          {/* Card 3: Support Agents */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-2xs hover:border-zinc-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Support Agents</span>
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums mt-3">
              {teamMembers.filter((m) => m.role === "agent").length}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Queue Operators</span>
              <span className="font-medium text-zinc-700">Ticket Desk</span>
            </div>
          </div>

          {/* Card 4: Active Seats */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-2xs hover:border-zinc-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">Active Seats</span>
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums mt-3">
              {teamMembers.filter((m) => m.isActive !== false).length}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Seat Status</span>
              <span className="font-medium text-emerald-600">100% Active</span>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800 placeholder:text-zinc-400 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/80 text-xs">
              <button
                onClick={() => setFilterRole("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filterRole === "all"
                    ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                All ({teamMembers.length})
              </button>
              <button
                onClick={() => setFilterRole("admin")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filterRole === "admin"
                    ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Admins ({teamMembers.filter((m) => m.role === "admin").length})
              </button>
              <button
                onClick={() => setFilterRole("agent")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  filterRole === "agent"
                    ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                Agents ({teamMembers.filter((m) => m.role === "agent").length})
              </button>
            </div>
          </div>
        </div>

        {/* 2. TEAM MEMBERS TABLE */}
        <div className="bg-white border border-zinc-200/80 rounded-xl shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
              <span>Loading team members...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 space-y-2">
              <Users className="h-8 w-8 mx-auto text-zinc-300" />
              <div className="text-sm font-semibold text-zinc-700">No team members found</div>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No members match the current search or filter. Provision a new agent or administrator using the button above.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider select-none">
                  <th className="py-2.5 px-5">Team Member</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Tenant Scope</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-5 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {filteredMembers.map((member) => {
                  const isAdmin = member.role === "admin";
                  const initials = member.fullName
                    ? member.fullName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "U";

                  return (
                    <tr
                      key={member.id}
                      className="h-11 hover:bg-zinc-50/70 transition-colors border-b border-zinc-100 last:border-0"
                    >
                      {/* Member Info */}
                      <td className="py-2 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-900 text-white text-[11px] font-medium flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium text-zinc-900 leading-tight">
                              {member.fullName}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono leading-tight">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-2 px-4 whitespace-nowrap">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                            <ShieldCheck className="h-3 w-3 text-zinc-600" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                            <span>Agent</span>
                          </span>
                        )}
                      </td>

                      {/* Tenant Scope */}
                      <td className="py-2 px-4 whitespace-nowrap text-zinc-500 text-[11px] font-mono">
                        <span className="bg-zinc-100 border border-zinc-200/80 px-2 py-0.5 rounded-md text-[10px] text-zinc-600">
                          {member.workspaceId ? `ws-${member.workspaceId.slice(0, 8)}...` : "active-tenant"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-2 px-5 text-right whitespace-nowrap text-[11px] text-zinc-400">
                        {new Date(member.createdAt).toLocaleDateString([], {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Provision Member Modal */}
      <CreateAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMemberCreated={handleMemberCreated}
      />
    </div>
  );
}
