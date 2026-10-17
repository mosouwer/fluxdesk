"use client";

import React, { useState, useRef } from "react";
import {
  Paperclip,
  CheckCircle2,
  FileText,
  AlertCircle,
  X,
  UploadCloud,
  Loader2,
  Send,
} from "lucide-react";
import { submitNewTicket } from "@/app/actions/tickets";
import { Ticket, TicketPriority } from "@/types/desk";
import { Button } from "@/components/ui/button";

interface SubmitTicketFormProps {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  workspaceId?: string;
  onTicketCreated?: (ticket: Ticket) => void;
}

export function SubmitTicketForm({
  customerName = "Emily Watson",
  customerEmail = "emily.watson@enterprise-client.com",
  customerPhone: defaultPhone = "+1 (555) 392-8819",
  workspaceId,
  onTicketCreated,
}: SubmitTicketFormProps) {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("normal");
  const [phone, setPhone] = useState(defaultPhone);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 26214400) {
        setErrorMsg("File size exceeds 25MB limit.");
        return;
      }
      setErrorMsg(null);
      setFile(selected);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMsg("Please fill out both Subject and Description.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Please provide your Contact Phone Number.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("name", customerName);
    formData.append("email", customerEmail);
    formData.append("phone", phone.trim());
    formData.append("subject", subject.trim());
    formData.append("priority", priority);
    formData.append("description", description.trim());
    if (workspaceId) {
      formData.append("workspace_id", workspaceId);
    }
    if (file) {
      formData.append("file", file);
    }

    try {
      const response = await submitNewTicket(formData);

      if (response.success && response.ticket) {
        setCreatedTicket(response.ticket);
        // Reset form fields upon successful creation
        setSubject("");
        setPriority("normal");
        setDescription("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        if (onTicketCreated) {
          onTicketCreated(response.ticket);
        }
      } else {
        setErrorMsg(response.error || "Failed to submit ticket. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred while submitting.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left">
      {/* Form Header */}
      <div className="p-6 border-b border-slate-100 bg-linear-to-b from-blue-50/50 to-white">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Submit a Support Request
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Have an issue or question? Fill in the details below and our team will get back to you shortly.
        </p>
      </div>

      {/* Success Banner */}
      {createdTicket && (
        <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-emerald-950 text-sm">
              Ticket #{createdTicket.number} Submitted Successfully!
            </h4>
            <p className="text-emerald-800 mt-0.5">
              Your request &quot;{createdTicket.subject}&quot; has been recorded. Our support agents have been notified and will reply shortly.
            </p>
            <button
              type="button"
              onClick={() => setCreatedTicket(null)}
              className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
            >
              Dismiss or Submit Another Request
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreatedTicket(null)}
            className="text-emerald-400 hover:text-emerald-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="mx-6 mt-6 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Subject */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isLoading}
              placeholder="e.g. Cannot access database replica in us-east-1"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 disabled:opacity-50"
            />
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              disabled={isLoading}
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 disabled:opacity-50"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              disabled={isLoading}
              onChange={(e) => setPriority(e.target.value as TicketPriority)}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 cursor-pointer disabled:opacity-50"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={5}
            required
            disabled={isLoading}
            placeholder="Please describe the issue, steps to reproduce, or any error messages..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 resize-y disabled:opacity-50"
          />
        </div>

        {/* Attachment Upload Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Attachment (Optional)
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 transition-colors bg-slate-50/50">
            <input
              type="file"
              ref={fileInputRef}
              disabled={isLoading}
              id="submit-file-input"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 max-w-sm mx-auto shadow-2xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="font-medium truncate">{file.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleRemoveFile}
                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="submit-file-input"
                className="cursor-pointer flex flex-col items-center gap-1.5"
              >
                <UploadCloud className="h-6 w-6 text-slate-400" />
                <span className="text-xs font-semibold text-blue-600 hover:underline">
                  Choose a file to attach
                </span>
                <span className="text-[11px] text-slate-400">
                  Screenshots, logs, or documents up to 25MB (stored in Supabase ticket-attachments)
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Submitting as <strong className="text-slate-600">{customerEmail}</strong>
          </span>

          <Button
            type="submit"
            disabled={isLoading || !subject.trim() || !description.trim()}
            className="h-9 px-6 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading & Submitting...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Submit Ticket</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
