"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LifeBuoy, Search, Bell, Settings, Plus, ShieldCheck, RefreshCw, X, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CURRENT_AGENT } from "@/data/mockDeskData";
import { User, Ticket } from "@/types/desk";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/app/actions/auth";
import { CreateTicketModal } from "@/components/desk/CreateTicketModal";

interface DeskHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onClearSearch?: () => void;
  currentUser?: User;
  onTicketCreated?: (ticket: Ticket) => void;
}

export function DeskHeader({
  onRefresh,
  isRefreshing = false,
  searchQuery,
  onSearchChange,
  onClearSearch,
  currentUser = CURRENT_AGENT,
  onTicketCreated,
}: DeskHeaderProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState("");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  const isControlled = onSearchChange !== undefined;
  const currentQuery = isControlled ? (searchQuery ?? "") : localQuery;

  // Listen for global open new ticket custom event
  useEffect(() => {
    const handleOpen = () => setIsNewTicketOpen(true);
    window.addEventListener("fluxdesk:open-new-ticket", handleOpen);
    return () => window.removeEventListener("fluxdesk:open-new-ticket", handleOpen);
  }, []);

  // Global keyboard shortcut '/' to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (isControlled) {
      onSearchChange(val);
    } else {
      setLocalQuery(val);
    }
  };

  const handleClear = () => {
    if (isControlled && onClearSearch) {
      onClearSearch();
    } else {
      setLocalQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isControlled && localQuery.trim()) {
      router.push(`/agent?search=${encodeURIComponent(localQuery.trim())}`);
    } else if (e.key === "Escape") {
      handleClear();
      searchInputRef.current?.blur();
    }
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10">
      {/* Brand & Workspace */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-slate-900 tracking-tight text-base">
          <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <LifeBuoy className="h-4.5 w-4.5" />
          </div>
          <span>FluxDesk</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-900">Acme Cloud Technologies</span>
          <span className="text-slate-400">/ Support Desk</span>
        </div>

        {/* Admin Panel button - Only visible to Admins */}
        {currentUser?.role === "admin" && (
          <div className="hidden lg:flex items-center gap-1.5 pl-2">
            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 hover:text-purple-800 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 border border-purple-200 shadow-2xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
              <span>Admin Panel</span>
            </Link>
          </div>
        )}
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={currentQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search ticket #, owner, customer (name/phone)..."
            className="w-full h-8 pl-9 pr-14 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
          />
          {currentQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white border border-slate-200 text-slate-400 rounded px-1.5 py-0.5 font-mono shadow-2xs pointer-events-none">
              /
            </kbd>
          )}
        </div>
      </div>

      {/* Agent Actions & Profile */}
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Reload Tickets & Views"
            className={cn(
              "h-8 px-2.5 flex items-center gap-1.5 rounded-md text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs disabled:opacity-50",
              isRefreshing && "text-blue-600 bg-blue-50/70 border-blue-200"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin text-blue-600")} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        )}

        <Button
          size="sm"
          onClick={() => setIsNewTicketOpen(true)}
          className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Ticket</span>
        </Button>

        <button className="h-8 w-8 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        {currentUser?.role === "admin" && (
          <Link
            href="/admin/dashboard"
            title="Admin Panel & Analytics"
            className="h-8 w-8 flex items-center justify-center rounded-md text-purple-600 hover:text-purple-800 hover:bg-purple-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Link>
        )}

        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

        {/* Current User Info & Switch / Logout */}
        <div className="flex items-center gap-2 pl-1">
          <Avatar
            src={currentUser.avatar}
            fallback={currentUser.name[0]}
            size="sm"
          />
          <div className="text-left hidden md:block">
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
              {currentUser.name}
              {currentUser.role === "admin" ? (
                <ShieldCheck className="h-3 w-3 text-purple-600" />
              ) : (
                <ShieldCheck className="h-3 w-3 text-blue-500" />
              )}
            </div>
            <div
              className={cn(
                "text-[10px] font-medium leading-none flex items-center gap-1",
                currentUser.role === "admin" ? "text-purple-600" : "text-emerald-600"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  currentUser.role === "admin" ? "bg-purple-500" : "bg-emerald-500"
                )}
              />
              {currentUser.role === "admin" ? "Online (Admin)" : "Online (Agent)"}
            </div>
          </div>

          <form action={logoutUser} className="inline-flex">
            <button
              type="submit"
              title="Sign Out (Log Out Session)"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-md ml-1 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* New Ticket Modal */}
      <CreateTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        currentUser={currentUser}
        onTicketCreated={(ticket) => {
          setIsNewTicketOpen(false);
          if (onTicketCreated) {
            onTicketCreated(ticket);
          }
          router.refresh();
        }}
      />
    </header>
  );
}
