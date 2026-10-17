"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, Search, ArrowRight, CornerDownLeft, Sparkles, X } from "lucide-react";
import { Macro } from "@/types/desk";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MacroPopupProps {
  isOpen: boolean;
  onClose: () => void;
  macros: Macro[];
  onApplyMacro: (macro: Macro) => void;
}

export function MacroPopup({ isOpen, onClose, macros, onApplyMacro }: MacroPopupProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredMacros = macros.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredMacros.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredMacros.length - 1));
    } else if (e.key === "Enter" && filteredMacros[selectedIndex]) {
      e.preventDefault();
      onApplyMacro(filteredMacros[selectedIndex]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/30 backdrop-blur-xs transition-opacity duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-zinc-200/80 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-3 border-b border-zinc-200/80 bg-zinc-50/70 flex items-center gap-2.5">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search macros or quick responses..."
            className="flex-1 text-xs bg-transparent border-none focus:outline-hidden text-zinc-900 placeholder:text-zinc-400"
          />
          <button
            onClick={onClose}
            className="h-6 w-6 rounded-md hover:bg-zinc-200/70 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors duration-100 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Macro List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 p-1.5">
          {filteredMacros.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              No macros found matching &quot;{search}&quot;.
            </div>
          ) : (
            filteredMacros.map((macro, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={macro.id}
                  onClick={() => {
                    onApplyMacro(macro);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer transition-colors duration-100 text-left flex items-start justify-between gap-3",
                    isSelected ? "bg-zinc-100 text-zinc-900 ring-1 ring-zinc-900/5" : "hover:bg-zinc-50/80 text-zinc-700"
                  )}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-900">
                        {macro.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-200 text-zinc-500 bg-zinc-50">
                        {macro.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-1">
                      {macro.description}
                    </p>

                    {/* Preview of actions included */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {macro.actions.map((act, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-zinc-100/80 text-zinc-600 px-1.5 py-0.5 rounded-md font-mono border border-zinc-200/50 flex items-center gap-1"
                        >
                          {act.action === "add_comment" && (
                            <>
                              <Sparkles className="h-2.5 w-2.5 text-zinc-500" />
                              <span>{act.type === "internal_note" ? "Internal Note" : "Public Reply"}</span>
                            </>
                          )}
                          {act.action === "set_status" && <span>Status: {act.value}</span>}
                          {act.action === "set_priority" && <span>Priority: {act.value}</span>}
                          {act.action === "add_tags" && <span>+Tags</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center pt-1">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-900 bg-white border border-zinc-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                        <span>Apply</span>
                        <CornerDownLeft className="h-3 w-3" />
                      </span>
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-300" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-3.5 py-2 bg-zinc-50/70 border-t border-zinc-200/80 text-[11px] text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="bg-white border border-zinc-200 px-1 py-0.5 rounded text-[10px] font-mono shadow-2xs text-zinc-600">↑</kbd>
              <kbd className="bg-white border border-zinc-200 px-1 py-0.5 rounded text-[10px] font-mono shadow-2xs ml-0.5 text-zinc-600">↓</kbd> navigate
            </span>
            <span>
              <kbd className="bg-white border border-zinc-200 px-1.5 py-0.5 rounded text-[10px] font-mono shadow-2xs text-zinc-600">Enter</kbd> apply
            </span>
          </div>
          <span>
            <kbd className="bg-white border border-zinc-200 px-1 py-0.5 rounded text-[10px] font-mono shadow-2xs text-zinc-600">Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
