"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, isLiveSupabaseConfigured } from "@/utils/supabase/client";
import { User, TicketMessage, TicketStatus, MessageType } from "@/types/desk";
import { AgentPresence, AgentTypingEvent } from "@/types/realtime";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseTicketRealtimeOptions {
  ticketId: string;
  currentUser: User;
  onNewMessage?: (message: TicketMessage) => void;
  onTicketUpdated?: (updates: { status?: TicketStatus; priority?: any; assignedAgentId?: string }) => void;
  simulatedCollisionAgent?: User | null;
  simulatedTypingType?: MessageType | null;
}

export function useTicketRealtime({
  ticketId,
  currentUser,
  onNewMessage,
  onTicketUpdated,
  simulatedCollisionAgent,
  simulatedTypingType,
}: UseTicketRealtimeOptions) {
  const [activeAgents, setActiveAgents] = useState<AgentPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to Presence and Realtime Broadcast / Postgres Changes
  useEffect(() => {
    if (!ticketId) return;

    const roomName = `ticket-room-${ticketId}`;
    const channel = supabase.channel(roomName, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    channelRef.current = channel;

    // 1. PRESENCE LISTENER: Track who is viewing / active
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<AgentPresence>();
        const presenceList: AgentPresence[] = [];

        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            // Exclude current user from foreign collision list
            if (p.agentId !== currentUser.id) {
              presenceList.push(p);
            }
          });
        });

        setActiveAgents(presenceList);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const typedPresences = newPresences as unknown as AgentPresence[];
        setActiveAgents((prev) => {
          const filtered = prev.filter(
            (p) => !typedPresences.some((np) => np.agentId === p.agentId)
          );
          return [
            ...filtered,
            ...typedPresences.filter((p) => p.agentId !== currentUser.id),
          ];
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const typedPresences = leftPresences as unknown as AgentPresence[];
        setActiveAgents((prev) =>
          prev.filter((p) => !typedPresences.some((lp) => lp.agentId === p.agentId))
        );
      });

    // 2. BROADCAST LISTENER: Low-latency typing notifications
    channel.on(
      "broadcast",
      { event: "agent_typing" },
      ({ payload }: { payload: AgentTypingEvent }) => {
        if (payload.agentId === currentUser.id) return;

        setActiveAgents((prev) => {
          const existing = prev.find((p) => p.agentId === payload.agentId);
          if (payload.isTyping) {
            const updated: AgentPresence = {
              agentId: payload.agentId,
              agentName: payload.agentName,
              agentAvatar: payload.agentAvatar,
              status: "typing",
              typingType: payload.replyType,
              joinedAt: existing?.joinedAt || new Date().toISOString(),
              lastActive: new Date().toISOString(),
            };
            return [...prev.filter((p) => p.agentId !== payload.agentId), updated];
          } else {
            // Revert back to viewing
            return prev.map((p) =>
              p.agentId === payload.agentId
                ? { ...p, status: "viewing", typingType: undefined }
                : p
            );
          }
        });
      }
    );

    // 3. POSTGRES CHANGES LISTENER: New ticket messages (zero reload)
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "ticket_messages",
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row && onNewMessage) {
          const formattedMessage: TicketMessage = {
            id: row.id,
            ticketId: row.ticket_id,
            sender: {
              id: row.sender_id,
              name: row.sender_name || "Support Staff",
              email: row.sender_email || "agent@acmesupport.com",
              avatar:
                row.sender_avatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
              role: row.sender_role || "agent",
            },
            type: row.type || "public_reply",
            body: row.body,
            attachments: row.attachments || [],
            createdAt: "Just now (Live)",
          };
          onNewMessage(formattedMessage);
        }
      }
    );

    // 4. POSTGRES CHANGES LISTENER: Ticket metadata updates
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "tickets",
        filter: `id=eq.${ticketId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row && onTicketUpdated) {
          onTicketUpdated({
            status: row.status,
            priority: row.priority,
            assignedAgentId: row.assigned_agent_id,
          });
        }
      }
    );

    // Subscribe and track self presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        await channel.track({
          agentId: currentUser.id,
          agentName: currentUser.name,
          agentAvatar: currentUser.avatar,
          status: "viewing",
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        } satisfies AgentPresence);
      }
    });

    return () => {
      channel.untrack();
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [ticketId, currentUser, onNewMessage, onTicketUpdated]);

  // Broadcast typing status with debouncing
  const broadcastTyping = useCallback(
    (isTyping: boolean, replyType: MessageType) => {
      const channel = channelRef.current;
      if (!channel) return;

      // Broadcast event to peers
      channel.send({
        type: "broadcast",
        event: "agent_typing",
        payload: {
          agentId: currentUser.id,
          agentName: currentUser.name,
          agentAvatar: currentUser.avatar,
          isTyping,
          replyType,
          ticketId,
        } satisfies AgentTypingEvent,
      });

      // Also update presence state
      channel.track({
        agentId: currentUser.id,
        agentName: currentUser.name,
        agentAvatar: currentUser.avatar,
        status: isTyping ? "typing" : "viewing",
        typingType: isTyping ? replyType : undefined,
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      });

      // Clear any pending timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // If typing, auto-revert to "viewing" after 3 seconds of inactivity
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          channel.send({
            type: "broadcast",
            event: "agent_typing",
            payload: {
              agentId: currentUser.id,
              agentName: currentUser.name,
              agentAvatar: currentUser.avatar,
              isTyping: false,
              replyType,
              ticketId,
            } satisfies AgentTypingEvent,
          });

          channel.track({
            agentId: currentUser.id,
            agentName: currentUser.name,
            agentAvatar: currentUser.avatar,
            status: "viewing",
            joinedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
          });
        }, 3000);
      }
    },
    [currentUser, ticketId]
  );

  // Compute final active agents combining live Supabase Presence and simulation mode
  const effectiveActiveAgents: AgentPresence[] = [...activeAgents];

  if (simulatedCollisionAgent) {
    const simulatedPresence: AgentPresence = {
      agentId: simulatedCollisionAgent.id,
      agentName: simulatedCollisionAgent.name,
      agentAvatar: simulatedCollisionAgent.avatar,
      status: simulatedTypingType ? "typing" : "viewing",
      typingType: simulatedTypingType || undefined,
      joinedAt: "Just now",
      lastActive: "Just now",
    };

    // Replace or append simulated agent
    const idx = effectiveActiveAgents.findIndex(
      (a) => a.agentId === simulatedCollisionAgent.id
    );
    if (idx >= 0) {
      effectiveActiveAgents[idx] = simulatedPresence;
    } else {
      effectiveActiveAgents.push(simulatedPresence);
    }
  }

  const agentsTyping = effectiveActiveAgents.filter((a) => a.status === "typing");
  const agentsViewing = effectiveActiveAgents.filter((a) => a.status === "viewing");

  return {
    activeAgents: effectiveActiveAgents,
    agentsTyping,
    agentsViewing,
    hasCollision: effectiveActiveAgents.length > 0,
    hasTypingCollision: agentsTyping.length > 0,
    isConnected,
    isLiveConfigured: isLiveSupabaseConfigured,
    broadcastTyping,
  };
}
