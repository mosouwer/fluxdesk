"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Lock,
  MessageSquare,
  Paperclip,
  Bold,
  Italic,
  Link2,
  Code,
  List,
  Zap,
  CornerDownLeft,
  ChevronDown,
  Globe,
  FileText,
  Clock,
  Sparkles,
  Info,
  Radio,
  Users,
  ArrowLeft,
} from "lucide-react";
import { Ticket, TicketMessage, MessageType, TicketStatus, User } from "@/types/desk";
import { AgentPresence } from "@/types/realtime";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { AgentCollisionBanner } from "@/components/desk/AgentCollisionBanner";
import { cn } from "@/lib/utils";

interface CenterColumnProps {
  ticket: Ticket;
  currentUser: User;
  onSendMessage: (type: MessageType, body: string, newStatus?: TicketStatus) => void;
  onOpenMacroPalette: () => void;
  externalMacroDraft?: { type: MessageType; body: string; status?: TicketStatus } | null;
  onClearMacroDraft?: () => void;
  agentsTyping?: AgentPresence[];
  agentsViewing?: AgentPresence[];
  onTypingChange?: (isTyping: boolean, replyType: MessageType) => void;
  isRealtimeConnected?: boolean;
  onBackToList?: () => void;
}

export function CenterColumn({
  ticket,
  currentUser,
  onSendMessage,
  onOpenMacroPalette,
  externalMacroDraft,
  onClearMacroDraft,
  agentsTyping = [],
  agentsViewing = [],
  onTypingChange,
  isRealtimeConnected = true,
  onBackToList,
}: CenterColumnProps) {
  const [replyType, setReplyType] = useState<MessageType>("public_reply");
  const [messageBody, setMessageBody] = useState("");
  const [selectedSubmitStatus, setSelectedSubmitStatus] = useState<TicketStatus>(ticket.status);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Sync external macro insertion when applied
  useEffect(() => {
    if (externalMacroDraft) {
      setReplyType(externalMacroDraft.type);
      setMessageBody(externalMacroDraft.body);
      if (externalMacroDraft.status) {
        setSelectedSubmitStatus(externalMacroDraft.status);
      }
      onClearMacroDraft?.();
      textareaRef.current?.focus();
    }
  }, [externalMacroDraft, onClearMacroDraft]);

  // Scroll to bottom on new messages
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket.messages]);

  // Keep submit status in sync with ticket status changes
  useEffect(() => {
    setSelectedSubmitStatus(ticket.status);
  }, [ticket.status]);

  const handleSubmit = () => {
    if (!messageBody.trim()) return;
    onTypingChange?.(false, replyType);
    onSendMessage(replyType, messageBody.trim(), selectedSubmitStatus);
    setMessageBody("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Quick Interaction: Cmd + Enter / Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Trigger macro palette if user presses '/' at beginning of line
    if (e.key === "/" && (messageBody === "" || messageBody.endsWith("\n"))) {
      e.preventDefault();
      onOpenMacroPalette();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageBody(val);
    if (val.trim().length > 0) {
      onTypingChange?.(true, replyType);
    } else {
      onTypingChange?.(false, replyType);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = messageBody.substring(start, end);
    const replacement = prefix + selectedText + suffix;

    setMessageBody(
      messageBody.substring(0, start) + replacement + messageBody.substring(end)
    );

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 10);
  };

  const statusOptions: { value: TicketStatus; label: string; color: string }[] = [
    { value: "open", label: "Submit as Open", color: "text-rose-600" },
    { value: "pending", label: "Submit as Pending", color: "text-blue-600" },
    { value: "on_hold", label: "Submit as On-Hold", color: "text-slate-600" },
    { value: "solved", label: "Submit as Solved", color: "text-emerald-600" },
  ];

  return (
    <main className="flex-1 flex flex-col h-full bg-zinc-50/50 min-w-0 relative">
      {/* 1. Linear Header Bar: Sticky h-12 with backdrop blur, monospace ID, and badges */}
      <div className="h-12 border-b border-zinc-200/80 px-4 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/70 px-2 py-1 rounded-md transition-colors mr-0.5"
              title="Back to Tickets List"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>All</span>
            </button>
          )}

          <span className="font-mono text-xs text-zinc-400 shrink-0">
            #{ticket.number}
          </span>

          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />

          <span className="text-xs font-semibold text-zinc-900 truncate max-w-xs sm:max-w-sm md:max-w-md ml-1">
            {ticket.subject}
          </span>
        </div>

        {/* Right Header items: SLA + Presence Avatars */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active peer presence avatars */}
          {(agentsViewing.length > 0 || agentsTyping.length > 0) && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-100 border border-zinc-200/80 px-2 py-0.5 rounded-full">
              <Users className="h-3 w-3 text-zinc-400" />
              <div className="flex items-center -space-x-1.5">
                {[...agentsTyping, ...agentsViewing].map((ag) => (
                  <Avatar
                    key={ag.agentId}
                    src={ag.agentAvatar}
                    fallback={ag.agentName[0]}
                    size="sm"
                    className="h-4.5 w-4.5 border-2 border-white ring-1 ring-zinc-300"
                  />
                ))}
              </div>
              <span className="text-[10px] font-medium text-zinc-600">
                {agentsTyping.length > 0
                  ? `${agentsTyping[0].agentName} typing...`
                  : `${agentsViewing.length} viewing`}
              </span>
            </div>
          )}

          {/* SLA indicator */}
          {ticket.slaDueMinutes < 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200/70 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3" />
              Overdue
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 border border-zinc-200/80 px-2 py-0.5 rounded-full">
              <Clock className="h-3 w-3 text-zinc-400" />
              {ticket.slaDueMinutes}m
            </span>
          )}
        </div>
      </div>

      {/* 2. Scrollable Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
        {/* Agent Collision Warning Banner */}
        <AgentCollisionBanner
          agentsTyping={agentsTyping}
          agentsViewing={agentsViewing}
        />

        {ticket.messages.map((message) => {
          const isInternal = message.type === "internal_note";
          const isCustomer = message.sender.role === "customer";

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
              {/* Message Header */}
              <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-zinc-100">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    src={message.sender.avatar}
                    fallback={message.sender.name[0]}
                    size="sm"
                    className="h-7 w-7 text-xs"
                  />
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-semibold text-zinc-900 truncate">
                      {message.sender.name}
                    </span>
                    <span className="text-[11px] text-zinc-400 hidden sm:inline">
                      {message.sender.email}
                    </span>
                  </div>
                </div>

                {/* Right badges & timestamp */}
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

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 flex flex-wrap gap-2">
                    {message.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-2 text-xs bg-zinc-50 hover:bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md border border-zinc-200/80 transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-zinc-500" />
                        <span className="font-medium font-mono text-[11px]">{att.filename}</span>
                        <span className="text-[10px] text-zinc-400">
                          ({(att.sizeBytes / 1024).toFixed(1)} KB)
                        </span>
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
        {/* Top Control Bar: Segmented Pill Toggle & Macro Trigger */}
        <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-zinc-100">
          <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/80">
            <button
              type="button"
              onClick={() => {
                setReplyType("public_reply");
                if (messageBody.trim()) onTypingChange?.(true, "public_reply");
              }}
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
              onClick={() => {
                setReplyType("internal_note");
                if (messageBody.trim()) onTypingChange?.(true, "internal_note");
              }}
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

          {/* Macro Quick Trigger */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenMacroPalette}
              className="h-7 text-xs gap-1.5 text-zinc-600 border-zinc-200 hover:bg-zinc-50"
            >
              <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span>Macro</span>
              <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-100 border border-zinc-200 rounded text-zinc-500 font-mono">
                /
              </kbd>
            </Button>
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

        {/* Text Area with Live Typing Broadcast */}
        <textarea
          ref={textareaRef}
          rows={3}
          value={messageBody}
          onChange={handleTextChange}
          onBlur={() => onTypingChange?.(false, replyType)}
          onKeyDown={handleKeyDown}
          placeholder={
            replyType === "internal_note"
              ? "Leave a note for your team... (Type / for macros)"
              : "Type your reply to the customer... (Type / for macros)"
          }
          className={cn(
            "w-full p-3.5 text-xs focus:outline-none resize-none bg-transparent placeholder:text-zinc-400 font-sans",
            replyType === "internal_note" ? "text-amber-950 font-medium" : "text-zinc-900"
          )}
        />

        {/* Clean Footer Inside Composer with Keyboard Hint & Sleek Send Button */}
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

          {/* Send Button & Status Selector Dropdown */}
          <div className="relative inline-flex rounded-lg shadow-2xs">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!messageBody.trim()}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-l-lg font-medium inline-flex items-center gap-1.5 transition-colors"
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
              <span className="text-zinc-400 text-[10px]">({selectedSubmitStatus})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusDropdownOpen((prev) => !prev)}
              className="bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 px-2 rounded-r-lg border-l border-zinc-800 transition-colors flex items-center justify-center"
            >
              <ChevronDown className="h-3 w-3" />
            </button>

            {/* Status select dropdown */}
            {statusDropdownOpen && (
              <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white rounded-lg shadow-xl border border-zinc-200 py-1 z-30">
                <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-100">
                  Submit with Status
                </div>
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedSubmitStatus(opt.value);
                      setStatusDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-zinc-50 transition-colors",
                      selectedSubmitStatus === opt.value
                        ? "font-semibold text-zinc-900 bg-zinc-50"
                        : "text-zinc-600"
                    )}
                  >
                    <span>{opt.label}</span>
                    {selectedSubmitStatus === opt.value && (
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
