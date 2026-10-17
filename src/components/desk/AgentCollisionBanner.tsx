"use client";

import React from "react";
import { AlertTriangle, Eye, Edit3, Lock, Users, Sparkles } from "lucide-react";
import { AgentPresence } from "@/types/realtime";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AgentCollisionBannerProps {
  agentsTyping: AgentPresence[];
  agentsViewing: AgentPresence[];
}

export function AgentCollisionBanner({
  agentsTyping,
  agentsViewing,
}: AgentCollisionBannerProps) {
  if (agentsTyping.length === 0 && agentsViewing.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-3">
      {/* 1. Critical Collision Warning: Agent currently drafting a reply */}
      {agentsTyping.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 shadow-2xs transition-all duration-150">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Alert Icon */}
              <div className="relative shrink-0">
                <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-900 border border-amber-200/80 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                </div>
              </div>

              {/* Message Details */}
              <div className="text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    Collision Warning:
                  </span>
                  {agentsTyping.map((agent) => (
                    <span
                      key={agent.agentId}
                      className="inline-flex items-center gap-1.5 font-bold text-xs text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md border border-amber-300"
                    >
                      <Avatar
                        src={agent.agentAvatar}
                        fallback={agent.agentName[0]}
                        size="sm"
                        className="h-4 w-4 text-[9px]"
                      />
                      Agent {agent.agentName}
                    </span>
                  ))}
                  <span className="text-xs font-semibold text-amber-900">
                    is currently drafting a reply
                  </span>
                </div>

                <p className="text-[11px] text-amber-800/90 mt-0.5 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Edit3 className="h-3 w-3 text-amber-700" />
                    {agentsTyping.some((a) => a.typingType === "internal_note") ? (
                      <span className="flex items-center gap-1 font-medium">
                        <Lock className="h-3 w-3" /> Drafting an Internal Note
                      </span>
                    ) : (
                      <span className="font-medium">Drafting a Public Reply</span>
                    )}
                  </span>
                  <span>•</span>
                  <span>Coordinate with your teammate to avoid duplicate customer responses.</span>
                </p>
              </div>
            </div>

            {/* Quick action tag */}
            <div className="shrink-0 hidden md:block">
              <span className="text-[10px] font-bold text-amber-800 bg-white/80 border border-amber-300 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                Realtime Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Passive Presence Banner: Another agent viewing the ticket */}
      {agentsTyping.length === 0 && agentsViewing.length > 0 && (
        <div className="bg-zinc-50/90 border border-zinc-200/80 rounded-lg px-3 py-2 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 text-zinc-700">
            <Eye className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <span className="font-normal">
              {agentsViewing.length === 1 ? (
                <>
                  Agent <strong className="font-semibold text-zinc-900">{agentsViewing[0].agentName}</strong> is also viewing this ticket.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-zinc-900">{agentsViewing.length} agents</strong> ({agentsViewing.map((a) => a.agentName).join(", ")}) are viewing this ticket.
                </>
              )}
            </span>
          </div>

          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {agentsViewing.map((agent) => (
              <Avatar
                key={agent.agentId}
                src={agent.agentAvatar}
                fallback={agent.agentName[0]}
                size="sm"
                className="h-5 w-5 border-2 border-white ring-1 ring-zinc-200"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
