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
    <main className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
      {/* 1. Center Header: Ticket Title, ID, Realtime Presence & Badges */}
      <div className="bg-white px-5 py-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {onBackToList && (
              <button
                type="button"
                onClick={onBackToList}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors mr-1"
                title="Back to Tickets List"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Tickets</span>
              </button>
            )}
            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              #{ticket.number}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="text-xs text-slate-400 capitalize flex items-center gap-1 font-medium">
              <Globe className="h-3 w-3 text-slate-400" />
              via {ticket.channel}
            </span>

            {/* Supabase Realtime indicator pill */}
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Supabase Realtime
            </span>
          </div>

          {/* Right Header items: SLA + Presence Avatars */}
          <div className="flex items-center gap-3">
            {/* Active peer presence avatars */}
            {(agentsViewing.length > 0 || agentsTyping.length > 0) && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100/80 border border-slate-200 px-2 py-0.5 rounded-full">
                <Users className="h-3 w-3 text-slate-400" />
                <div className="flex items-center -space-x-1.5">
                  {[...agentsTyping, ...agentsViewing].map((ag) => (
                    <Avatar
                      key={ag.agentId}
                      src={ag.agentAvatar}
                      fallback={ag.agentName[0]}
                      size="sm"
                      className="h-5 w-5 border-2 border-white ring-1 ring-blue-300"
                    />
                  ))}
                </div>
                <span className="text-[10px] font-medium text-slate-600">
                  {agentsTyping.length > 0
                    ? `${agentsTyping[0].agentName} typing...`
                    : `${agentsViewing.length} viewing`}
                </span>
              </div>
            )}

            {/* SLA indicator */}
            {ticket.slaDueMinutes < 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full">
                <Clock className="h-3.5 w-3.5" />
                SLA Breached ({Math.abs(ticket.slaDueMinutes)}m overdue)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                SLA: {ticket.slaDueMinutes}m left
              </span>
            )}
          </div>
        </div>

        <h1 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
          {ticket.subject}
        </h1>
      </div>

      {/* 2. Scrollable Thread: Collision Banner, Messages & Internal Notes */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
                "rounded-xl transition-all shadow-xs border text-left overflow-hidden",
                isInternal
                  ? "bg-amber-50/90 border-amber-300 shadow-[0_1px_3px_rgba(245,158,11,0.08)]"
                  : isCustomer
                  ? "bg-white border-slate-200"
                  : "bg-white border-blue-200/80 shadow-[0_1px_2px_rgba(37,99,235,0.04)]"
              )}
            >
              {/* Message Header */}
              <div
                className={cn(
                  "px-4 py-2.5 flex items-center justify-between border-b text-xs",
                  isInternal
                    ? "bg-amber-100/70 border-amber-200 text-amber-900"
                    : isCustomer
                    ? "bg-slate-50/80 border-slate-100 text-slate-700"
                    : "bg-blue-50/50 border-blue-100 text-slate-700"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={message.sender.avatar}
                    fallback={message.sender.name[0]}
                    size="sm"
                  />
                  <div>
                    <span className="font-semibold text-slate-900">
                      {message.sender.name}
                    </span>
                    <span className="text-[11px] text-slate-500 ml-1.5 font-normal">
                      ({message.sender.email})
                    </span>
                  </div>
                </div>

                {/* Badges: Distinguish Public Reply vs Private Yellow Internal Note */}
                <div className="flex items-center gap-2">
                  {isInternal ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-200 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                      <Lock className="h-3 w-3 text-amber-900" />
                      Internal Note (Private to Agents)
                    </span>
                  ) : isCustomer ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded-full">
                      Requester
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      <Globe className="h-3 w-3 text-blue-600" />
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

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap gap-2">
                    {message.attachments.map((att, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-medium font-mono">{att.filename}</span>
                        <span className="text-[10px] text-slate-400">
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

      {/* 3. Rich Reply Composer with Public vs. Yellow Internal Note Switcher */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-lg">
        {/* Reply Type Mode Selector */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setReplyType("public_reply");
                if (messageBody.trim()) onTypingChange?.(true, "public_reply");
              }}
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
              onClick={() => {
                setReplyType("internal_note");
                if (messageBody.trim()) onTypingChange?.(true, "internal_note");
              }}
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

          {/* Macro Quick Trigger */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenMacroPalette}
              className="h-7 text-xs gap-1.5 text-slate-700 border-slate-300 hover:border-amber-400 hover:bg-amber-50"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>Insert Macro</span>
              <kbd className="text-[10px] bg-slate-100 px-1 py-0.2 rounded font-mono text-slate-500">
                /
              </kbd>
            </Button>
          </div>
        </div>

        {/* Textarea container with distinct Yellow Internal Note styling */}
        <div
          className={cn(
            "rounded-lg border transition-all focus-within:ring-2",
            replyType === "internal_note"
              ? "bg-[#fffdf5] border-amber-300 focus-within:ring-amber-400 focus-within:border-amber-400"
              : "bg-white border-slate-300 focus-within:ring-blue-500 focus-within:border-blue-500"
          )}
        >
          {/* Note Mode Banner */}
          {replyType === "internal_note" && (
            <div className="px-3 py-1 bg-amber-100/80 border-b border-amber-200/80 text-[11px] font-semibold text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-amber-800" />
                Internal Note: Visible ONLY to support agents and admins
              </span>
              <span className="text-[10px] text-amber-700 font-normal">
                Customer will never receive or see this
              </span>
            </div>
          )}

          {/* Formatting Toolbar */}
          <div
            className={cn(
              "px-2.5 py-1.5 flex items-center justify-between border-b text-slate-500",
              replyType === "internal_note" ? "border-amber-200/60 bg-amber-50/40" : "border-slate-100 bg-slate-50/60"
            )}
          >
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => insertFormatting("**", "**")}
                title="Bold"
                className="p-1 rounded hover:bg-slate-200/70 text-slate-600 transition-colors"
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("*", "*")}
                title="Italic"
                className="p-1 rounded hover:bg-slate-200/70 text-slate-600 transition-colors"
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("`", "`")}
                title="Code"
                className="p-1 rounded hover:bg-slate-200/70 text-slate-600 transition-colors"
              >
                <Code className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("[", "](url)")}
                title="Link"
                className="p-1 rounded hover:bg-slate-200/70 text-slate-600 transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting("\n- ")}
                title="Bullet List"
                className="p-1 rounded hover:bg-slate-200/70 text-slate-600 transition-colors"
              >
                <List className="h-3.5 w-3.5" />
              </button>

              <div className="h-3.5 w-[1px] bg-slate-200 mx-1" />

              <button
                type="button"
                title="Attach file"
                className="p-1 rounded hover:bg-slate-200/70 text-slate-600 transition-colors flex items-center gap-1 text-[11px]"
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Attach</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400">
              Markdown supported
            </div>
          </div>

          {/* Text Area with Live Typing Broadcast */}
          <textarea
            ref={textareaRef}
            rows={4}
            value={messageBody}
            onChange={handleTextChange}
            onBlur={() => onTypingChange?.(false, replyType)}
            onKeyDown={handleKeyDown}
            placeholder={
              replyType === "internal_note"
                ? "Write a private internal note for your team... (Type / for macros)"
                : "Type your public reply to the customer... (Type / for macros)"
            }
            className={cn(
              "w-full p-3 text-xs focus:outline-none resize-none bg-transparent placeholder:text-slate-400",
              replyType === "internal_note" ? "text-amber-950 font-medium" : "text-slate-800"
            )}
          />

          {/* Action Row & Submit Button */}
          <div
            className={cn(
              "px-3 py-2 flex items-center justify-between border-t",
              replyType === "internal_note" ? "border-amber-200 bg-amber-50/30" : "border-slate-100 bg-slate-50/50"
            )}
          >
            {/* Keyboard shortcut reminder badge */}
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

            {/* Split Submit Button with status option */}
            <div className="relative inline-flex rounded-md shadow-xs">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!messageBody.trim()}
                className={cn(
                  "rounded-r-none h-8 text-xs font-semibold gap-1.5",
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
                <span className="opacity-80">({selectedSubmitStatus})</span>
              </Button>

              <button
                type="button"
                onClick={() => setStatusDropdownOpen((prev) => !prev)}
                className={cn(
                  "px-2 rounded-r-md border-l transition-colors flex items-center justify-center",
                  replyType === "internal_note"
                    ? "bg-amber-700 text-amber-100 hover:bg-amber-800 border-amber-500"
                    : "bg-blue-700 text-blue-100 hover:bg-blue-800 border-blue-500"
                )}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {/* Status select dropdown */}
              {statusDropdownOpen && (
                <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-20">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
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
                        "w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors",
                        selectedSubmitStatus === opt.value ? "font-bold text-blue-600 bg-blue-50/50" : "text-slate-700"
                      )}
                    >
                      <span>{opt.label}</span>
                      {selectedSubmitStatus === opt.value && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
