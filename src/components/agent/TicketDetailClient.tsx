"use client";

import React, { useState, useEffect } from "react";
import { Ticket, User } from "@/types/desk";
import { CURRENT_AGENT } from "@/data/mockDeskData";
import { TicketChatWithRealtime } from "@/components/agent/TicketChatWithRealtime";
import { RightColumn } from "@/components/desk/RightColumn";
import { updateTicketStatus } from "@/app/actions/tickets";
import { getTeamMembers } from "@/app/actions/team";

interface TicketDetailClientProps {
  initialTicket: Ticket;
  currentUser?: User;
  availableAgents?: User[];
}

export function TicketDetailClient({
  initialTicket,
  currentUser = CURRENT_AGENT,
  availableAgents: initialAgents,
}: TicketDetailClientProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [teamAgents, setTeamAgents] = useState<User[]>(initialAgents || []);

  useEffect(() => {
    if (initialAgents && initialAgents.length > 0) {
      setTeamAgents(initialAgents);
      return;
    }

    let isMounted = true;
    async function fetchAgents() {
      try {
        const members = await getTeamMembers(currentUser?.workspace_id);
        if (isMounted && members && members.length > 0) {
          const mapped: User[] = members.map((m) => ({
            id: m.id,
            name: m.fullName,
            email: m.email,
            avatar: m.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.email}`,
            role: m.role,
            workspaceId: m.workspaceId,
            workspace_id: m.workspaceId,
            isActive: m.isActive,
          }));
          setTeamAgents(mapped);
        }
      } catch (err) {
        console.warn("Failed to load workspace agents in TicketDetailClient:", err);
      }
    }
    fetchAgents();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.workspace_id, initialAgents]);

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
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
      />

      {/* Right Sidebar: Customer Metadata & Ticket Properties */}
      <RightColumn
        ticket={ticket}
        availableAgents={teamAgents.length > 0 ? teamAgents : [currentUser]}
        currentUser={currentUser}
        onUpdateTicket={handleUpdateTicket}
      />
    </div>
  );
}
