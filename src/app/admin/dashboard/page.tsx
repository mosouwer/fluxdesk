import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSessionUser, logoutUser } from "@/app/actions/auth";
import { createClient, isLiveSupabaseConfigured } from "@/utils/supabase/server";
import { getAgentTickets } from "@/app/actions/tickets";
import { getTeamMembers } from "@/app/actions/team";
import { getActiveWorkspace } from "@/data/workspaceStore";
import { AVAILABLE_AGENTS } from "@/data/mockDeskData";
import { EmptyTicketsState } from "@/components/desk/EmptyTicketsState";
import { Ticket } from "@/types/desk";
import {
  LifeBuoy,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Archive,
  Star,
  Users,
  BarChart3,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Inbox,
  AlertTriangle,
  Sparkles,
  Settings,
  LogOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  let workspace = getActiveWorkspace();

  // 1. Verify user is an admin; show an access denied error otherwise
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser && !isLiveSupabaseConfigured) {
    redirect("/login");
  }

  let isAdmin = sessionUser?.role === "admin" || sessionUser?.role === "superadmin";
  let userRole = sessionUser?.role || "agent";

  let adminWorkspaceId = workspace.id;

  if (isLiveSupabaseConfigured) {
    try {
      const { adminClient, isAdminConfigured } = await import("@/utils/supabase/admin");
      const client = isAdminConfigured ? adminClient : await createClient();

      const lookupId = sessionUser?.id;

      if (lookupId) {
        const isUuid = (val: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        let userQuery = client.from("users").select("workspace_id, role");
        if (isUuid(lookupId)) {
          userQuery = userQuery.eq("id", lookupId);
        } else if (lookupId.includes("@")) {
          userQuery = userQuery.eq("email", lookupId.toLowerCase());
        } else {
          userQuery = userQuery.eq("id", lookupId);
        }

        const { data: profile } = await userQuery.maybeSingle();

        if (profile?.role) {
          userRole = profile.role;
          isAdmin = profile.role === "admin" || profile.role === "superadmin";
        }
        if (profile?.workspace_id) {
          adminWorkspaceId = profile.workspace_id;
        } else {
          const { data: latestWs } = await client
            .from("workspaces")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestWs?.id) {
            adminWorkspaceId = latestWs.id;
          }
        }

        if (adminWorkspaceId) {
          const { data: wsRecord } = await client
            .from("workspaces")
            .select("*")
            .eq("id", adminWorkspaceId)
            .maybeSingle();
          if (wsRecord) {
            workspace = {
              id: wsRecord.id,
              name: wsRecord.name,
              slug: wsRecord.slug,
              brandColor: wsRecord.brand_color || "#2563eb",
              welcomeTitle: wsRecord.welcome_title,
              welcomeSubtitle: wsRecord.welcome_subtitle,
              logoUrl: wsRecord.logo_url,
              createdAt: wsRecord.created_at,
            };
          }
        }
      }
    } catch {
      // In local mode, admin access is verified via sessionUser
    }
  }

  // Access Denied Screen if user is not an admin
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
              You must have the <strong>Admin</strong> role to access the Analytics &amp; CSAT Dashboard.
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

  // 2. Fetch Tickets and Team Members for Aggregate Metrics strictly scoped to workspace_id
  let tickets: Ticket[] = [];
  if (isLiveSupabaseConfigured && adminWorkspaceId) {
    try {
      const { adminClient, isAdminConfigured } = await import("@/utils/supabase/admin");
      const queryClient = isAdminConfigured ? adminClient : await createClient();
      const { data: dbTickets, error } = await queryClient
        .from("tickets")
        .select(`
          *,
          customer:profiles!customer_id(*),
          assignedAgent:profiles!assigned_agent_id(*),
          messages:ticket_messages(
            *,
            sender:profiles!sender_id(*)
          )
        `)
        .eq("workspace_id", adminWorkspaceId)
        .order("created_at", { ascending: false });

      if (!error && dbTickets && dbTickets.length > 0) {
        tickets = dbTickets.map((t: any) => ({
          id: t.id,
          number: t.ticket_number,
          subject: t.subject,
          description: t.description,
          status: t.status,
          priority: t.priority,
          channel: t.channel,
          customer: {
            id: t.customer?.id || t.customer_id,
            name: t.customer?.full_name || "Customer",
            email: t.customer?.email || "customer@example.com",
            phone: t.customer?.phone || t.metadata?.phone,
            avatar: t.customer?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.customer_id}`,
            role: "customer",
          },
          assignedAgent: t.assignedAgent
            ? {
                id: t.assignedAgent.id,
                name: t.assignedAgent.full_name,
                email: t.assignedAgent.email,
                avatar: t.assignedAgent.avatar_url,
                role: "agent",
              }
            : undefined,
          tags: t.tags || [],
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          slaDueMinutes: 90,
          messages: [],
          workspaceId: t.workspace_id,
          csatRating: t.csat_rating,
          csatFeedback: t.csat_feedback,
          ratedAt: t.rated_at,
        }));
      }
    } catch (dbErr) {
      console.warn("AdminDashboard tickets query error:", dbErr);
    }
  } else {
    tickets = await getAgentTickets(adminWorkspaceId || workspace.id);
  }
  const teamMembers = await getTeamMembers(workspace.id);

  // Combine team members with available mock agents to ensure all agents are reflected
  const combinedAgentsMap = new Map();
  teamMembers.forEach((m) => {
    combinedAgentsMap.set(m.email.toLowerCase(), {
      id: m.id,
      name: m.fullName,
      email: m.email,
      role: m.role,
      avatar: m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.email}`,
    });
  });
  AVAILABLE_AGENTS.forEach((a) => {
    if (!combinedAgentsMap.has(a.email.toLowerCase())) {
      combinedAgentsMap.set(a.email.toLowerCase(), a);
    }
  });
  const allAgents = Array.from(combinedAgentsMap.values());

  // Aggregate Metrics Calculations:
  // Card 1: Open / Pending tickets count
  const openPendingTickets = tickets.filter(
    (t) => t.status === "open" || t.status === "pending" || t.status === "on_hold"
  );
  const openPendingCount = openPendingTickets.length;

  // Card 2: Solved tickets count
  const solvedTickets = tickets.filter((t) => t.status === "solved");
  const solvedCount = solvedTickets.length;

  // Card 3: Closed tickets count
  const closedTickets = tickets.filter((t) => t.status === "closed");
  const closedCount = closedTickets.length;

  // Card 4: Average CSAT Rating (1 to 5)
  const ratedTickets = tickets.filter(
    (t) => typeof t.csatRating === "number" && t.csatRating >= 1 && t.csatRating <= 5
  );
  const totalCsatScore = ratedTickets.reduce((sum, t) => sum + (t.csatRating || 0), 0);
  const averageCsat =
    ratedTickets.length > 0 ? (totalCsatScore / ratedTickets.length).toFixed(1) : "5.0";

  // Per-Agent Workload Calculations:
  const totalAssignedTickets = tickets.filter((t) => !!t.assignedAgent).length;
  const unassignedCount = tickets.filter((t) => !t.assignedAgent).length;

  const agentWorkloadStats = allAgents.map((agent) => {
    const assignedTickets = tickets.filter(
      (t) =>
        t.assignedAgent?.id === agent.id ||
        t.assignedAgent?.email?.toLowerCase() === agent.email?.toLowerCase()
    );
    const count = assignedTickets.length;
    const sharePercent =
      totalAssignedTickets > 0 ? Math.round((count / totalAssignedTickets) * 100) : 0;
    const openCount = assignedTickets.filter(
      (t) => t.status === "open" || t.status === "pending" || t.status === "on_hold"
    ).length;
    const resolvedCount = assignedTickets.filter(
      (t) => t.status === "solved" || t.status === "closed"
    ).length;

    return {
      agent,
      count,
      sharePercent,
      openCount,
      resolvedCount,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col font-sans text-zinc-900">
      {/* Top Navigation */}
      <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200/80 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <LifeBuoy className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 tracking-tight text-sm block leading-tight">
                  FluxDesk Admin
                </span>
                <span className="text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 px-1.5 py-0.5 rounded-full">
                  Analytics &amp; CSAT
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">
                {workspace.name} &bull; /{workspace.slug}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/70 px-2.5 py-1.5 rounded-md transition-colors border border-zinc-200/80"
            >
              <span>Agent Desk</span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </Link>

            <Link
              href="/admin/team"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/70 px-2.5 py-1.5 rounded-md transition-colors border border-zinc-200/80"
            >
              <Users className="h-3 w-3 text-zinc-400" />
              <span>Team &amp; Roles</span>
            </Link>

            <Link
              href="/admin/settings"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/70 px-2.5 py-1.5 rounded-md transition-colors border border-zinc-200/80"
            >
              <Settings className="h-3 w-3 text-zinc-400" />
              <span>Settings</span>
            </Link>

            <Link
              href="/onboard"
              className="text-xs font-medium text-zinc-900 hover:text-zinc-700 flex items-center gap-1 bg-white hover:bg-zinc-50 px-2.5 py-1.5 rounded-md transition-colors border border-zinc-200/80 shadow-2xs"
            >
              <span>+ New Brand</span>
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
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">
              Workspace Performance &amp; CSAT
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Live operational metrics, ticket resolution breakdown, and team workload distribution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Tenant RLS Isolated
            </span>
          </div>
        </div>

        {/* 1. TOP KPI BENTO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Open / Pending Tickets */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-2xs hover:border-zinc-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Open &amp; Pending
              </span>
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums mt-3">
              {openPendingCount}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Unassigned:</span>
              <span className="font-medium text-zinc-700 tabular-nums">{unassignedCount}</span>
            </div>
          </div>

          {/* Card 2: Solved Tickets */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-2xs hover:border-zinc-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Solved Tickets
              </span>
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums mt-3">
              {solvedCount}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Resolution Rate:</span>
              <span className="font-medium text-zinc-700 tabular-nums">
                {tickets.length > 0 ? Math.round((solvedCount / tickets.length) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Card 3: Closed Tickets */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-2xs hover:border-zinc-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Closed Tickets
              </span>
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600">
                <Archive className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums mt-3">
              {closedCount}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Total Processed:</span>
              <span className="font-medium text-zinc-700 tabular-nums">{solvedCount + closedCount}</span>
            </div>
          </div>

          {/* Card 4: Average CSAT Rating */}
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-2xs hover:border-zinc-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Average CSAT
              </span>
              <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-600">
                <Star className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-zinc-900 tabular-nums mt-3 flex items-baseline gap-1.5">
              <span>{averageCsat}</span>
              <span className="text-xs font-normal text-zinc-400">/ 5.0</span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Satisfaction Tier:</span>
              <span className="font-medium text-emerald-600">
                Excellent ({ratedTickets.length} rated)
              </span>
            </div>
          </div>
        </div>

        {tickets.length === 0 ? (
          <EmptyTicketsState className="my-2" />
        ) : (
          /* 2. AGENT WORKLOAD TABLE */
          <div className="bg-white border border-zinc-200/80 rounded-xl shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-50/40">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                  <Users className="h-4 w-4 text-zinc-600" />
                  <span>Agent Workload Distribution</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Active tickets assigned across agents and relative team capacity.
                </p>
              </div>

              <div className="text-xs text-zinc-500 font-medium">
                Total Assigned: <strong className="text-zinc-900 tabular-nums">{totalAssignedTickets}</strong> tickets
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider select-none">
                    <th className="py-2.5 px-5">Agent</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4 text-center">Assigned Tickets</th>
                    <th className="py-2.5 px-4 text-center">Active Queue</th>
                    <th className="py-2.5 px-4 text-center">Resolved</th>
                    <th className="py-2.5 px-5 min-w-[180px]">Workload Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {agentWorkloadStats.map(({ agent, count, sharePercent, openCount, resolvedCount }) => {
                    const initials = agent.name
                      ? agent.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "A";

                    return (
                      <tr
                        key={agent.email}
                        className="h-11 hover:bg-zinc-50/70 transition-colors border-b border-zinc-100 last:border-0"
                      >
                        {/* Agent Name & Avatar */}
                        <td className="py-2 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-zinc-900 text-white text-[11px] font-medium flex items-center justify-center shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-medium text-zinc-900 leading-tight">
                                {agent.name}
                              </div>
                              <div className="text-[11px] text-zinc-400 font-mono leading-tight">
                                {agent.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-2 px-4 whitespace-nowrap">
                          {agent.role === "admin" ? (
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

                        {/* Assigned Tickets */}
                        <td className="py-2 px-4 text-center font-medium text-zinc-900 tabular-nums">
                          {count}
                        </td>

                        {/* Active Queue */}
                        <td className="py-2 px-4 text-center font-medium">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200/60 tabular-nums">
                            {openCount}
                          </span>
                        </td>

                        {/* Resolved */}
                        <td className="py-2 px-4 text-center font-medium">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 tabular-nums">
                            {resolvedCount}
                          </span>
                        </td>

                        {/* Workload Share Progress Bar */}
                        <td className="py-2 px-5">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-medium text-zinc-700 tabular-nums">{sharePercent}%</span>
                              <span className="text-zinc-400 tabular-nums">{count} of {totalAssignedTickets}</span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  sharePercent > 50
                                    ? "bg-amber-500"
                                    : sharePercent > 0
                                    ? "bg-zinc-900"
                                    : "bg-zinc-300"
                                }`}
                                style={{ width: `${Math.max(sharePercent, 3)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Unassigned Tickets Summary Row */}
                  <tr className="h-11 bg-zinc-50/30 border-b border-zinc-100 last:border-0 font-normal">
                    <td className="py-2 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-600 text-[11px] font-medium flex items-center justify-center shrink-0">
                          <Inbox className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="font-medium text-zinc-800 leading-tight">Unassigned Queue</div>
                          <div className="text-[10px] text-zinc-400 leading-tight">Tickets awaiting assignment</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-zinc-400 text-[11px]">—</td>
                    <td className="py-2 px-4 text-center font-medium text-zinc-800 tabular-nums">
                      {unassignedCount}
                    </td>
                    <td className="py-2 px-4 text-center font-medium">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200/60 tabular-nums">
                        {unassignedCount}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-center text-zinc-400 text-[11px]">—</td>
                    <td className="py-2 px-5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-zinc-600 tabular-nums">
                            {tickets.length > 0
                              ? Math.round((unassignedCount / tickets.length) * 100)
                              : 0}
                            % of total
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-zinc-400 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                tickets.length > 0
                                  ? Math.max(Math.round((unassignedCount / tickets.length) * 100), 2)
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
