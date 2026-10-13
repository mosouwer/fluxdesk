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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/40 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a macro name or action..."
            className="flex-1 text-sm bg-transparent border-none focus:outline-none text-slate-800 placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            className="h-6 w-6 rounded-md hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Macro List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1.5">
          {filteredMacros.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
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
                    "p-3 rounded-lg cursor-pointer transition-colors text-left flex items-start justify-between gap-3",
                    isSelected ? "bg-blue-50/80 text-blue-900" : "hover:bg-slate-50 text-slate-700"
                  )}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">
                        {macro.title}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {macro.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {macro.description}
                    </p>

                    {/* Preview of actions included */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {macro.actions.map((act, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono flex items-center gap-1"
                        >
                          {act.action === "add_comment" && (
                            <>
                              <Sparkles className="h-2.5 w-2.5 text-blue-500" />
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
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                        <span>Apply</span>
                        <CornerDownLeft className="h-3 w-3" />
                      </span>
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-[10px] font-mono shadow-2xs">↑</kbd>
              <kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-[10px] font-mono shadow-2xs ml-0.5">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono shadow-2xs">Enter</kbd> to apply
            </span>
          </div>
          <span>
            <kbd className="bg-white border border-slate-300 px-1 py-0.5 rounded text-[10px] font-mono shadow-2xs">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
