"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Inbox,
  MessageSquare,
  BarChart3,
  Users,
  SlidersHorizontal,
  Search,
  Sparkles,
  LifeBuoy,
  Ticket as TicketIcon,
  ShieldCheck,
  Plus,
} from "lucide-react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const handleCustomOpen = () => setOpen(true);

    window.addEventListener("keydown", down);
    window.addEventListener("fluxdesk:open-command-menu", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("fluxdesk:open-command-menu", handleCustomOpen);
    };
  }, []);

  const navigateTo = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const dispatchAction = (eventName: string) => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent(eventName));
  };

  if (!open) return null;

  return (
    <div
      className="bg-black/20 backdrop-blur-xs fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-zinc-200/80 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="w-full" label="Global Command Menu">
          {/* Search Input Bar */}
          <div className="flex items-center border-b border-zinc-100 px-3.5 py-2.5">
            <Search className="h-4 w-4 text-zinc-400 mr-2.5 shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Type a command or jump to..."
              className="w-full text-xs text-zinc-900 placeholder:text-zinc-400 bg-transparent outline-none border-none focus:ring-0"
            />
            <kbd className="px-1.5 py-0.5 text-[10px] bg-zinc-100 border border-zinc-200 rounded text-zinc-400 font-mono">
              ESC
            </kbd>
          </div>

          {/* Command List */}
          <Command.List className="max-h-72 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-8 text-center text-xs text-zinc-400">
              No results found.
            </Command.Empty>

            {/* Quick Actions Group */}
            <Command.Group
              heading="Quick Actions"
              className="text-[11px] font-semibold text-zinc-400 px-2 py-1 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
            >
              <Command.Item
                onSelect={() => dispatchAction("fluxdesk:open-new-ticket")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900 cursor-pointer transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-zinc-500" />
                <span>Create New Ticket</span>
              </Command.Item>
            </Command.Group>

            {/* Quick Navigation Commands */}
            <Command.Group
              heading="Navigation"
              className="text-[11px] font-semibold text-zinc-400 px-2 py-1 uppercase tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
            >
              <Command.Item
                onSelect={() => navigateTo("/agent")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900 cursor-pointer transition-colors"
              >
                <Inbox className="h-3.5 w-3.5 text-zinc-500" />
                <span>Go to Open Tickets</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/agent?view=live_chats")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900 cursor-pointer transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
                <span>Go to Live Chats</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/admin/dashboard")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900 cursor-pointer transition-colors"
              >
                <BarChart3 className="h-3.5 w-3.5 text-zinc-500" />
                <span>Go to Admin Analytics</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/admin/team")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900 cursor-pointer transition-colors"
              >
                <Users className="h-3.5 w-3.5 text-zinc-500" />
                <span>Go to Team Settings</span>
              </Command.Item>

              <Command.Item
                onSelect={() => navigateTo("/admin/settings/widget")}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 data-[selected=true]:bg-zinc-100 data-[selected=true]:text-zinc-900 cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                <span>Customize Brand Widget</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer Hints */}
          <div className="border-t border-zinc-100 px-3.5 py-2 flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-50/50">
            <span className="flex items-center gap-1 font-medium">
              <span>mellowDesk Command</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span>Navigate</span>
              <kbd className="px-1 py-0.5 text-[10px] bg-white border border-zinc-200 rounded text-zinc-500 font-mono">
                ↑
              </kbd>
              <kbd className="px-1 py-0.5 text-[10px] bg-white border border-zinc-200 rounded text-zinc-500 font-mono">
                ↓
              </kbd>
              <span>Select</span>
              <kbd className="px-1 py-0.5 text-[10px] bg-white border border-zinc-200 rounded text-zinc-500 font-mono">
                ↵
              </kbd>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
