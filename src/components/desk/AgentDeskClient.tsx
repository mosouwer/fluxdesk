"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { DeskHeader } from "@/components/desk/DeskHeader";
import { LeftColumn } from "@/components/desk/LeftColumn";
import { CenterColumn } from "@/components/desk/CenterColumn";
import { RightColumn } from "@/components/desk/RightColumn";
import { TicketsListView } from "@/components/desk/TicketsListView";
import { MacroPopup } from "@/components/desk/MacroPopup";
import {
  CURRENT_AGENT,
  DESK_MACROS,
} from "@/data/mockDeskData";
import { Ticket, DeskView, MessageType, TicketStatus, Macro, TicketMessage, User } from "@/types/desk";
import { useTicketRealtime } from "@/hooks/useTicketRealtime";
import { addMessageReply, updateTicketStatus, getAgentTickets } from "@/app/actions/tickets";
import { getTeamMembers } from "@/app/actions/team";
import { CheckCircle2, Lock, Zap, Radio, AlertTriangle } from "lucide-react";

interface AgentDeskClientProps {
  initialTickets: Ticket[];
  currentUser?: User;
  availableAgents?: User[];
}

export function AgentDeskClient({
  initialTickets,
  currentUser = CURRENT_AGENT,
  availableAgents: initialAgents,
}: AgentDeskClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [teamAgents, setTeamAgents] = useState<User[]>(initialAgents || []);
  const [activeView, setActiveView] = useState<DeskView>("open");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dynamically load teammates for current brand/workspace
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
        console.warn("Failed to load workspace agents in client:", err);
      }
    }
    fetchAgents();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.workspace_id, initialAgents]);

  // Sync initial search from URL params if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("search");
      if (q) {
        setSearchQuery(q);
      }
    }
  }, []);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (selectedTicketId) {
      setSelectedTicketId(null);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleSelectView = (view: DeskView) => {
    setActiveView(view);
    setSelectedTicketId(null); // Return to middle pane list view for this filter
  };
  const [isMacroPaletteOpen, setIsMacroPaletteOpen] = useState(false);
  const [externalMacroDraft, setExternalMacroDraft] = useState<{
    type: MessageType;
    body: string;
    status?: TicketStatus;
  } | null>(null);

  // Simulation mode for peer collision testing
  const [simulatedPeer, setSimulatedPeer] = useState<{
    agent: User | null;
    typingType: MessageType | null;
  }>({
    agent: null,
    typingType: null,
  });

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    detail?: string;
    type: "public" | "internal" | "macro" | "realtime";
  } | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refreshedTickets = await getAgentTickets();
      if (refreshedTickets && refreshedTickets.length > 0) {
        setTickets(refreshedTickets);
      }
      showToast("Tickets Refreshed", "Loaded latest tickets from server", "realtime");
    } catch {
      showToast("Refresh Error", "Failed to reload tickets", "internal");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const showToast = (
    title: string,
    detail: string,
    type: "public" | "internal" | "macro" | "realtime"
  ) => {
    setToastMessage({ title, detail, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find currently selected ticket
  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return tickets.find((t) => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // Handle incoming Supabase Realtime Postgres Changes
  const handleRealtimeNewMessage = useCallback((incomingMessage: TicketMessage) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === incomingMessage.ticketId) {
          if (t.messages.some((m) => m.id === incomingMessage.id)) return t;
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            messages: [...t.messages, incomingMessage],
          };
        }
        return t;
      })
    );

    showToast(
      "Realtime Message Received",
      `${incomingMessage.sender.name} replied on #${selectedTicket?.number}`,
      "realtime"
    );
  }, [selectedTicket?.number]);

  // Handle incoming Supabase Realtime Ticket updates
  const handleRealtimeTicketUpdated = useCallback(
    (updates: { status?: TicketStatus; priority?: any; assignedAgentId?: string }) => {
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === selectedTicketId) {
            let assignedAgent = t.assignedAgent;
            if (updates.assignedAgentId) {
              assignedAgent =
                teamAgents.find((a) => a.id === updates.assignedAgentId) ||
                t.assignedAgent;
            }
            return {
              ...t,
              status: updates.status || t.status,
              priority: updates.priority || t.priority,
              assignedAgent,
              updatedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );
    },
    [selectedTicketId]
  );

  // Supabase Realtime Hook: Presence & Postgres Changes
  const {
    agentsTyping,
    agentsViewing,
    broadcastTyping,
    isConnected,
  } = useTicketRealtime({
    ticketId: selectedTicket?.id || "",
    currentUser: CURRENT_AGENT,
    onNewMessage: handleRealtimeNewMessage,
    onTicketUpdated: handleRealtimeTicketUpdated,
    simulatedCollisionAgent: simulatedPeer.agent,
    simulatedTypingType: simulatedPeer.typingType,
  });

  // Handle sending a public reply or internal note via Server Action
  const handleSendMessage = async (
    type: MessageType,
    body: string,
    newStatus?: TicketStatus
  ) => {
    if (!selectedTicket) return;

    // Optimistic UI update
    const tempMessage: TicketMessage = {
      id: `m-${Date.now()}`,
      ticketId: selectedTicket.id,
      sender: currentUser,
      type,
      body,
      createdAt: "Just now",
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === selectedTicket.id) {
          return {
            ...t,
            status: newStatus || t.status,
            updatedAt: new Date().toISOString(),
            messages: [...t.messages, tempMessage],
          };
        }
        return t;
      })
    );

    // Call Server Action: addMessageReply
    await addMessageReply({
      ticketId: selectedTicket.id,
      body,
      type,
      senderId: currentUser.id,
      senderRole: currentUser.role === "admin" ? "admin" : "agent",
    });

    // Update status if changed
    if (newStatus && newStatus !== selectedTicket.status) {
      await updateTicketStatus({
        ticketId: selectedTicket.id,
        status: newStatus,
      });
    }

    if (type === "internal_note") {
      showToast(
        "Private Internal Note saved",
        "Only visible to agents and admins (hidden from customer)",
        "internal"
      );
    } else {
      showToast(
        "Public Reply submitted via ⌘+Enter",
        `Sent to ${selectedTicket.customer.name}`,
        "public"
      );
    }
  };

  // Handle applying a Macro
  const handleApplyMacro = (macro: Macro) => {
    if (!selectedTicket) return;

    let updatedTicket = { ...selectedTicket };
    let draftComment: { type: MessageType; body: string } | null = null;
    let targetStatus: TicketStatus | undefined;

    macro.actions.forEach((action) => {
      if (action.action === "add_comment" && action.body) {
        draftComment = {
          type: action.type || "public_reply",
          body: action.body,
        };
      }
      if (action.action === "set_status" && action.value) {
        targetStatus = action.value as TicketStatus;
        updatedTicket.status = targetStatus;
      }
      if (action.action === "set_priority" && action.value) {
        updatedTicket.priority = action.value;
      }
      if (action.action === "add_tags" && Array.isArray(action.value)) {
        const uniqueTags = Array.from(
          new Set([...updatedTicket.tags, ...action.value])
        );
        updatedTicket.tags = uniqueTags;
      }
    });

    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicket.id ? updatedTicket : t))
    );

    if (draftComment !== null) {
      const comment: { type: MessageType; body: string } = draftComment;
      setExternalMacroDraft({
        type: comment.type,
        body: comment.body,
        status: targetStatus,
      });
    }

    showToast(
      `Macro Applied: "${macro.title}"`,
      "Actions executed and template loaded into editor",
      "macro"
    );
  };

  // Update properties on the active ticket via Server Action
  const handleUpdateTicket = async (updates: Partial<Ticket>) => {
    if (!selectedTicketId) return;

    // Optimistic UI update
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedTicketId ? { ...t, ...updates } : t))
    );

    // Call Server Action: updateTicketStatus
    await updateTicketStatus({
      ticketId: selectedTicketId,
      status: updates.status,
      priority: updates.priority,
      assignedAgentId: updates.assignedAgent ? updates.assignedAgent.id : updates.assignedAgent === undefined ? undefined : null,
    });
  };

  const toggleSimulation = (mode: "none" | "viewing" | "typing_public" | "typing_internal") => {
    const peerAgent = teamAgents.find((a) => a.id !== currentUser.id) || teamAgents[0] || currentUser;
    if (mode === "none") {
      setSimulatedPeer({ agent: null, typingType: null });
      showToast("Realtime Simulation", "Cleared simulated peer presence", "realtime");
    } else if (mode === "viewing") {
      setSimulatedPeer({ agent: peerAgent, typingType: null });
      showToast("Realtime Presence", `Agent ${peerAgent.name} is now viewing this ticket`, "realtime");
    } else if (mode === "typing_public") {
      setSimulatedPeer({ agent: peerAgent, typingType: "public_reply" });
      showToast("Collision Warning", `Agent ${peerAgent.name} is drafting a public reply!`, "realtime");
    } else if (mode === "typing_internal") {
      setSimulatedPeer({ agent: peerAgent, typingType: "internal_note" });
      showToast("Collision Warning", `Agent ${peerAgent.name} is drafting an internal note!`, "realtime");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-50/50 font-sans">
      <DeskHeader
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        currentUser={currentUser}
        brandName={currentUser?.workspaceName || currentUser?.company}
        onTicketCreated={(newTicket) => {
          setTickets((prev) => [newTicket, ...prev]);
          setSelectedTicketId(newTicket.id);
          setActiveView("open");
          showToast("Ticket Created", `Ticket #${newTicket.number} created successfully`, "public");
        }}
      />

      {/* Realtime Simulation / Test Control Bar */}
      <div className="bg-slate-900 text-white px-4 py-1.5 flex items-center justify-between text-xs border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-200">
            Supabase Realtime Presence Channel:
          </span>
          <span className="font-mono text-emerald-400 text-[11px]">
            ticket-room-{selectedTicket?.id?.slice(0, 8)}...
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">
            Simulate Peer Agent Collision:
          </span>
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-md border border-slate-700">
            <button
              onClick={() => toggleSimulation("none")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                !simulatedPeer.agent ? "bg-slate-700 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              Solo
            </button>
            <button
              onClick={() => toggleSimulation("viewing")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                simulatedPeer.agent && !simulatedPeer.typingType ? "bg-blue-600 text-white font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              David Viewing
            </button>
            <button
              onClick={() => toggleSimulation("typing_public")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                simulatedPeer.typingType === "public_reply" ? "bg-amber-600 text-white font-bold animate-pulse" : "text-slate-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-200" />
              David Drafting Reply
            </button>
            <button
              onClick={() => toggleSimulation("typing_internal")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                simulatedPeer.typingType === "internal_note" ? "bg-amber-500 text-amber-950 font-bold animate-pulse" : "text-slate-400 hover:text-white"
              }`}
            >
              <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-900" />
              David Note
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Zendesk Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <LeftColumn
          tickets={tickets}
          activeView={activeView}
          onSelectView={handleSelectView}
          selectedTicketId={selectedTicket?.id}
          onSelectTicket={setSelectedTicketId}
          currentAgentId={currentUser.id}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {selectedTicket ? (
          <>
            <CenterColumn
              ticket={selectedTicket}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onOpenMacroPalette={() => setIsMacroPaletteOpen(true)}
              externalMacroDraft={externalMacroDraft}
              onClearMacroDraft={() => setExternalMacroDraft(null)}
              agentsTyping={agentsTyping}
              agentsViewing={agentsViewing}
              onTypingChange={broadcastTyping}
              isRealtimeConnected={isConnected}
              onBackToList={() => setSelectedTicketId(null)}
            />

            <RightColumn
              ticket={selectedTicket}
              availableAgents={teamAgents.length > 0 ? teamAgents : (currentUser ? [currentUser] : [])}
              currentUser={currentUser}
              onUpdateTicket={handleUpdateTicket}
            />
          </>
        ) : (
          <TicketsListView
            tickets={
              searchQuery.trim()
                ? tickets
                : tickets.filter((t) => {
                    switch (activeView) {
                      case "unassigned":
                        return !t.assignedAgent && t.status !== "solved" && t.status !== "closed";
                      case "my_tickets":
                        return t.assignedAgent?.id === currentUser.id && t.status !== "solved" && t.status !== "closed";
                      case "sla_breached":
                        return t.slaDueMinutes < 0 && t.status !== "solved" && t.status !== "closed";
                      case "open":
                        return t.status === "open";
                      case "solved":
                        return t.status === "solved" || t.status === "closed";
                      default:
                        return true;
                    }
                  })
            }
            activeView={activeView}
            viewTitle={
              searchQuery.trim()
                ? `Search Results ("${searchQuery}")`
                : activeView === "unassigned"
                ? "Unassigned Tickets"
                : activeView === "my_tickets"
                ? "My Tickets"
                : activeView === "sla_breached"
                ? "SLA Breached Tickets"
                : activeView === "open"
                ? "Open Tickets"
                : "Solved Tickets"
            }
            onSelectTicket={setSelectedTicketId}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            searchTerm={searchQuery}
            onSearchChange={handleSearchChange}
          />
        )}
      </div>

      <MacroPopup
        isOpen={isMacroPaletteOpen}
        onClose={() => setIsMacroPaletteOpen(false)}
        macros={DESK_MACROS}
        onApplyMacro={handleApplyMacro}
      />

      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage.type === "internal" ? (
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="h-4 w-4" />
            </div>
          ) : toastMessage.type === "macro" ? (
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4" />
            </div>
          ) : toastMessage.type === "realtime" ? (
            <div className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          )}
          <div className="text-xs">
            <p className="font-semibold">{toastMessage.title}</p>
            {toastMessage.detail && (
              <p className="text-[11px] text-slate-400">{toastMessage.detail}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
