"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Lock,
  MessageSquare,
  CornerDownLeft,
  AlertTriangle,
  Eye,
  Send,
  Users,
  Paperclip,
  CheckCircle2,
  FileText,
  Radio,
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { addMessageReply } from "@/app/actions/tickets";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TicketMessage, MessageType } from "@/types/desk";

interface AgentPresenceState {
  userId: string;
  userName: string;
  joinedAt?: string;
}

interface TicketChatWithRealtimeProps {
  ticketId: string;
  initialMessages: TicketMessage[];
  currentUserId: string;
  currentUserName: string;
}

export function TicketChatWithRealtime({
  ticketId,
  initialMessages,
  currentUserId,
  currentUserName,
}: TicketChatWithRealtimeProps) {
  const [messages, setMessages] = useState<TicketMessage[]>(initialMessages);
  const [replyType, setReplyType] = useState<MessageType>("public_reply");
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Presence State
  const [activeAgents, setActiveAgents] = useState<AgentPresenceState[]>([]);
  const [simulatedPeer, setSimulatedPeer] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Keep messages in sync if initialMessages updates from server
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Scroll to bottom on new message
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 1. SUPABASE REALTIME & PRESENCE SETUP
  useEffect(() => {
    if (!ticketId) return;

    // Presence channel: ticket-presence-${ticketId}
    const presenceChannel = supabase.channel(`ticket-presence-${ticketId}`, {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<AgentPresenceState>();
        const presenceList: AgentPresenceState[] = [];

        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p.userId !== currentUserId) {
              presenceList.push(p);
            }
          });
        });

        setActiveAgents(presenceList);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        const joined = newPresences as unknown as AgentPresenceState[];
        setActiveAgents((prev) => {
          const filtered = prev.filter(
            (p) => !joined.some((j) => j.userId === p.userId)
          );
          return [
            ...filtered,
            ...joined.filter((j) => j.userId !== currentUserId),
          ];
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        const left = leftPresences as unknown as AgentPresenceState[];
        setActiveAgents((prev) =>
          prev.filter((p) => !left.some((l) => l.userId === p.userId))
        );
      });

    // Postgres Changes channel: INSERT on ticket_messages for this ticket
    const dbChannel = supabase.channel(`ticket-db-${ticketId}`);
    dbChannel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "ticket_messages",
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (row) {
          const incoming: TicketMessage = {
            id: row.id,
            ticketId: row.ticket_id,
            sender: {
              id: row.sender_id,
              name: row.sender_name || "Support Agent",
              email: row.sender_email || "agent@acmesupport.com",
              avatar:
                row.sender_avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.sender_id}`,
              role: row.sender_role || "agent",
            },
            type: row.type || "public_reply",
            body: row.body,
            attachments: row.attachments || [],
            createdAt: "Just now",
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      }
    );

    // Subscribe to both channels
    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          userId: currentUserId,
          userName: currentUserName,
          joinedAt: new Date().toISOString(),
        } satisfies AgentPresenceState);
      }
    });

    dbChannel.subscribe();

    return () => {
      presenceChannel.untrack();
      presenceChannel.unsubscribe();
      dbChannel.unsubscribe();
    };
  }, [ticketId, currentUserId, currentUserName]);

  // Combine live presence with simulated peer
  const effectivePeerAgents: AgentPresenceState[] = [...activeAgents];
  if (simulatedPeer) {
    if (!effectivePeerAgents.some((a) => a.userName === simulatedPeer)) {
      effectivePeerAgents.push({
        userId: "sim-peer-david",
        userName: simulatedPeer,
        joinedAt: new Date().toISOString(),
      });
    }
  }

  // 2. SEND REPLY HANDLER
  const handleSend = useCallback(async () => {
    if (!replyBody.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const bodyText = replyBody.trim();
    const messageType = replyType;

    // Optimistic UI update
    const optimisticMessage: TicketMessage = {
      id: `m-opt-${Date.now()}`,
      ticketId,
      sender: {
        id: currentUserId,
        name: currentUserName,
        email: "sarah.agent@acmesupport.com",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        role: "agent",
      },
      type: messageType,
      body: bodyText,
      createdAt: "Just now",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyBody("");

    try {
      // Call Server Action: addMessageReply
      await addMessageReply({
        ticketId,
        body: bodyText,
        type: messageType,
        senderId: currentUserId,
        senderRole: "agent",
      });
    } catch (err) {
      console.error("Failed to add message reply:", err);
    } finally {
      setIsSubmitting(false);
      textareaRef.current?.focus();
    }
  }, [replyBody, isSubmitting, replyType, ticketId, currentUserId, currentUserName]);

  // 3. KEYBOARD SHORTCUT: Cmd+Enter or Ctrl+Enter to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50/50 flex-1 min-w-0 relative">
      {/* 1. Linear Header Bar: Sticky h-12 with backdrop blur, monospace ID, and realtime status */}
      <div className="h-12 border-b border-zinc-200/80 px-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-zinc-400">
            #TICK-{ticketId.slice(0, 6)}
          </span>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            Realtime Synced
          </span>
        </div>

        {/* Simulation toggle button */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 hidden sm:inline">Simulation:</span>
          <button
            type="button"
            onClick={() =>
              setSimulatedPeer(simulatedPeer ? null : "Agent David Kim")
            }
            className={cn(
              "text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors border",
              simulatedPeer
                ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold"
                : "bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900 hover:bg-zinc-200/70"
            )}
          >
            {simulatedPeer ? "Viewing: David Kim" : "Simulate Peer"}
          </button>
        </div>
      </div>

      {/* ALERT BANNER: Rendered when other agents are active on presence channel */}
      {effectivePeerAgents.length > 0 && (
        <div className="bg-amber-50/70 border-b border-amber-200/70 px-4 py-2 text-xs text-amber-900 flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <span className="font-medium">
              {effectivePeerAgents.map((a) => a.userName).join(", ")} is also viewing this ticket.
            </span>
            <span className="text-[11px] text-amber-700/80 hidden sm:inline">
              Coordinate to prevent duplicate replies.
            </span>
          </div>

          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {effectivePeerAgents.map((agent, i) => (
              <div
                key={i}
                className="h-5 w-5 rounded-full bg-amber-200 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-amber-900 shadow-2xs"
                title={agent.userName}
              >
                {agent.userName[0]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Scrollable Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
        {messages.map((message) => {
          const isInternal = message.type === "internal_note";
          const isCustomer = message.sender?.role === "customer";

          return (
            <div
              key={message.id}
              className={cn(
                "rounded-xl p-4 transition-all text-left",
                isInternal
                  ? "bg-amber-50/60 border border-amber-200/70"
                  : "bg-white border border-zinc-200/80 shadow-2xs"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-zinc-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={message.sender?.avatar}
                    fallback={message.sender?.name?.[0] || "A"}
                    size="sm"
                    className="h-7 w-7 text-xs"
                  />
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-semibold text-zinc-900 truncate">
                      {message.sender?.name || "Staff"}
                    </span>
                    <span className="text-[11px] text-zinc-400 hidden sm:inline">
                      {message.sender?.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isInternal ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100/70 border border-amber-200 px-2 py-0.5 rounded-full">
                      <Lock className="h-3 w-3 text-amber-700" />
                      Internal Note
                    </span>
                  ) : isCustomer ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                      Requester
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full">
                      Public Reply
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-400">
                    {message.createdAt}
                  </span>
                </div>
              </div>

              {/* Message Body */}
              <div
                className={cn(
                  "text-xs leading-relaxed whitespace-pre-wrap font-sans",
                  isInternal ? "text-amber-950 font-normal" : "text-zinc-800"
                )}
              >
                {message.body}

                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-wrap gap-2">
                    {message.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 text-xs bg-zinc-50 text-zinc-700 px-2.5 py-1 rounded-md border border-zinc-200/80"
                      >
                        <FileText className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="font-mono text-[11px]">{att.filename}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={threadEndRef} />
      </div>

      {/* 3. Floating Reply Composer */}
      <div className="m-4 bg-white border border-zinc-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-400 transition-all overflow-hidden shrink-0">
        {/* Toggle Tabs */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-zinc-100">
          <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/80">
            <button
              type="button"
              onClick={() => setReplyType("public_reply")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                replyType === "public_reply"
                  ? "bg-white text-zinc-900 font-semibold shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <MessageSquare className="h-3 w-3" />
              <span>Public Reply</span>
            </button>

            <button
              type="button"
              onClick={() => setReplyType("internal_note")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                replyType === "internal_note"
                  ? "bg-amber-100/80 text-amber-900 font-semibold shadow-2xs border border-amber-200/70"
                  : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              <Lock className="h-3 w-3 text-amber-700" />
              <span>Internal Note</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-emerald-500" />
            <span>Realtime Synced</span>
          </div>
        </div>

        {/* Internal Note Banner Warning */}
        {replyType === "internal_note" && (
          <div className="px-3.5 py-1.5 bg-amber-50/70 border-b border-amber-200/60 text-[11px] font-medium text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-amber-700" />
              Internal Note: Only visible to support team
            </span>
            <span className="text-[10px] text-amber-600">
              Hidden from customer
            </span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={3}
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            replyType === "internal_note"
              ? "Leave a note for your team... (Press Cmd+Enter to post)"
              : "Type your reply to the customer... (Press Cmd+Enter to send)"
          }
          className={cn(
            "w-full p-3.5 text-xs focus:outline-none resize-none bg-transparent placeholder:text-zinc-400 font-sans",
            replyType === "internal_note"
              ? "text-amber-950 font-medium"
              : "text-zinc-900"
          )}
        />

        {/* Clean Footer Inside Composer */}
        <div className="px-3.5 py-2.5 flex items-center justify-between border-t border-zinc-100 bg-zinc-50/40">
          {/* Keyboard hint badge */}
          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-100 border border-zinc-200 rounded text-zinc-500 font-mono">
              ⌘
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-100 border border-zinc-200 rounded text-zinc-500 font-mono">
              Enter
            </kbd>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!replyBody.trim() || isSubmitting}
            className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg font-medium inline-flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            {replyType === "internal_note" ? (
              <>
                <Lock className="h-3 w-3 text-amber-300" />
                <span>Post Note</span>
              </>
            ) : (
              <>
                <CornerDownLeft className="h-3 w-3" />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
