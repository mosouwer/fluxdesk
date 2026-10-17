"use client";

import React, { useState } from "react";
import {
  X,
  Ticket,
  User,
  Mail,
  Phone,
  Tag,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAgentTicket } from "@/app/actions/tickets";
import { Ticket as DeskTicket, TicketPriority, TicketChannel, User as DeskUser } from "@/types/desk";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated?: (ticket: DeskTicket) => void;
  currentUser?: DeskUser;
}

export function CreateTicketModal({
  isOpen,
  onClose,
  onTicketCreated,
  currentUser,
}: CreateTicketModalProps) {
  const [subject, setSubject] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [channel, setChannel] = useState<TicketChannel>("email");
  const [tagsInput, setTagsInput] = useState("");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setSubject("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setPriority("normal");
    setChannel("email");
    setTagsInput("");
    setDescription("");
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);

    const cleanSubject = subject.trim();
    const cleanCustomerName = customerName.trim();
    const cleanCustomerEmail = customerEmail.trim();
    const cleanDescription = description.trim();

    if (!cleanSubject) {
      setErrorMessage("Please enter a ticket subject.");
      return;
    }
    if (!cleanCustomerName) {
      setErrorMessage("Please enter the customer's name.");
      return;
    }
    if (!cleanCustomerEmail) {
      setErrorMessage("Please provide a valid customer email.");
      return;
    }
    if (!cleanDescription) {
      setErrorMessage("Please enter an initial message or issue description.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    setIsSubmitting(true);

    try {
      const res = await createAgentTicket({
        subject: cleanSubject,
        customerName: cleanCustomerName,
        customerEmail: cleanCustomerEmail,
        customerPhone: customerPhone.trim() || undefined,
        priority,
        channel,
        tags,
        description: cleanDescription,
        assignedAgentId: currentUser?.id,
        assignedAgentName: currentUser?.name,
      });

      if (!res.success || !res.ticket) {
        setErrorMessage(res.error || "Failed to create ticket. Please check your network.");
        setIsSubmitting(false);
        return;
      }

      // Success
      resetForm();
      onClose();
      if (onTicketCreated) {
        onTicketCreated(res.ticket);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while creating ticket.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/30 backdrop-blur-xs transition-opacity duration-150">
      <div
        className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ticket-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 bg-zinc-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-zinc-100 text-zinc-900 flex items-center justify-center border border-zinc-200/80">
              <Ticket className="h-4 w-4" />
            </div>
            <div>
              <h2 id="create-ticket-title" className="text-sm font-semibold text-zinc-900 tracking-tight">
                Create New Ticket
              </h2>
              <p className="text-[11px] text-zinc-500">
                Log a new support request on behalf of a customer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-md hover:bg-zinc-100 transition-colors duration-100 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Section: Customer Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              <User className="h-3.5 w-3.5 text-zinc-600" />
              <span>Customer Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 transition-colors duration-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Customer Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="email"
                    required
                    placeholder="sarah@acme.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 transition-colors duration-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Phone Number <span className="text-zinc-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="tel"
                  placeholder="+1 (555) 234-5678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 transition-colors duration-100"
                />
              </div>
            </div>
          </div>

          <hr className="border-zinc-100" />

          {/* Section: Ticket Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              <MessageSquare className="h-3.5 w-3.5 text-zinc-600" />
              <span>Ticket Details</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Unable to export CSV reports from dashboard"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 font-medium transition-colors duration-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 capitalize transition-colors duration-100 cursor-pointer"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as TicketChannel)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 capitalize transition-colors duration-100 cursor-pointer"
                >
                  <option value="email">Email</option>
                  <option value="web">Web Portal</option>
                  <option value="chat">Chat Widget</option>
                  <option value="api">API / Internal</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Tags <span className="text-zinc-400 font-normal">(comma-separated)</span>
              </label>
              <div className="relative">
                <Tag className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="e.g. billing, export, high-value"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 transition-colors duration-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Description / Initial Message <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Provide detailed description of the customer's request or reported problem..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 text-zinc-900 leading-relaxed resize-y transition-colors duration-100"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-xs font-medium border-zinc-200 text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg shadow-2xs gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Ticket...</span>
                </>
              ) : (
                <>
                  <Ticket className="h-3.5 w-3.5" />
                  <span>Create Ticket</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
