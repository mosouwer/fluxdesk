"use client";

import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  Code2,
  ExternalLink,
  Sparkles,
  Terminal,
  Layers,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetSnippetBoxProps {
  publicKey: string;
  brandColor?: string;
  appUrl?: string;
}

export function WidgetSnippetBox({
  publicKey,
  brandColor = "#2563eb",
  appUrl: initialAppUrl,
}: WidgetSnippetBoxProps) {
  const [copied, setCopied] = useState(false);
  const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const [origin, setOrigin] = useState(initialAppUrl || defaultAppUrl);

  useEffect(() => {
    if (!initialAppUrl && !process.env.NEXT_PUBLIC_APP_URL && typeof window !== "undefined" && window.location) {
      setOrigin(window.location.origin);
    }
  }, [initialAppUrl]);

  const snippetCode = `<script\n  src="${origin}/widget.js"\n  data-workspace-key="${publicKey}"\n  async\n></script>`;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(snippetCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-white shadow-md space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center shadow-2xs">
            <Code2 className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-2">
              Embeddable Widget Tag
              <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Live &amp; Ready
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Paste this snippet right before the closing <code className="text-blue-300 font-mono text-[11px]">&lt;/body&gt;</code> tag on any webpage.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          type="button"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-300" />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Code Snippet</span>
            </>
          )}
        </button>
      </div>

      {/* Code Container */}
      <div className="relative rounded-xl bg-slate-950 border border-slate-800/90 p-4 font-mono text-xs overflow-x-auto shadow-inner group">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500/80" />
            <span className="h-2 w-2 rounded-full bg-amber-500/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
            <span className="ml-2 font-sans font-medium text-slate-400">HTML Script Embed</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 uppercase">JavaScript</span>
        </div>

        <pre className="text-slate-200 leading-relaxed overflow-x-auto py-1">
          <span className="text-slate-500">&lt;</span>
          <span className="text-pink-400">script</span>
          {"\n"}  <span className="text-purple-300">src</span>
          <span className="text-slate-500">=</span>
          <span className="text-emerald-300">&quot;{origin}/widget.js&quot;</span>
          {"\n"}  <span className="text-purple-300">data-workspace-key</span>
          <span className="text-slate-500">=</span>
          <span className="text-amber-300">&quot;{publicKey}&quot;</span>
          {"\n"}  <span className="text-purple-300">async</span>
          {"\n"}
          <span className="text-slate-500">&gt;&lt;/</span>
          <span className="text-pink-400">script</span>
          <span className="text-slate-500">&gt;</span>
        </pre>
      </div>

      {/* Quick Test Links & Platform Badges */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400">Supported Platforms:</span>
          <span className="bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium">
            WordPress
          </span>
          <span className="bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium">
            Shopify
          </span>
          <span className="bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium">
            Webflow
          </span>
          <span className="bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded text-[10px] text-slate-300 font-medium">
            Next.js / React
          </span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/embed/chat?key=${encodeURIComponent(publicKey)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>Test Chat Endpoint</span>
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="/widget-demo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>Sandbox Demo</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
