"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TicketStatus, TicketPriority } from "@/types/desk";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: TicketStatus | string;
  showDot?: boolean;
}

const statusConfig: Record<
  string,
  { label: string; container: string; dot: string }
> = {
  open: {
    label: "Open",
    container: "bg-amber-50 text-amber-700 border-amber-200/60",
    dot: "bg-amber-500",
  },
  pending: {
    label: "Pending",
    container: "bg-blue-50 text-blue-700 border-blue-200/60",
    dot: "bg-blue-500",
  },
  on_hold: {
    label: "On Hold",
    container: "bg-purple-50 text-purple-700 border-purple-200/60",
    dot: "bg-purple-500",
  },
  solved: {
    label: "Solved",
    container: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    dot: "bg-emerald-500",
  },
  closed: {
    label: "Closed",
    container: "bg-zinc-100 text-zinc-600 border-zinc-200/60",
    dot: "bg-zinc-400",
  },
};

export function StatusBadge({
  status,
  showDot = true,
  className,
  ...props
}: StatusBadgeProps) {
  const normalized = (status || "").toLowerCase().replace(/[-\s]/g, "_");
  const config = statusConfig[normalized] || {
    label: status,
    container: "bg-zinc-100 text-zinc-600 border-zinc-200/60",
    dot: "bg-zinc-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors shrink-0 select-none",
        config.container,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)}
          aria-hidden="true"
        />
      )}
      <span className="capitalize">{config.label}</span>
    </span>
  );
}

interface PriorityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: TicketPriority | string;
  showDot?: boolean;
}

const priorityConfig: Record<
  string,
  { label: string; container: string; dot: string }
> = {
  urgent: {
    label: "Urgent",
    container: "bg-rose-50 text-rose-700 border-rose-200/60",
    dot: "bg-rose-500",
  },
  high: {
    label: "High",
    container: "bg-orange-50 text-orange-700 border-orange-200/60",
    dot: "bg-orange-500",
  },
  normal: {
    label: "Normal",
    container: "bg-blue-50 text-blue-700 border-blue-200/60",
    dot: "bg-blue-500",
  },
  medium: {
    label: "Medium",
    container: "bg-blue-50 text-blue-700 border-blue-200/60",
    dot: "bg-blue-500",
  },
  low: {
    label: "Low",
    container: "bg-zinc-100 text-zinc-600 border-zinc-200/60",
    dot: "bg-zinc-400",
  },
};

export function PriorityBadge({
  priority,
  showDot = true,
  className,
  ...props
}: PriorityBadgeProps) {
  const normalized = (priority || "").toLowerCase().trim();
  const config = priorityConfig[normalized] || {
    label: priority,
    container: "bg-zinc-100 text-zinc-600 border-zinc-200/60",
    dot: "bg-zinc-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors shrink-0 select-none",
        config.container,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)}
          aria-hidden="true"
        />
      )}
      <span className="capitalize">{config.label}</span>
    </span>
  );
}
