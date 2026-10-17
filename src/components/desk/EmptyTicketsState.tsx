"use client";

import React from "react";
import Link from "next/link";
import { Plus, LayoutTemplate, Globe, Inbox } from "lucide-react";
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
      window.dispatchEvent(new CustomEvent("mellowdesk:open-new-ticket"));
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border border-zinc-200/80 p-10 text-center text-zinc-500 shadow-2xs flex flex-col items-center justify-center ${className}`}
    >
      <div className="h-11 w-11 rounded-xl bg-zinc-100 text-zinc-600 border border-zinc-200/60 flex items-center justify-center mx-auto mb-3 shadow-2xs select-none">
        <Inbox className="h-5 w-5 text-zinc-600" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
        No tickets found
      </h3>
      <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
        Your brand does not have any support requests yet. Tickets submitted via your website widget or customer portal will appear here.
      </p>

      {showWidgetLink && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenNewTicket}
            className="h-7.5 px-3 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white gap-1.5 shadow-xs cursor-pointer rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Ticket</span>
          </Button>
          <Link href="/admin/settings/widget">
            <Button variant="outline" size="sm" className="h-7.5 text-xs font-medium gap-1.5 cursor-pointer rounded-lg border-zinc-200/80 hover:bg-zinc-50 text-zinc-700">
              <LayoutTemplate className="h-3.5 w-3.5 text-zinc-500" />
              <span>Embed Widget</span>
            </Button>
          </Link>
          <Link href="/portal">
            <Button variant="outline" size="sm" className="h-7.5 text-xs font-medium gap-1.5 cursor-pointer rounded-lg border-zinc-200/80 hover:bg-zinc-50 text-zinc-700">
              <Globe className="h-3.5 w-3.5 text-zinc-500" />
              <span>Customer Portal</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
