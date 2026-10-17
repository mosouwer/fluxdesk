"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "urgent" | "high" | "normal" | "low" | "open" | "pending" | "on_hold" | "solved" | "closed" | "internal";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground border border-input",
    urgent: "bg-red-100 text-red-800 border border-red-200 font-semibold dark:bg-red-950 dark:text-red-300",
    high: "bg-amber-100 text-amber-800 border border-amber-200 font-medium dark:bg-amber-950 dark:text-amber-300",
    normal: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    low: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300",
    open: "bg-rose-500 text-white font-medium",
    pending: "bg-blue-500 text-white font-medium",
    on_hold: "bg-slate-600 text-white font-medium",
    solved: "bg-emerald-600 text-white font-medium",
    closed: "bg-slate-700 text-white font-medium",
    internal: "bg-amber-200 text-amber-900 border border-amber-300 font-semibold",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { StatusBadge, PriorityBadge } from "./badges";
