"use client";

import React, { useState } from "react";
import {
  Inbox,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Send,
  Paperclip,
  FileText,
  X,
  ShieldCheck,
  PlusCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { Ticket, TicketMessage } from "@/types/desk";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { addMessageReply } from "@/app/actions/tickets";
import { SubmitTicketForm } from "./SubmitTicketForm";
import { cn } from "@/lib/utils";

interface CustomerTicketsListProps {
  initialTickets: Ticket[];
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  workspaceId?: string;
}

export function CustomerTicketsList({
  initialTickets,
  customerEmail,
  customerName,
  customerPhone,
  workspaceId,
}: CustomerTicketsListProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Reply box state
  const [replyBody, setReplyBody] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Selected ticket
  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || null;

  // STRICT SECURITY REQUIREMENT:
  // Ensure customer views NEVER render internal notes!
  const publicMessages = selectedTicket
    ? selectedTicket.messages.filter((m) => m.type !== "internal_note")
    : [];

  const handleTicketCreated = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev]);
    setShowSubmitModal(false);
    setSelectedTicketId(newTicket.id);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || !selectedTicket || isSendingReply) return;

    setIsSendingReply(true);
    const bodyText = replyBody.trim();

    // Optimistic UI update
    const optimisticMessage: TicketMessage = {
      id: `m-cust-${Date.now()}`,
      ticketId: selectedTicket.id,
      sender: {
        id: "current-customer",
        name: customerName,
        email: customerEmail,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${customerEmail}`,
        role: "customer",
      },
      type: "public_reply",
      body: bodyText,
      attachments: replyFile
        ? [
            {
              filename: replyFile.name,
              sizeBytes: replyFile.size,
              url: "#",
            },
          ]
        : [],
      createdAt: "Just now",
    };

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === selectedTicket.id) {
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            messages: [...t.messages, optimisticMessage],
          };
        }
        return t;
      })
    );

    setReplyBody("");
    setReplyFile(null);

    try {
      await addMessageReply({
        ticketId: selectedTicket.id,
        body: bodyText,
        type: "public_reply",
        senderRole: "customer",
      });
    } catch (err) {
      console.error("Failed to add reply:", err);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">
            {selectedTicket ? "Request Details" : "My Requests"}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {selectedTicket
              ? `Viewing conversation on #${selectedTicket.number}`
              : "Track the status of your active and past support tickets."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedTicket ? (
            <button
              onClick={() => setSelectedTicketId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200/80 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-zinc-50 transition-colors duration-100 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Tickets</span>
            </button>
          ) : (
            <Button
              onClick={() => setShowSubmitModal((prev) => !prev)}
              size="sm"
              className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-2xs cursor-pointer"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>{showSubmitModal ? "Close Form" : "Submit Request"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Conditionally Show Submit Form */}
      {showSubmitModal && !selectedTicket && (
        <SubmitTicketForm
          customerName={customerName}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          workspaceId={workspaceId}
          onTicketCreated={handleTicketCreated}
        />
      )}

      {/* 1. CLEAN TICKETS LIST VIEW */}
      {!selectedTicket && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-200/80 p-12 text-center text-zinc-400 shadow-2xs">
              <Inbox className="h-10 w-10 mx-auto mb-2 text-zinc-300" />
              <h3 className="text-sm font-semibold text-zinc-700">No support requests</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                You haven&apos;t submitted any support requests yet. Use the button above to submit your first inquiry.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs divide-y divide-zinc-100 overflow-hidden">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className="p-4 hover:bg-zinc-50/80 cursor-pointer transition-colors duration-100 flex items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Header Row: Ticket #, Status, Priority */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-zinc-500 bg-zinc-100 border border-zinc-200/80 px-2 py-0.5 rounded">
                        #{ticket.number}
                      </span>
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                    </div>

                    {/* Subject */}
                    <h3 className="text-xs font-semibold text-zinc-900 group-hover:text-zinc-700 transition-colors duration-100 truncate">
                      {ticket.subject}
                    </h3>

                    {/* Metadata Row: Created Date & Message count */}
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-zinc-400" />
                        Created {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>
                        {ticket.messages.filter((m) => m.type !== "internal_note").length} messages
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-zinc-400 group-hover:text-zinc-700 transition-colors duration-100">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. CLICKABLE DETAIL & PUBLIC CONVERSATION THREAD */}
      {selectedTicket && (
        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
          {/* Ticket Header */}
          <div className="p-5 border-b border-zinc-200/80 bg-zinc-50/50">
            <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-zinc-700 bg-zinc-200/80 px-2.5 py-0.5 rounded">
                  #{selectedTicket.number}
                </span>
                {/* Read-Only Status Badge for Customers */}
                <StatusBadge status={selectedTicket.status} />
                <PriorityBadge priority={selectedTicket.priority} />
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                <span>Created {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
              {selectedTicket.subject}
            </h2>
          </div>

          {/* Thread: Strictly Masking Internal Notes */}
          <div className="p-5 space-y-3.5 max-h-[500px] overflow-y-auto bg-zinc-50/30">
            {publicMessages.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No public messages in this thread yet.
              </div>
            ) : (
              publicMessages.map((msg) => {
                const isAuthor =
                  msg.sender.email.toLowerCase() === customerEmail.toLowerCase() ||
                  msg.sender.role === "customer";

                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "rounded-xl border p-4 text-left shadow-2xs",
                      isAuthor
                        ? "bg-white border-zinc-200/80"
                        : "bg-zinc-50/80 border-zinc-200/80"
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={msg.sender.avatar}
                          fallback={msg.sender.name[0]}
                          size="sm"
                          className="h-6 w-6 text-xs"
                        />
                        <div>
                          <span className="font-semibold text-zinc-900">
                            {msg.sender.name}
                          </span>
                          <span className="text-[11px] text-zinc-500 ml-1.5 font-normal">
                            {isAuthor ? "(You)" : "(Support Agent)"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {msg.createdAt}
                      </span>
                    </div>

                    <div className="text-xs leading-relaxed text-zinc-800 whitespace-pre-wrap font-sans">
                      {msg.body}
                    </div>

                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-zinc-100 flex flex-wrap gap-2">
                        {msg.attachments.map((att, i) => (
                          <div
                            key={i}
                            className="inline-flex items-center gap-1.5 text-xs bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-md border border-zinc-200/80"
                          >
                            <FileText className="h-3.5 w-3.5 text-zinc-500" />
                            <span className="font-mono text-[11px]">{att.filename}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Customer Reply Box (Always Public Reply) */}
          <div className="p-5 border-t border-zinc-200/80 bg-white">
            <form onSubmit={handleSendReply} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Add a reply
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Type your response to the support team..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  className="w-full p-3 text-xs bg-zinc-50/50 border border-zinc-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:bg-white text-zinc-900 resize-none transition-colors duration-100"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="list-reply-file-input"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setReplyFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="list-reply-file-input"
                    className="cursor-pointer inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/70 px-2.5 py-1.5 rounded-md transition-colors duration-100"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{replyFile ? replyFile.name : "Attach File"}</span>
                  </label>
                  {replyFile && (
                    <button
                      type="button"
                      onClick={() => setReplyFile(null)}
                      className="text-zinc-400 hover:text-red-500 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!replyBody.trim() || isSendingReply}
                  className="h-8 px-4 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5 rounded-lg shadow-2xs cursor-pointer"
                >
                  {isSendingReply ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      <span>Send Reply</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
