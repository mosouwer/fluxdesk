"use client";

import React, { useState, useMemo } from "react";
import {
  User as UserIcon,
  Mail,
  Copy,
  Check,
  Building,
  Clock,
  Phone,
  Tag,
  ShieldAlert,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import { Ticket, TicketStatus, TicketPriority, User } from "@/types/desk";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RightColumnProps {
  ticket: Ticket;
  availableAgents: User[];
  currentUser: User;
  onUpdateTicket: (updates: Partial<Ticket>) => void;
}

export function RightColumn({
  ticket,
  availableAgents,
  currentUser,
  onUpdateTicket,
}: RightColumnProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  const customer = ticket.customer;

  const effectiveAgents = useMemo(() => {
    const list = [...(availableAgents || [])];
    if (currentUser && currentUser.role !== "customer" && !list.some((a) => a.id === currentUser.id)) {
      list.unshift(currentUser);
    }
    if (ticket.assignedAgent && !list.some((a) => a.id === ticket.assignedAgent?.id)) {
      list.push(ticket.assignedAgent);
    }
    return list;
  }, [availableAgents, currentUser, ticket.assignedAgent]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(customer.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newTagInput.trim().toLowerCase();
    if (tag && !ticket.tags.includes(tag)) {
      onUpdateTicket({ tags: [...ticket.tags, tag] });
    }
    setNewTagInput("");
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateTicket({ tags: ticket.tags.filter((t) => t !== tagToRemove) });
  };

  return (
    <aside className="w-80 border-l border-slate-200 bg-white flex flex-col h-full shrink-0 overflow-y-auto text-left select-none">
      {/* 1. Customer Metadata Section */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Customer Profile
          </span>
          {customer.tier && (
            <Badge
              variant={customer.tier === "Enterprise VIP" ? "urgent" : "normal"}
              className="text-[10px] px-1.5 py-0 h-4 font-semibold"
            >
              {customer.tier}
            </Badge>
          )}
        </div>

        {/* Customer Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar
            src={customer.avatar}
            fallback={customer.name[0]}
            size="md"
            className="ring-2 ring-slate-100"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold text-slate-900 truncate">
              {customer.name}
            </h3>
            {customer.company && (
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <Building className="h-3 w-3 text-slate-400 shrink-0" />
                <span>{customer.company}</span>
              </p>
            )}
          </div>
        </div>

        {/* Email & Contact Rows */}
        <div className="space-y-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
          {/* Email with copy */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-2 truncate">
              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate text-[11px] text-slate-800 font-mono">
                {customer.email}
              </span>
            </div>
            <button
              onClick={handleCopyEmail}
              title="Copy Email"
              className="h-5 w-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              {copiedEmail ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>

          {/* Phone */}
          {customer.phone && (
            <div className="flex items-center gap-2 text-[11px]">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-700 font-mono">{customer.phone}</span>
            </div>
          )}

          {/* Timezone */}
          {customer.timezone && (
            <div className="flex items-center gap-2 text-[11px]">
              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-600">{customer.timezone}</span>
            </div>
          )}
        </div>

        {/* Ticket History Stats */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-center">
          <div className="bg-white p-2 rounded-lg border border-slate-200/80">
            <div className="text-sm font-bold text-slate-900">
              {customer.lifetimeTickets ?? 1}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Lifetime Tickets
            </div>
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200/80">
            <div className="text-sm font-bold text-blue-600">
              {customer.openTickets ?? 1}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Open Tickets
            </div>
          </div>
        </div>
      </div>

      {/* 2. Ticket Properties & Assignment Section */}
      <div className="p-4 space-y-4 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Ticket Properties
        </div>

        {/* Assignee Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Assignee</span>
            {ticket.assignedAgent?.id !== currentUser.id && (
              <button
                type="button"
                onClick={() => onUpdateTicket({ assignedAgent: currentUser })}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                Assign to me
              </button>
            )}
          </div>

          <div className="relative">
            <select
              value={ticket.assignedAgent?.id || "unassigned"}
              onChange={(e) => {
                const agentId = e.target.value;
                if (agentId === "unassigned") {
                  onUpdateTicket({ assignedAgent: undefined });
                } else {
                  const agent = effectiveAgents.find((a) => a.id === agentId);
                  if (agent) onUpdateTicket({ assignedAgent: agent });
                }
              }}
              className="w-full h-8 pl-3 pr-8 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 appearance-none font-medium cursor-pointer shadow-2xs"
            >
              <option value="unassigned">— Unassigned —</option>
              {effectiveAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.role})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Status Control */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Status
          </label>
          <div className="relative">
            <select
              value={ticket.status}
              onChange={(e) =>
                onUpdateTicket({ status: e.target.value as TicketStatus })
              }
              className="w-full h-8 pl-3 pr-8 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 appearance-none font-medium cursor-pointer shadow-2xs"
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="on_hold">On-Hold</option>
              <option value="solved">Solved</option>
              <option value="closed">Closed</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Priority Control */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Priority
          </label>
          <div className="relative">
            <select
              value={ticket.priority}
              onChange={(e) =>
                onUpdateTicket({ priority: e.target.value as TicketPriority })
              }
              className="w-full h-8 pl-3 pr-8 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 appearance-none font-medium cursor-pointer shadow-2xs"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Channel display */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-500 block">
            Originating Channel
          </label>
          <div className="text-xs font-medium text-slate-700 bg-slate-100/70 border border-slate-200 px-3 py-1.5 rounded-md capitalize">
            {ticket.channel} Support
          </div>
        </div>

        {/* Tags Control */}
        <div className="space-y-2 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Tag className="h-3 w-3 text-slate-400" />
              <span>Tags</span>
            </span>
            {!isAddingTag && (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium flex items-center gap-0.5"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            )}
          </div>

          {/* Tag Pill List */}
          <div className="flex flex-wrap gap-1.5">
            {ticket.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded-md border border-slate-200 group"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-600 rounded-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add Tag Inline Form */}
          {isAddingTag && (
            <form onSubmit={handleAddTag} className="flex items-center gap-1 mt-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="tag-name..."
                autoFocus
                className="flex-1 h-7 text-xs px-2 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button type="submit" size="sm" className="h-7 px-2 text-xs">
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingTag(false)}
                className="h-7 px-1.5 text-xs text-slate-400"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </aside>
  );
}
