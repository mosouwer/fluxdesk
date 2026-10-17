"use client";

import React from "react";
import { Search } from "lucide-react";

interface CommandMenuTriggerProps {
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export function CommandMenuTrigger({
  className = "hidden md:inline-flex items-center gap-2 h-7.5 px-2.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/80 text-zinc-500 hover:text-zinc-900 transition-colors shadow-2xs cursor-pointer",
  showIcon = true,
  label = "Search or jump to...",
}: CommandMenuTriggerProps) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("fluxdesk:open-command-menu"));
    window.dispatchEvent(new CustomEvent("mellowdesk:open-command-menu"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      title="Open Command Menu (⌘K)"
    >
      {showIcon && <Search className="h-3.5 w-3.5 text-zinc-400" />}
      {label && <span>{label}</span>}
      <kbd className="px-1.5 py-0.2 text-[10px] bg-white border border-zinc-200 rounded text-zinc-400 font-mono">
        ⌘K
      </kbd>
    </button>
  );
}
