"use client";

import React, { useState, useMemo } from "react";
import {
  Inbox,
  UserCheck,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  Search,
  Clock,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import { Ticket, DeskView, TicketStatus } from "@/types/desk";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { cn } from "@/lib/utils";
import { matchesTicketSearch } from "@/lib/searchTickets";

interface LeftColumnProps {
  tickets: Ticket[];
  activeView: DeskView;
  onSelectView: (view: DeskView) => void;
  selectedTicketId?: string | null;
  onSelectTicket: (ticketId: string) => void;
  currentAgentId: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function LeftColumn({
  tickets,
  activeView,
  onSelectView,
  selectedTicketId,
  onSelectTicket,
  currentAgentId,
  onRefresh,
  isRefreshing = false,
}: LeftColumnProps) {
  const [ticketSearch, setTicketSearch] = useState("");

  // Calculate counts for each view dynamically
  const viewCounts = useMemo(() => {
    return {
      unassigned: tickets.filter((t) => !t.assignedAgent && t.status !== "solved" && t.status !== "closed").length,
      my_tickets: tickets.filter((t) => t.assignedAgent?.id === currentAgentId && t.status !== "solved" && t.status !== "closed").length,
      sla_breached: tickets.filter((t) => t.slaDueMinutes < 0 && t.status !== "solved" && t.status !== "closed").length,
      open: tickets.filter((t) => t.status === "open").length,
      solved: tickets.filter((t) => t.status === "solved" || t.status === "closed").length,
    };
  }, [tickets, currentAgentId]);

  // Filter tickets according to active view
  const filteredTickets = useMemo(() => {
    let result = tickets.filter((t) => {
      switch (activeView) {
        case "unassigned":
          return !t.assignedAgent && t.status !== "solved" && t.status !== "closed";
        case "my_tickets":
          return t.assignedAgent?.id === currentAgentId && t.status !== "solved" && t.status !== "closed";
        case "sla_breached":
          return t.slaDueMinutes < 0 && t.status !== "solved" && t.status !== "closed";
        case "open":
          return t.status === "open";
        case "solved":
          return t.status === "solved" || t.status === "closed";
        default:
          return true;
      }
    });

    if (ticketSearch.trim()) {
      result = result.filter((t) => matchesTicketSearch(t, ticketSearch));
    }

    return result;
  }, [tickets, activeView, currentAgentId, ticketSearch]);

  const viewsConfig = [
    {
      id: "unassigned" as DeskView,
      label: "Unassigned",
      icon: Inbox,
      count: viewCounts.unassigned,
      countColor: "bg-slate-100 text-slate-700",
    },
    {
      id: "my_tickets" as DeskView,
      label: "My Tickets",
      icon: UserCheck,
      count: viewCounts.my_tickets,
      countColor: "bg-blue-100 text-blue-700",
    },
    {
      id: "sla_breached" as DeskView,
      label: "SLA Breached",
      icon: AlertTriangle,
      count: viewCounts.sla_breached,
      countColor: viewCounts.sla_breached > 0 ? "bg-red-100 text-red-700 font-bold" : "bg-slate-100 text-slate-500",
    },
    {
      id: "open" as DeskView,
      label: "Open",
      icon: FolderOpen,
      count: viewCounts.open,
      countColor: "bg-rose-100 text-rose-700",
    },
    {
      id: "solved" as DeskView,
      label: "Solved",
      icon: CheckCircle2,
      count: viewCounts.solved,
      countColor: "bg-emerald-100 text-emerald-700",
    },
  ];

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case "open":
        return <Badge variant="open" className="text-[10px] px-1.5 py-0 h-4 uppercase">Open</Badge>;
      case "pending":
        return <Badge variant="pending" className="text-[10px] px-1.5 py-0 h-4 uppercase">Pending</Badge>;
      case "on_hold":
        return <Badge variant="on_hold" className="text-[10px] px-1.5 py-0 h-4 uppercase">Hold</Badge>;
      case "solved":
        return <Badge variant="solved" className="text-[10px] px-1.5 py-0 h-4 uppercase">Solved</Badge>;
      case "closed":
        return <Badge variant="low" className="text-[10px] px-1.5 py-0 h-4 uppercase">Closed</Badge>;
    }
  };

  return (
    <aside className="w-80 border-r border-slate-200 bg-white flex flex-col h-full shrink-0 select-none">
      {/* Upper Section: Views List */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/50">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2 flex items-center justify-between">
          <span>Views</span>
          <Filter className="h-3 w-3 text-slate-400" />
        </div>
        <nav className="space-y-0.5">
          {viewsConfig.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => onSelectView(view.id)}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left",
                  isActive
                    ? "bg-blue-50 text-blue-900 font-semibold shadow-xs"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-blue-600" : "text-slate-400"
                    )}
                  />
                  <span>{view.label}</span>
                </div>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                    view.countColor
                  )}
                >
                  {view.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search within filtered list */}
      <div className="p-2.5 border-b border-slate-100 bg-white">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={ticketSearch}
            onChange={(e) => setTicketSearch(e.target.value)}
            placeholder="Search ticket #, owner, customer..."
            className="w-full h-7 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
          />
          {ticketSearch && (
            <button
              type="button"
              onClick={() => setTicketSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Ticket List header */}
      <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-medium text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
        <span>{filteredTickets.length} Tickets</span>
        <div className="flex items-center gap-2">
          <span>Sorted by Newest</span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh tickets"
              className="text-slate-400 hover:text-blue-600 transition-colors p-0.5 rounded hover:bg-slate-200/60 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin text-blue-600")} />
            </button>
          )}
        </div>
      </div>

      {/* Tickets Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            No tickets match this view.
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const isSelected = ticket.id === selectedTicketId;
            const isBreached = ticket.slaDueMinutes < 0 && ticket.status !== "solved";

            return (
              <div
                key={ticket.id}
                onClick={() => onSelectTicket(ticket.id)}
                className={cn(
                  "p-3 cursor-pointer transition-colors relative border-l-3 text-left",
                  isSelected
                    ? "bg-blue-50/70 border-l-blue-600 shadow-2xs"
                    : "border-l-transparent hover:bg-slate-50"
                )}
              >
                {/* Header row: Ticket number, Status, and Priority */}
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      #{ticket.number}
                    </span>
                    <StatusBadge status={ticket.status} />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                </div>

                {/* Subject */}
                <h4 className="text-xs font-semibold text-slate-900 line-clamp-1 mb-1">
                  {ticket.subject}
                </h4>

                {/* Footer row: Requester & SLA/Timestamp */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span className="truncate max-w-[130px] font-medium text-slate-700">
                    {ticket.customer.name}
                  </span>

                  <div className="flex items-center gap-1">
                    {isBreached ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 rounded">
                        <AlertTriangle className="h-2.5 w-2.5 text-red-600" />
                        Breached
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                        <Clock className="h-2.5 w-2.5" />
                        {ticket.slaDueMinutes}m
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
