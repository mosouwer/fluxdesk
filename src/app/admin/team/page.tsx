"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  ExternalLink,
  Search,
  ArrowLeft,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getTeamMembers } from "@/app/actions/team";
import { logoutUser } from "@/app/actions/auth";
import { TeamMember } from "@/data/teamStore";
import { CreateAgentModal } from "@/components/admin/CreateAgentModal";

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
                <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded">
                  Team Management
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Workspace Roles &amp; Permissions
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <ArrowLeft className="h-3 w-3 text-slate-400" />
              <span>Admin Dashboard</span>
            </Link>

            <Link
              href="/admin/settings"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <Settings className="h-3 w-3 text-slate-400" />
              <span>Settings</span>
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

            <Button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8.5 px-3.5 shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Provision Member</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Workspace Agents &amp; Roles
              </h1>
              <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {teamMembers.length} Members
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-xl">
              Control which team members have access to your brand workspace. Admins have complete control over brand settings, while Agents can answer customer tickets and use macros.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-9 px-4 shadow-xs"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>+ Provision Member</span>
            </Button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full h-8.5 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setFilterRole("all")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterRole === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Roles ({teamMembers.length})
              </button>
              <button
                onClick={() => setFilterRole("admin")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterRole === "admin"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Admins ({teamMembers.filter((m) => m.role === "admin").length})
              </button>
              <button
                onClick={() => setFilterRole("agent")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filterRole === "agent"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Agents ({teamMembers.filter((m) => m.role === "agent").length})
              </button>
            </div>
          </div>
        </div>

        {/* Team Members Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span>Loading team members...</span>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Users className="h-8 w-8 mx-auto text-slate-300" />
              <div className="text-sm font-semibold text-slate-700">No team members found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No members match the current search or filter. Provision a new agent or administrator using the button above.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                  <th className="py-3 px-5">Team Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Tenant Scope</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMembers.map((member) => {
                  const isAdmin = member.role === "admin";

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Member Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={member.avatarUrl}
                            fallback={member.fullName[0]}
                            size="sm"
                            className="h-8 w-8 rounded-full border border-slate-200"
                          />
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">
                              {member.fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono leading-tight mt-0.5">
                              {member.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                            <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                            <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                            <span>Agent</span>
                          </span>
                        )}
                      </td>

                      {/* Tenant Scope */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px] font-mono">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-600">
                          {member.workspaceId ? `ws-${member.workspaceId.slice(0, 8)}...` : "active-tenant"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap text-[11px] text-slate-400">
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
