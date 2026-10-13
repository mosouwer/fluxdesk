"use client";

import React, { useState, useMemo } from "react";
import {
  Ticket,
  DeskView,
  TicketStatus,
  TicketPriority,
  User,
} from "@/types/desk";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Inbox,
  UserCheck,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight,
  Filter,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { matchesTicketSearch } from "@/lib/searchTickets";

interface TicketsListViewProps {
  tickets: Ticket[];
  activeView: DeskView;
  viewTitle: string;
  onSelectTicket: (ticketId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export function TicketsListView({
  tickets,
  activeView,
  viewTitle,
  onSelectTicket,
  onRefresh,
  isRefreshing = false,
  searchTerm: propSearchTerm,
  onSearchChange,
}: TicketsListViewProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const currentSearchTerm = propSearchTerm !== undefined ? propSearchTerm : localSearchTerm;

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
    } else {
      setLocalSearchTerm(value);
    }
  };

  const handleClearSearch = () => {
    if (onSearchChange) {
      onSearchChange("");
    } else {
      setLocalSearchTerm("");
    }
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"number" | "updated" | "sla">("updated");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const filteredTickets = useMemo(() => {
    let list = tickets;

    if (currentSearchTerm.trim()) {
      list = list.filter((t) => matchesTicketSearch(t, currentSearchTerm));
    }

    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortField === "number") {
        comparison = a.number - b.number;
      } else if (sortField === "updated") {
        comparison = new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
      } else if (sortField === "sla") {
        comparison = a.slaDueMinutes - b.slaDueMinutes;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });
  }, [tickets, currentSearchTerm, statusFilter, priorityFilter, sortField, sortDirection]);

  const toggleSort = (field: "number" | "updated" | "sla") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getViewIcon = () => {
    switch (activeView) {
      case "unassigned":
        return <Inbox className="h-5 w-5 text-slate-600" />;
      case "my_tickets":
        return <UserCheck className="h-5 w-5 text-blue-600" />;
      case "sla_breached":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "open":
        return <FolderOpen className="h-5 w-5 text-rose-600" />;
      case "solved":
        return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
      default:
        return <FolderOpen className="h-5 w-5 text-slate-600" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0 overflow-hidden">
      {/* View Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
              {getViewIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 tracking-tight">
                  {viewTitle}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {filteredTickets.length} {filteredTickets.length === 1 ? "ticket" : "tickets"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Viewing all tickets matching view criteria. Click any ticket to open discussion and controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-8 px-3 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-blue-600")} />
                <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, case owner, customer (name/phone)..."
                value={currentSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full h-8 pl-8 pr-8 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder:text-slate-400"
              />
              {currentSearchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="on_hold">On Hold</option>
              <option value="solved">Solved</option>
              <option value="closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / List Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-2xs mt-4 flex flex-col items-center justify-center">
            <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-3 shadow-2xs select-none">
              <span className="text-2xl leading-none" role="img" aria-label="inbox">
                📥
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              No tickets found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
              {tickets.length === 0
                ? "Your brand does not have any support requests yet. Tickets submitted via your website widget or customer portal will appear here."
                : "There are no tickets matching this view filter or search query."}
            </p>
            {tickets.length === 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("fluxdesk:open-new-ticket"));
                    }
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-xs cursor-pointer transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Ticket</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                  <th
                    onClick={() => toggleSort("number")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-800"
                  >
                    <div className="flex items-center gap-1">
                      <span>Ticket #</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th
                    onClick={() => toggleSort("sla")}
                    className="py-3 px-3 cursor-pointer hover:text-slate-800"
                  >
                    <div className="flex items-center gap-1">
                      <span>SLA</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort("updated")}
                    className="py-3 px-4 cursor-pointer hover:text-slate-800 text-right"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Updated</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTickets.map((ticket) => {
                  const isBreached = ticket.slaDueMinutes < 0 && ticket.status !== "solved";

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => onSelectTicket(ticket.id)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    >
                      {/* Ticket # */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                        <span className="bg-slate-100 border border-slate-200 group-hover:border-blue-300 px-2 py-0.5 rounded text-[11px]">
                          #{ticket.number}
                        </span>
                      </td>

                      {/* Subject */}
                      <td className="py-3 px-4 min-w-[200px] max-w-xs">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {ticket.subject}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {ticket.description}
                        </div>
                      </td>

                      {/* Customer / Requester */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={ticket.customer.avatar}
                            fallback={ticket.customer.name[0]}
                            size="sm"
                            className="h-6 w-6"
                          />
                          <div>
                            <span className="font-medium text-slate-800 block text-xs leading-tight">
                              {ticket.customer.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block leading-tight">
                              {ticket.customer.email}
                            </span>
                            {ticket.customer.phone && (
                              <span className="text-[10px] text-slate-500 font-mono block leading-tight">
                                {ticket.customer.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge variant={ticket.status} className="text-[10px] uppercase font-bold px-1.5 py-0 h-4.5">
                          {ticket.status}
                        </Badge>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge variant={ticket.priority} className="text-[10px] capitalize px-1.5 py-0 h-4.5">
                          {ticket.priority}
                        </Badge>
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {ticket.assignedAgent ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar
                              src={ticket.assignedAgent.avatar}
                              fallback={ticket.assignedAgent.name[0]}
                              size="sm"
                              className="h-5 w-5"
                            />
                            <span className="text-slate-700 font-medium">
                              {ticket.assignedAgent.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* SLA */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isBreached ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-3 w-3" />
                            Breached
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {ticket.slaDueMinutes}m
                          </span>
                        )}
                      </td>

                      {/* Updated Date */}
                      <td className="py-3 px-4 text-right whitespace-nowrap text-slate-400 text-[11px]">
                        <div className="flex items-center justify-end gap-1">
                          <span>
                            {ticket.updatedAt
                              ? new Date(ticket.updatedAt).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Recently"}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
