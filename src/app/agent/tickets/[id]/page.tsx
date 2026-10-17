import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentSessionUser } from "@/app/actions/auth";
import { getTicketById } from "@/app/actions/tickets";
import { TicketDetailClient } from "@/components/agent/TicketDetailClient";
import { DeskHeader } from "@/components/desk/DeskHeader";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

interface AgentTicketPageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentTicketDetailPage({ params }: AgentTicketPageProps) {
  const { id } = await params;
  const [ticket, currentUser] = await Promise.all([
    getTicketById(id),
    getCurrentSessionUser(),
  ]);

  if (!ticket) {
    notFound();
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Global Header */}
      <DeskHeader
        currentUser={currentUser || undefined}
        brandName={currentUser?.workspaceName || currentUser?.company}
      />

      {/* Ticket Details Sub-Header */}
      <div className="bg-white px-5 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Tickets</span>
          </Link>

          <div className="h-4 w-[1px] bg-slate-200" />

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              #{ticket.number}
            </span>
            <Badge variant={ticket.status} className="text-xs uppercase">
              {ticket.status}
            </Badge>
            <Badge variant={ticket.priority} className="text-xs capitalize">
              {ticket.priority}
            </Badge>
          </div>

          <h1 className="text-sm font-bold text-slate-900 truncate max-w-lg">
            {ticket.subject}
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="capitalize flex items-center gap-1 font-medium">
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            via {ticket.channel}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Updated {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleTimeString() : "Recently"}
          </span>
        </div>
      </div>

      {/* Main Content: Wired Client Component */}
      <TicketDetailClient initialTicket={ticket} />
    </div>
  );
}
