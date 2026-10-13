"use client";

import React, { useState } from "react";
import { Ticket } from "@/types/desk";
import { CURRENT_AGENT, AVAILABLE_AGENTS } from "@/data/mockDeskData";
import { TicketChatWithRealtime } from "@/components/agent/TicketChatWithRealtime";
import { RightColumn } from "@/components/desk/RightColumn";
import { updateTicketStatus } from "@/app/actions/tickets";

interface TicketDetailClientProps {
  initialTicket: Ticket;
}

export function TicketDetailClient({ initialTicket }: TicketDetailClientProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);

  const handleUpdateTicket = async (updates: Partial<Ticket>) => {
    setTicket((prev) => ({ ...prev, ...updates }));

    try {
      await updateTicketStatus({
        ticketId: ticket.id,
        status: updates.status,
        priority: updates.priority,
        assignedAgentId:
          updates.assignedAgent !== undefined
            ? updates.assignedAgent
              ? updates.assignedAgent.id
              : null
            : undefined,
      });
    } catch (err) {
      console.error("Failed to update ticket properties:", err);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Realtime Conversation and composer */}
      <TicketChatWithRealtime
        ticketId={ticket.id}
        initialMessages={ticket.messages}
        currentUserId={CURRENT_AGENT.id}
        currentUserName={CURRENT_AGENT.name}
      />

      {/* Right Sidebar: Customer Metadata & Ticket Properties */}
      <RightColumn
        ticket={ticket}
        availableAgents={AVAILABLE_AGENTS}
        currentUser={CURRENT_AGENT}
        onUpdateTicket={handleUpdateTicket}
      />
    </div>
  );
}
