"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  PlusCircle,
  Inbox,
  Paperclip,
  Send,
  CheckCircle2,
  FileText,
  X,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Ticket, TicketMessage, TicketPriority, User as UserType } from "@/types/desk";
import { CUSTOMER_EMILY, CUSTOMER_MARCUS } from "@/data/mockDeskData";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { submitNewTicket, addMessageReply } from "@/app/actions/tickets";
import { cn } from "@/lib/utils";

interface CustomerPortalClientProps {
  initialTickets: Ticket[];
}

export function CustomerPortalClient({ initialTickets }: CustomerPortalClientProps) {
  const [currentCustomer, setCurrentCustomer] = useState<UserType>(CUSTOMER_EMILY);
  const [activeTab, setActiveTab] = useState<"submit" | "my_tickets">("submit");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Tickets state initialized from Server Component data fetch
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);

  // Form state
  const [formData, setFormData] = useState({
    name: currentCustomer.name,
    email: currentCustomer.email,
    subject: "",
    category: "Technical Issue",
    priority: "normal" as TicketPriority,
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketNumber, setSubmittedTicketNumber] = useState<number | null>(null);

  // Customer reply state
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState<File | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Filter tickets for current customer
  const customerTickets = useMemo(() => {
    return tickets.filter(
      (t) => t.customer.email.toLowerCase() === currentCustomer.email.toLowerCase()
    );
  }, [tickets, currentCustomer]);

  // Selected ticket for detailed thread view
  const activeTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || null;
  }, [tickets, selectedTicketId]);

  // SANITIZED MESSAGES: Enforce strict security requirement
  // Customers CAN NEVER view internal notes!
  const customerVisibleMessages = useMemo(() => {
    if (!activeTicket) return [];
    return activeTicket.messages.filter((m) => m.type !== "internal_note");
  }, [activeTicket]);

  const handleCustomerSwitch = (cust: UserType) => {
    setCurrentCustomer(cust);
    setFormData((prev) => ({
      ...prev,
      name: cust.name,
      email: cust.email,
    }));
    setSelectedTicketId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Submit new ticket using Server Action: submitNewTicket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) return;

    setIsSubmitting(true);

    const submissionData = new FormData();
    submissionData.append("name", formData.name);
    submissionData.append("email", formData.email);
    submissionData.append("phone", "+1 (555) 392-8819");
    submissionData.append("subject", formData.subject);
    submissionData.append("category", formData.category);
    submissionData.append("priority", formData.priority);
    submissionData.append("description", formData.description);
    if (selectedFile) {
      submissionData.append("file", selectedFile);
    }

    try {
      const result = await submitNewTicket(submissionData);
      if (result.success && result.ticket) {
        setTickets((prev) => [result.ticket, ...prev]);
        setSubmittedTicketNumber(result.ticket.number);
        setSelectedFile(null);
        setFormData({
          name: currentCustomer.name,
          email: currentCustomer.email,
          subject: "",
          category: "Technical Issue",
          priority: "normal",
          description: "",
        });
      }
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Customer replies using Server Action: addMessageReply
  const handleSendCustomerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    setIsSendingReply(true);

    const tempMessage: TicketMessage = {
      id: `m-reply-${Date.now()}`,
      ticketId: activeTicket.id,
      sender: currentCustomer,
      type: "public_reply",
      body: replyText.trim(),
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

    // Optimistic UI update
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === activeTicket.id) {
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            messages: [...t.messages, tempMessage],
          };
        }
        return t;
      })
    );

    try {
      await addMessageReply({
        ticketId: activeTicket.id,
        body: replyText.trim(),
        type: "public_reply",
        senderId: currentCustomer.id,
        senderRole: "customer",
      });
      setReplyText("");
      setReplyFile(null);
    } catch (err) {
      console.error("Reply error:", err);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* 1. Portal Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base block leading-tight">
                Acme Help Center
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Customer Support Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => {
                  setActiveTab("submit");
                  setSelectedTicketId(null);
                  setSubmittedTicketNumber(null);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5",
                  activeTab === "submit" && !selectedTicketId
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Submit Request</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("my_tickets");
                  setSelectedTicketId(null);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5",
                  activeTab === "my_tickets" || selectedTicketId
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Inbox className="h-3.5 w-3.5" />
                <span>My Requests</span>
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full">
                  {customerTickets.length}
                </span>
              </button>
            </nav>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <Avatar
                src={currentCustomer.avatar}
                fallback={currentCustomer.name[0]}
                size="sm"
              />
              <div className="text-left hidden sm:block">
                <span className="text-xs font-semibold text-slate-800 block leading-tight">
                  {currentCustomer.name}
                </span>
                <button
                  onClick={() =>
                    handleCustomerSwitch(
                      currentCustomer.id === CUSTOMER_EMILY.id
                        ? CUSTOMER_MARCUS
                        : CUSTOMER_EMILY
                    )
                  }
                  className="text-[10px] text-blue-600 hover:underline block leading-none font-medium mt-0.5"
                >
                  Switch User
                </button>
              </div>
            </div>

            <Link
              href="/"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md transition-colors"
            >
              <span>Agent Desk</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Portal Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full">
        {/* SUBMIT REQUEST TAB */}
        {activeTab === "submit" && !selectedTicketId && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-b from-blue-50/50 to-white">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Submit a Support Request
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Please provide as much detail as possible so our support team can assist you quickly.
              </p>
            </div>

            {submittedTicketNumber ? (
              <div className="p-8 text-center space-y-4">
                <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Request #{submittedTicketNumber} Submitted!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Your ticket has been inserted into the database. You will receive an email confirmation and can track replies in your portal dashboard.
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                  <Button
                    onClick={() => {
                      setActiveTab("my_tickets");
                      setSubmittedTicketNumber(null);
                    }}
                    className="text-xs"
                  >
                    View in My Requests
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSubmittedTicketNumber(null)}
                    className="text-xs"
                  >
                    Submit Another Request
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="p-6 md:p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 cursor-pointer"
                    >
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Billing & Invoices">Billing & Invoices</option>
                      <option value="Account & Security">Account & Security</option>
                      <option value="Feature Request">Feature Request</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority / Severity
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value as TicketPriority })
                      }
                      className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 cursor-pointer"
                    >
                      <option value="low">Low - Minor question or feedback</option>
                      <option value="normal">Normal - Standard non-blocking issue</option>
                      <option value="high">High - Impacting daily operations</option>
                      <option value="urgent">Urgent - Complete production outage</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject / Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Brief summary of the issue..."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description & Details
                  </label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Please include error messages, screenshots, or steps to reproduce..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 resize-y"
                  />
                </div>

                {/* File Attachment Upload with Supabase Storage Integration */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Attach Files (Stored in Supabase ticket-attachments)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
                    <input
                      type="file"
                      id="ticket-file-input"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 max-w-sm mx-auto">
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                          <span className="font-medium truncate">{selectedFile.name}</span>
                          <span className="text-[10px] text-slate-400">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="ticket-file-input"
                        className="cursor-pointer flex flex-col items-center gap-1.5"
                      >
                        <Paperclip className="h-6 w-6 text-slate-400" />
                        <span className="text-xs font-semibold text-blue-600 hover:underline">
                          Choose a file to upload
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Uploaded to ticket-attachments bucket (up to 25MB)
                        </span>
                      </label>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 px-6 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? "Submitting Request..." : "Submit Ticket"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* MY TICKETS LIST TAB */}
        {activeTab === "my_tickets" && !selectedTicketId && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  My Support Requests
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track ongoing inquiries and review resolution history.
                </p>
              </div>

              <Button
                onClick={() => setActiveTab("submit")}
                size="sm"
                className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>New Request</span>
              </Button>
            </div>

            {customerTickets.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                <Inbox className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <h3 className="text-sm font-semibold text-slate-700">No requests found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  You haven&apos;t submitted any support requests yet.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {customerTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          #{ticket.number}
                        </span>
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </div>

                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {ticket.subject}
                      </h4>

                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Updated {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : "Recently"}</span>
                        <span>•</span>
                        <span>{ticket.messages.filter((m) => m.type !== "internal_note").length} messages</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center text-slate-400">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TICKET DETAIL & THREAD VIEW */}
        {selectedTicketId && activeTicket && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedTicketId(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to My Requests</span>
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                      #{activeTicket.number}
                    </span>
                    {/* Read-Only Status Badge for Customers: Cannot change to solved */}
                    <StatusBadge status={activeTicket.status} />
                  </div>

                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Verified Customer Portal
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {activeTicket.subject}
                </h2>
              </div>

              {/* Thread History - Strictly Masking Internal Notes */}
              <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto bg-slate-50/30">
                {customerVisibleMessages.map((msg) => {
                  const isAuthor = msg.sender.email.toLowerCase() === currentCustomer.email.toLowerCase();

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "rounded-xl border p-4 text-left shadow-2xs",
                        isAuthor
                          ? "bg-white border-slate-200"
                          : "bg-blue-50/60 border-blue-200"
                      )}
                    >
                      <div className="flex items-center justify-between border-b pb-2 mb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={msg.sender.avatar}
                            fallback={msg.sender.name[0]}
                            size="sm"
                          />
                          <div>
                            <span className="font-semibold text-slate-900">
                              {msg.sender.name}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-1.5 font-normal">
                              {isAuthor ? "(You)" : "(Support Agent)"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {msg.createdAt}
                        </span>
                      </div>

                      <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                        {msg.body}
                      </div>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex flex-wrap gap-2">
                          {msg.attachments.map((att, i) => (
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
                  );
                })}
              </div>

              {/* Customer Reply Box (Always Public Reply via Server Action) */}
              <div className="p-6 border-t border-slate-200 bg-white">
                <form onSubmit={handleSendCustomerReply} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Add a reply to this ticket
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Type your response to the support team..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        id="reply-file-input"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setReplyFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="reply-file-input"
                        className="cursor-pointer inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>{replyFile ? replyFile.name : "Attach File"}</span>
                      </label>
                      {replyFile && (
                        <button
                          type="button"
                          onClick={() => setReplyFile(null)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={!replyText.trim() || isSendingReply}
                      className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    >
                      <Send className="h-3 w-3" />
                      <span>{isSendingReply ? "Sending..." : "Send Reply"}</span>
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
