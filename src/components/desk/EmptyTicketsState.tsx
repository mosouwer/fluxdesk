"use client";

import React from "react";
import Link from "next/link";
import { Plus, LayoutTemplate, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyTicketsStateProps {
  className?: string;
  showWidgetLink?: boolean;
}

export function EmptyTicketsState({
  className = "",
  showWidgetLink = true,
}: EmptyTicketsStateProps) {
  const handleOpenNewTicket = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("fluxdesk:open-new-ticket"));
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-500 shadow-2xs flex flex-col items-center justify-center ${className}`}
    >
      <div className="h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-4 shadow-2xs select-none">
        <span className="text-3xl leading-none" role="img" aria-label="inbox">
          📥
        </span>
      </div>
      <h3 className="text-base font-bold text-slate-900 tracking-tight">
        No tickets found
      </h3>
      <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
        Your brand does not have any support requests yet. Tickets submitted via your website widget or customer portal will appear here.
      </p>

      {showWidgetLink && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenNewTicket}
            className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Ticket</span>
          </Button>
          <Link href="/admin/settings/widget">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 cursor-pointer">
              <LayoutTemplate className="h-3.5 w-3.5 text-slate-500" />
              <span>View Embed Widget</span>
            </Button>
          </Link>
          <Link href="/portal">
            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1.5 cursor-pointer">
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              <span>Customer Portal</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
