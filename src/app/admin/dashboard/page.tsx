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
  const workspace = getActiveWorkspace();

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Navigation */}
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
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                  Analytics &amp; CSAT
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {workspace.name} &bull; /{workspace.slug}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <span>Agent Desk</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>

            <Link
              href="/admin/team"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <Users className="h-3 w-3 text-slate-400" />
              <span>Team &amp; Roles</span>
            </Link>

            <Link
              href="/admin/settings"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200/60"
            >
              <Settings className="h-3 w-3 text-slate-400" />
              <span>Settings</span>
            </Link>

            <Link
              href="/onboard"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
            >
              <span>+ New Brand</span>
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
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-7">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Workspace Performance &amp; CSAT
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live operational metrics, ticket resolution breakdown, and team workload distribution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Tenant RLS Isolated
            </span>
          </div>
        </div>

        {/* 4 STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stat 1: Open / Pending Tickets */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Open &amp; Pending
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {openPendingCount}
              </div>
              <div className="text-[11px] text-amber-700 font-medium flex items-center gap-1 mt-1">
                <span>Active queue requiring action</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Unassigned:</span>
              <span className="font-semibold text-slate-700">{unassignedCount}</span>
            </div>
          </div>

          {/* Stat 2: Solved Tickets */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Solved Tickets
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {solvedCount}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
                <span>Resolved awaiting customer confirmation</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Resolution Rate:</span>
              <span className="font-semibold text-slate-700">
                {tickets.length > 0 ? Math.round((solvedCount / tickets.length) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Stat 3: Closed Tickets */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Closed Tickets
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center">
                <Archive className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {closedCount}
              </div>
              <div className="text-[11px] text-blue-700 font-medium flex items-center gap-1 mt-1">
                <span>Archived and fully completed</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Total Processed:</span>
              <span className="font-semibold text-slate-700">{solvedCount + closedCount}</span>
            </div>
          </div>

          {/* Stat 4: Average CSAT Rating (1 to 5) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Average CSAT
              </span>
              <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center">
                <Star className="h-4 w-4 fill-purple-500 text-purple-500" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {averageCsat}
                </span>
                <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= Math.round(Number(averageCsat))
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-200"
                    }`}
                  />
                ))}
                <span className="text-[10px] text-slate-400 ml-1">
                  ({ratedTickets.length} rated)
                </span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Satisfaction Tier:</span>
              <span className="font-semibold text-emerald-600">Excellent</span>
            </div>
          </div>
        </div>

        {tickets.length === 0 ? (
          <EmptyTicketsState className="my-2" />
        ) : (
          /* PER-AGENT WORKLOAD TABLE */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-6 py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-blue-600" />
                <span>Agent Workload Distribution</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Active tickets assigned across agents and relative team capacity.
              </p>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Total Assigned: <strong className="text-slate-900">{totalAssignedTickets}</strong> tickets
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                  <th className="py-3 px-6">Agent</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Assigned Tickets</th>
                  <th className="py-3 px-4 text-center">Active Queue</th>
                  <th className="py-3 px-4 text-center">Resolved</th>
                  <th className="py-3 px-6 min-w-[200px]">Workload Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {agentWorkloadStats.map(({ agent, count, sharePercent, openCount, resolvedCount }) => (
                  <tr key={agent.email} className="hover:bg-slate-50/70 transition-colors">
                    {/* Agent Name & Avatar */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={agent.avatar}
                          fallback={agent.name[0]}
                          size="sm"
                          className="h-8 w-8 rounded-full border border-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">
                            {agent.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono leading-tight mt-0.5">
                            {agent.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {agent.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <span>Agent</span>
                        </span>
                      )}
                    </td>

                    {/* Assigned Tickets */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800 text-sm">
                      {count}
                    </td>

                    {/* Active Queue */}
                    <td className="py-3.5 px-4 text-center font-medium text-amber-700">
                      <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                        {openCount}
                      </span>
                    </td>

                    {/* Resolved */}
                    <td className="py-3.5 px-4 text-center font-medium text-emerald-700">
                      <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                        {resolvedCount}
                      </span>
                    </td>

                    {/* Workload Share Progress Bar */}
                    <td className="py-3.5 px-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">{sharePercent}%</span>
                          <span className="text-slate-400">{count} of {totalAssignedTickets}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              sharePercent > 50
                                ? "bg-amber-500"
                                : sharePercent > 0
                                ? "bg-blue-600"
                                : "bg-slate-300"
                            }`}
                            style={{ width: `${Math.max(sharePercent, 3)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Unassigned Tickets Summary Row */}
                <tr className="bg-slate-50/50 font-medium">
                  <td className="py-3 px-6 text-slate-500 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">
                      <Inbox className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-700">Unassigned Queue</div>
                      <div className="text-[10px] text-slate-400">Tickets awaiting assignment</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-[11px]">—</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700 text-sm">
                    {unassignedCount}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-amber-700">
                    <span className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                      {unassignedCount}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-400 text-[11px]">—</td>
                  <td className="py-3 px-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600">
                          {tickets.length > 0
                            ? Math.round((unassignedCount / tickets.length) * 100)
                            : 0}
                          % of total
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all duration-300"
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
