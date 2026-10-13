"use client";

import React, { useState, useEffect } from "react";
import { Workspace } from "@/data/workspaceStore";
import { submitWidgetTicket } from "@/app/actions/widget";
import {
  LifeBuoy,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Sparkles,
  Phone,
  Mail,
  User,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface EmbeddedChatWidgetProps {
  workspace: Workspace;
}

export function EmbeddedChatWidget({ workspace }: EmbeddedChatWidgetProps) {
  const brandColor = workspace.brandColor || "#2563eb";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<{
    id: string;
    number: number;
    subject: string;
  } | null>(null);

  // Sync full branding configuration with parent iframe launcher bubble
  useEffect(() => {
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: "fluxdesk:set_branding",
          color: brandColor,
          launcherText: workspace.launcherText || "Chat with us",
          showLauncherText: Boolean(workspace.showLauncherText),
          launcherIconUrl: workspace.launcherIconUrl || "",
          logoUrl: workspace.logoUrl || "",
          workspaceName: workspace.name,
        },
        "*"
      );
    }
  }, [
    brandColor,
    workspace.launcherText,
    workspace.showLauncherText,
    workspace.launcherIconUrl,
    workspace.logoUrl,
    workspace.name,
  ]);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "fluxdesk:close" }, "*");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!message.trim()) {
      setErrorMessage("Please describe your question or issue.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitWidgetTicket({
        publicKey: workspace.publicKey || workspace.slug || workspace.id,
        name,
        email,
        phone,
        subject: subject.trim() || "Inquiry from " + name,
        message,
      });

      if (result.success && result.ticket) {
        setSubmittedTicket(result.ticket);
      } else {
        setErrorMessage(result.error || "Failed to send message. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedTicket(null);
    setMessage("");
    setSubject("");
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased select-none overflow-hidden">
      {/* Widget Header with dynamic brand color & logo */}
      <header
        className="px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-sm transition-colors duration-300"
        style={{ backgroundColor: brandColor }}
      >
        <div className="flex items-center gap-3">
          {workspace.logoUrl ? (
            <img
              src={workspace.logoUrl}
              alt={workspace.name}
              className="h-9 w-9 rounded-xl object-cover bg-white/20 shadow-2xs border border-white/20"
            />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-2xs">
              <LifeBuoy className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-sm tracking-tight leading-none text-white drop-shadow-xs">
              {workspace.name}
            </h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-white/90 font-medium">
                Typically replies in minutes
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          aria-label="Close chat"
          className="h-8 w-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col justify-between">
        {submittedTicket ? (
          /* Success Screen */
          <div className="my-auto py-6 px-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto shadow-2xs text-white"
              style={{ backgroundColor: brandColor }}
            >
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                Ticket #{submittedTicket.number}
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Message Sent Successfully!
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Thank you, <strong>{name}</strong>. Your inquiry has been routed directly to the{" "}
                <strong>{workspace.name}</strong> support desk. We will respond to{" "}
                <span className="text-slate-700 font-semibold">{email}</span> shortly.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleReset}
                type="button"
                className="w-full h-8.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Send another message</span>
              </button>
              <button
                onClick={handleClose}
                type="button"
                className="w-full h-8.5 text-xs font-semibold rounded-lg text-white shadow-2xs transition-opacity hover:opacity-95"
                style={{ backgroundColor: brandColor }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Intake Form */
          <div className="space-y-4">
            {/* Friendly Agent Welcome Bubble */}
            <div className="flex items-start gap-2.5">
              {workspace.logoUrl ? (
                <img
                  src={workspace.logoUrl}
                  alt={workspace.name}
                  className="h-7 w-7 rounded-full object-cover shrink-0 shadow-2xs mt-0.5 border border-slate-200"
                />
              ) : (
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs mt-0.5"
                  style={{ backgroundColor: brandColor }}
                >
                  {workspace.name.charAt(0)}
                </div>
              )}
              <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-700 shadow-2xs space-y-1 max-w-[88%]">
                <p className="font-semibold text-slate-900">
                  {workspace.welcomeTitle || "Hi there! 👋 How can we help you today?"}
                </p>
                <p className="text-slate-500 text-[11px] leading-snug">
                  {workspace.welcomeSubtitle ||
                    "Fill in your details below and a member of our team will assist you right away."}
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sarah Miller"
                    className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  How can we help? <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-900 placeholder:text-slate-400 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 rounded-lg text-xs font-bold text-white shadow-xs hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sending message...</span>
                  </>
                ) : (
                  <>
                    <span>Send Message</span>
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer Brand Attribution */}
        <footer className="pt-3 text-center">
          <div className="inline-flex items-center gap-1 text-[10px] text-slate-400">
            <span>Powered by</span>
            <span className="font-semibold text-slate-600">FluxDesk</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
