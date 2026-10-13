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
    <div className="flex flex-col h-full bg-slate-50 flex-1 min-w-0">
      {/* Realtime Channel Connection Header */}
      <div className="bg-slate-900 text-white px-4 py-1.5 flex items-center justify-between text-xs border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-200">
            Realtime Presence:
          </span>
          <span className="font-mono text-emerald-400 text-[11px]">
            ticket-presence-{ticketId.slice(0, 8)}...
          </span>
        </div>

        {/* Simulation toggle button */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">Simulation:</span>
          <button
            type="button"
            onClick={() =>
              setSimulatedPeer(simulatedPeer ? null : "Agent David Kim")
            }
            className={cn(
              "text-[10px] px-2 py-0.5 rounded font-semibold transition-colors",
              simulatedPeer
                ? "bg-amber-500 text-amber-950 font-bold"
                : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            {simulatedPeer ? "Viewing: David Kim" : "Simulate Peer"}
          </button>
        </div>
      </div>

      {/* ALERT BANNER: Rendered when other agents are active on presence channel */}
      {effectivePeerAgents.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-300 px-4 py-2.5 text-xs text-amber-950 flex items-center justify-between shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="font-bold">
                ⚠️{" "}
                {effectivePeerAgents.map((a) => a.userName).join(", ")}{" "}
                is also viewing this ticket.
              </span>
              <span className="text-[11px] text-amber-800/90 ml-1.5 hidden sm:inline">
                Coordinate to prevent duplicate replies.
              </span>
            </div>
          </div>

          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {effectivePeerAgents.map((agent, i) => (
              <div
                key={i}
                className="h-6 w-6 rounded-full bg-amber-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-amber-900 shadow-2xs"
                title={agent.userName}
              >
                {agent.userName[0]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCROLLABLE CONVERSATION THREAD */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((message) => {
          const isInternal = message.type === "internal_note";
          const isCustomer = message.sender?.role === "customer";

          return (
            <div
              key={message.id}
              className={cn(
                "rounded-xl transition-all shadow-xs border text-left overflow-hidden",
                isInternal
                  ? "bg-amber-50/90 border-amber-300 shadow-[0_1px_3px_rgba(245,158,11,0.08)]"
                  : isCustomer
                  ? "bg-white border-slate-200"
                  : "bg-white border-blue-200/80 shadow-[0_1px_2px_rgba(37,99,235,0.04)]"
              )}
            >
              {/* Header */}
              <div
                className={cn(
                  "px-4 py-2 flex items-center justify-between border-b text-xs",
                  isInternal
                    ? "bg-amber-100/70 border-amber-200 text-amber-900"
                    : isCustomer
                    ? "bg-slate-50/80 border-slate-100 text-slate-700"
                    : "bg-blue-50/50 border-blue-100 text-slate-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    src={message.sender?.avatar}
                    fallback={message.sender?.name?.[0] || "A"}
                    size="sm"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">
                      {message.sender?.name || "Staff"}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1 font-normal">
                      ({message.sender?.email || "staff@acmesupport.com"})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isInternal ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                      <Lock className="h-3 w-3 text-amber-900" />
                      Internal Note (Private)
                    </span>
                  ) : isCustomer ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
                      Requester
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      Public Reply
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400">
                    {message.createdAt}
                  </span>
                </div>
              </div>

              {/* Message Body */}
              <div
                className={cn(
                  "p-4 text-xs leading-relaxed whitespace-pre-wrap font-sans",
                  isInternal ? "text-amber-950 font-normal" : "text-slate-800"
                )}
              >
                {message.body}

                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex flex-wrap gap-2">
                    {message.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
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

      {/* 3. REPLY BOX WITH TOGGLE TABS (Public Reply vs. Yellow Internal Note) */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-md">
        {/* Toggle Tabs */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setReplyType("public_reply")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all",
                replyType === "public_reply"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
              <span>Public Reply</span>
            </button>

            <button
              type="button"
              onClick={() => setReplyType("internal_note")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all",
                replyType === "internal_note"
                  ? "bg-amber-400 text-amber-950 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Lock className="h-3.5 w-3.5 text-amber-900" />
              <span>Internal Note</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Radio className="h-3 w-3 text-emerald-500" />
            <span>Supabase Realtime Synced</span>
          </div>
        </div>

        {/* Textarea container with styled yellow background for Internal Note */}
        <div
          className={cn(
            "rounded-lg border transition-all focus-within:ring-2",
            replyType === "internal_note"
              ? "bg-[#fffdf5] border-amber-300 focus-within:ring-amber-400 focus-within:border-amber-400"
              : "bg-white border-slate-300 focus-within:ring-blue-500 focus-within:border-blue-500"
          )}
        >
          {/* Internal Note Banner Warning */}
          {replyType === "internal_note" && (
            <div className="px-3 py-1 bg-amber-100/80 border-b border-amber-200 text-[11px] font-semibold text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-amber-800" />
                Internal Note: Visible ONLY to support agents and admins
              </span>
              <span className="text-[10px] text-amber-700 font-normal">
                Customer will never receive or see this
              </span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={4}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              replyType === "internal_note"
                ? "Write a private internal note for your team... (Press Cmd+Enter to post)"
                : "Type your public reply to the customer... (Press Cmd+Enter to send)"
            }
            className={cn(
              "w-full p-3 text-xs focus:outline-none resize-none bg-transparent placeholder:text-slate-400",
              replyType === "internal_note"
                ? "text-amber-950 font-medium"
                : "text-slate-800"
            )}
          />

          {/* Action Footer */}
          <div
            className={cn(
              "px-3 py-2 flex items-center justify-between border-t",
              replyType === "internal_note"
                ? "border-amber-200 bg-amber-50/40"
                : "border-slate-100 bg-slate-50/50"
            )}
          >
            {/* Keyboard shortcut indicator */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="text-slate-400">Press</span>
              <kbd className="bg-white border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-2xs font-semibold">
                ⌘
              </kbd>
              <span className="text-slate-400">+</span>
              <kbd className="bg-white border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[10px] shadow-2xs font-semibold">
                Enter
              </kbd>
              <span className="text-slate-400">to send</span>
            </div>

            <Button
              type="button"
              onClick={handleSend}
              disabled={!replyBody.trim() || isSubmitting}
              className={cn(
                "h-8 text-xs font-semibold gap-1.5",
                replyType === "internal_note"
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {replyType === "internal_note" ? (
                <>
                  <Lock className="h-3 w-3" />
                  <span>Post Internal Note</span>
                </>
              ) : (
                <>
                  <CornerDownLeft className="h-3 w-3" />
                  <span>Send Reply</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
