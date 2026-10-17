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
  brandName?: string;
  workspaceName?: string;
  onTicketCreated?: (ticket: Ticket) => void;
}

export function DeskHeader({
  onRefresh,
  isRefreshing = false,
  searchQuery,
  onSearchChange,
  onClearSearch,
  currentUser = CURRENT_AGENT,
  brandName,
  workspaceName,
  onTicketCreated,
}: DeskHeaderProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [localQuery, setLocalQuery] = useState("");
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  const displayBrandName =
    brandName ||
    workspaceName ||
    currentUser?.workspaceName ||
    currentUser?.company ||
    (currentUser?.role === "superadmin" ? "Super Admin" : "mellowDesk");

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
    <header className="h-12 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
      {/* Brand & Workspace */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 font-semibold text-zinc-900 tracking-tight text-sm">
          <div className="h-7 w-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-xs">
            <LifeBuoy className="h-4 w-4" />
          </div>
          <span className="font-semibold">mellowDesk</span>
        </div>

        <div className="h-3.5 w-[1px] bg-zinc-200 mx-0.5" />

        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 bg-zinc-100/80 border border-zinc-200/80 rounded-md px-2 py-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-medium text-zinc-800">{displayBrandName}</span>
        </div>

        {/* Admin Panel button - Only visible to Admins */}
        {currentUser?.role === "admin" && (
          <div className="hidden lg:flex items-center gap-1.5 pl-1">
            <Link
              href="/admin/dashboard"
              className="text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100/70 hover:bg-zinc-200/60 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1.5 border border-zinc-200/80 shadow-2xs"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-zinc-600" />
              <span>Admin</span>
            </Link>
          </div>
        )}
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-sm mx-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={currentQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search tickets, owners, customers... (/)"
            className="w-full h-7.5 pl-8 pr-12 text-xs bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white transition-colors text-zinc-800 placeholder:text-zinc-400"
          />
          {currentQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded cursor-pointer"
              title="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("fluxdesk:open-command-menu"));
                window.dispatchEvent(new CustomEvent("mellowdesk:open-command-menu"));
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-700 rounded px-1 py-0.2 font-mono shadow-2xs cursor-pointer"
              title="Open Command Menu (⌘K)"
            >
              ⌘K
            </button>
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
              "h-7.5 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-medium border border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer",
              isRefreshing && "text-zinc-900 bg-zinc-100"
            )}
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin text-zinc-900")} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        )}

        <Button
          size="sm"
          onClick={() => setIsNewTicketOpen(true)}
          className="h-7.5 px-2.5 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-xs cursor-pointer font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Ticket</span>
        </Button>

        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent("fluxdesk:open-command-menu"));
            window.dispatchEvent(new CustomEvent("mellowdesk:open-command-menu"));
          }}
          title="Command Menu"
          className="h-7.5 w-7.5 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 border border-transparent hover:border-zinc-200/60 transition-colors cursor-pointer"
        >
          <Bell className="h-3.5 w-3.5" />
        </button>

        {currentUser?.role === "admin" && (
          <Link
            href="/admin/dashboard"
            title="Admin Panel & Analytics"
            className="h-7.5 w-7.5 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent hover:border-zinc-200/60 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
        )}

        <div className="h-3.5 w-[1px] bg-zinc-200 mx-0.5" />

        {/* Current User Info & Switch / Logout */}
        <div className="flex items-center gap-2 pl-0.5">
          <Avatar
            src={currentUser.avatar}
            fallback={currentUser.name[0]}
            size="sm"
            className="h-7 w-7 text-xs"
          />
          <div className="text-left hidden md:block">
            <div className="text-xs font-semibold text-zinc-900 flex items-center gap-1 leading-tight">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1 leading-none mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{currentUser.role === "admin" ? "Admin" : "Agent"}</span>
            </div>
          </div>

          <form action={logoutUser} className="inline-flex">
            <button
              type="submit"
              title="Sign Out (Log Out Session)"
              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50/70 transition-colors rounded-lg ml-0.5 cursor-pointer"
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
