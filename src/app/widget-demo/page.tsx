"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  Code,
  Copy,
  Check,
  LifeBuoy,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Layers,
  Globe,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WidgetDemoPage() {
  const [copied, setCopied] = useState(false);
  const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const [origin, setOrigin] = useState(defaultAppUrl);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_APP_URL && typeof window !== "undefined" && window.location) {
      setOrigin(window.location.origin);
    }
  }, []);

  const embedCode = `<script\n  src="${origin}/widget.js"\n  data-workspace-key="pk_live_acme_cloud_tech"\n  async\n></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Load the actual floating widget script onto this page */}
      <Script src="/widget.js" data-workspace-key="pk_live_acme_cloud_tech" strategy="afterInteractive" />

      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
            <LifeBuoy className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-bold text-white text-sm block leading-tight">
              External SaaS Website Demo
            </span>
            <span className="text-[11px] text-slate-400">
              Simulating an external website embedding FluxDesk Widget
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/portal"
            className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
          >
            Customer Portal
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-md bg-blue-950/50 border border-blue-800/80 transition-colors flex items-center gap-1.5"
          >
            <span>Agent Desk</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Main Demo Page Body */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        {/* Banner */}
        <div className="bg-linear-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 border border-blue-800/40 rounded-2xl p-6 shadow-xl text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-950/80 border border-blue-800 px-2.5 py-0.5 rounded-full mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Embeddable Web Widget Live Demo</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Single-Script Help Desk Widget
          </h1>
          <p className="text-xs text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Look at the <strong>bottom-right corner</strong> of this page! The floating blue chat bubble was injected automatically by a single &lt;script&gt; tag. Customers can click it anywhere on your marketing site, docs, or web application to submit support tickets with file attachments.
          </p>
        </div>

        {/* Code Snippet Box */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 text-left shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Code className="h-4 w-4 text-blue-400" />
              <span>Copy Embed Snippet for External Sites</span>
            </div>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy HTML</span>
                </>
              )}
            </button>
          </div>

          <pre className="bg-slate-900 p-4 rounded-lg text-xs font-mono text-emerald-400 border border-slate-800 overflow-x-auto leading-relaxed">
            {embedCode}
          </pre>
        </div>

        {/* Simulated Website UI */}
        <div className="space-y-4 text-left">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Simulated Web App Dashboard
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Total API Volume</div>
              <div className="text-xl font-bold text-white mt-1">2,481,902</div>
              <div className="text-[10px] text-emerald-400 mt-1">↑ 14.2% this month</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Active Workspaces</div>
              <div className="text-xl font-bold text-white mt-1">48 tenants</div>
              <div className="text-[10px] text-slate-400 mt-1">Acme Cloud Org</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">System Uptime</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">99.98%</div>
              <div className="text-[10px] text-slate-400 mt-1">All regions operational</div>
            </div>
          </div>
        </div>

        {/* Instruction Callout */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 text-left text-xs text-slate-300 flex items-start gap-3">
          <Globe className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white block">
              How to Test the Widget:
            </span>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              1. Click the circular blue chat button at the bottom-right corner.<br />
              2. Fill in the form and attach a test file or log.<br />
              3. Click <strong>Send Message</strong> — it sends the ticket to the API and displays the confirmation number.<br />
              4. Head back to the <strong><Link href="/" className="text-blue-400 underline">Agent Desk</Link></strong> to see the ticket arrive in the queue!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
