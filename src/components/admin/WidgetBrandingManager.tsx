"use client";

import React, { useState, useRef } from "react";
import { Workspace } from "@/data/workspaceStore";
import {
  uploadWorkspaceAsset,
  updateWorkspaceBrandingSettings,
} from "@/app/actions/workspace-settings";
import {
  Palette,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Check,
  Save,
  Loader2,
  UploadCloud,
  Trash2,
  ExternalLink,
  LifeBuoy,
  X,
  Send,
  Eye,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetBrandingManagerProps {
  workspace: Workspace;
}

const PRESET_COLORS = [
  { name: "Flux Blue", hex: "#2563eb" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Emerald", hex: "#059669" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Amber", hex: "#d97706" },
  { name: "Cyan", hex: "#0891b2" },
  { name: "Slate", hex: "#1e293b" },
];

export function WidgetBrandingManager({ workspace }: WidgetBrandingManagerProps) {
  // Form State
  const [brandColor, setBrandColor] = useState(workspace.brandColor || "#2563eb");
  const [welcomeTitle, setWelcomeTitle] = useState(
    workspace.welcomeTitle || "Hi there! 👋 How can we help you today?"
  );
  const [welcomeSubtitle, setWelcomeSubtitle] = useState(
    workspace.welcomeSubtitle ||
      "Fill in your details below and a member of our team will assist you right away."
  );
  const [logoUrl, setLogoUrl] = useState(workspace.logoUrl || "");
  const [launcherIconUrl, setLauncherIconUrl] = useState(workspace.launcherIconUrl || "");
  const [launcherText, setLauncherText] = useState(workspace.launcherText || "Chat with us");
  const [showLauncherText, setShowLauncherText] = useState(
    Boolean(workspace.showLauncherText)
  );

  // Upload & Save States
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingLauncherIcon, setIsUploadingLauncherIcon] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Preview Mode Tab
  const [previewMode, setPreviewMode] = useState<"chat_window" | "launcher_button">("chat_window");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const launcherIconInputRef = useRef<HTMLInputElement>(null);

  const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(brandColor.trim());

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", "logo");

    try {
      const res = await uploadWorkspaceAsset(formData);
      if (res.success && res.url) {
        setLogoUrl(res.url);
        setFeedback({
          type: "success",
          text: "Brand logo uploaded successfully!",
        });
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Failed to upload logo image.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Error uploading logo.",
      });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // Handle Launcher Icon Upload
  const handleLauncherIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLauncherIcon(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", "launcher_icon");

    try {
      const res = await uploadWorkspaceAsset(formData);
      if (res.success && res.url) {
        setLauncherIconUrl(res.url);
        setFeedback({
          type: "success",
          text: "Custom launcher icon uploaded successfully!",
        });
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Failed to upload launcher icon.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "Error uploading launcher icon.",
      });
    } finally {
      setIsUploadingLauncherIcon(false);
      if (launcherIconInputRef.current) launcherIconInputRef.current.value = "";
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!isValidHex) {
      setFeedback({
        type: "error",
        text: "Please enter a valid hex color code (e.g., #2563eb).",
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await updateWorkspaceBrandingSettings({
        workspaceId: workspace.id,
        brandColor: brandColor.trim(),
        welcomeTitle: welcomeTitle.trim(),
        welcomeSubtitle: welcomeSubtitle.trim(),
        logoUrl: logoUrl.trim(),
        launcherIconUrl: launcherIconUrl.trim(),
        launcherText: launcherText.trim(),
        showLauncherText,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: "Branding settings saved successfully! Widget endpoints are updated.",
        });
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Failed to save settings.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "An unexpected error occurred while saving.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: Controls & Form */}
      <div className="lg:col-span-7 space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Card 1: Logo & Visual Identity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <ImageIcon className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="font-bold text-sm tracking-tight text-slate-900">
              Brand Logo &amp; Avatar
            </h3>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Company Logo (PNG, JPG, SVG, WebP)
            </label>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Logo Preview Avatar */}
              <div className="relative h-16 w-16 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Brand Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-extrabold text-slate-400">
                    {workspace.name.charAt(0)}
                  </span>
                )}
              </div>

              {/* Upload & Remove Controls */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-file-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="h-8.5 text-xs font-semibold gap-1.5"
                  >
                    {isUploadingLogo ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3.5 w-3.5" />
                        <span>Upload Logo</span>
                      </>
                    )}
                  </Button>

                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl("")}
                      className="h-8.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>

                <div>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="Or paste external image URL (https://...)"
                    className="w-full h-8 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-800 placeholder:text-slate-400 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Brand Color */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Palette className="h-4.5 w-4.5 text-purple-600" />
            <h3 className="font-bold text-sm tracking-tight text-slate-900">
              Primary Theme Color
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden shadow-2xs border border-slate-200 cursor-pointer">
                <input
                  type="color"
                  value={isValidHex ? brandColor : "#2563eb"}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 p-0"
                  title="Pick color"
                />
              </div>

              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 select-none">
                  #
                </span>
                <input
                  type="text"
                  value={brandColor.startsWith("#") ? brandColor.slice(1) : brandColor}
                  onChange={(e) =>
                    setBrandColor("#" + e.target.value.replace(/[^0-9a-fA-F]/g, ""))
                  }
                  placeholder="2563eb"
                  maxLength={6}
                  className="w-full h-10 pl-7 pr-3 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all uppercase"
                />
              </div>

              <div
                className="h-10 px-4 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-2xs transition-colors shrink-0"
                style={{ backgroundColor: isValidHex ? brandColor : "#2563eb" }}
              >
                Preview
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
              {PRESET_COLORS.map((preset) => {
                const isSelected =
                  brandColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setBrandColor(preset.hex)}
                    title={`${preset.name} (${preset.hex})`}
                    className={`h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-slate-900 scale-105"
                        : "opacity-90 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 3: Welcome Greetings */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MessageSquare className="h-4.5 w-4.5 text-emerald-600" />
            <h3 className="font-bold text-sm tracking-tight text-slate-900">
              Welcome Greetings &amp; Prompt
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Welcome Title
              </label>
              <input
                type="text"
                value={welcomeTitle}
                onChange={(e) => setWelcomeTitle(e.target.value)}
                placeholder="Hi there! 👋 How can we help you today?"
                className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-900 transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Headline greeting shown prominently at the top of the chat thread.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Welcome Subtitle
              </label>
              <textarea
                rows={2}
                value={welcomeSubtitle}
                onChange={(e) => setWelcomeSubtitle(e.target.value)}
                placeholder="Fill in your details below and a member of our team will assist you right away."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-900 transition-all resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Guidance text explaining response expectation or office hours.
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Launcher Button Customization */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Sliders className="h-4.5 w-4.5 text-indigo-600" />
            <h3 className="font-bold text-sm tracking-tight text-slate-900">
              Launcher Bubble Customization
            </h3>
          </div>

          <div className="space-y-4">
            {/* Show Text Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <div>
                <span className="font-semibold text-xs text-slate-900 block">
                  Expand with Text Label
                </span>
                <span className="text-[11px] text-slate-500">
                  Displays a pill button with text (e.g., &quot;Chat with us&quot;) instead of an icon-only circle.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLauncherText}
                  onChange={(e) => setShowLauncherText(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Launcher Text */}
            {showLauncherText && (
              <div className="animate-in fade-in duration-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Launcher Text Label
                </label>
                <input
                  type="text"
                  value={launcherText}
                  onChange={(e) => setLauncherText(e.target.value)}
                  placeholder="Chat with us"
                  className="w-full h-8.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-400 text-slate-900 transition-all"
                />
              </div>
            )}

            {/* Optional Custom Launcher Icon */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Custom Launcher Icon (Optional)
              </label>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {launcherIconUrl ? (
                    <img
                      src={launcherIconUrl}
                      alt="Launcher Icon"
                      className="h-6 w-6 object-cover"
                    />
                  ) : (
                    <MessageSquare className="h-5 w-5 text-slate-400" />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={launcherIconInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLauncherIconUpload}
                    className="hidden"
                    id="launcher-icon-file-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingLauncherIcon}
                    onClick={() => launcherIconInputRef.current?.click()}
                    className="h-8 text-xs font-medium gap-1"
                  >
                    {isUploadingLauncherIcon ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="h-3.5 w-3.5" />
                    )}
                    <span>Upload Icon</span>
                  </Button>

                  {launcherIconUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLauncherIconUrl("")}
                      className="h-8 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      Reset to Default
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Changes Floating Action Bar */}
        <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl shadow-md">
          <div className="text-xs text-slate-300">
            Click to save and apply across all embedded widgets instantly.
          </div>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving || !isValidHex}
            className="h-9 px-5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white gap-1.5 shadow-sm cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Branding...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Branding Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Live Preview */}
      <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
        {/* Preview Mode Switcher */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-slate-500">
              <Eye className="h-4 w-4 text-blue-600" />
              <span>Side-by-Side Live Preview</span>
            </div>
            <a
              href={`/embed/chat?key=${encodeURIComponent(workspace.publicKey || "pk_live_acme_cloud_tech")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Test Real Window</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPreviewMode("chat_window")}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                previewMode === "chat_window"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Chat Window (Open)
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("launcher_button")}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                previewMode === "launcher_button"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Launcher Bubble (Closed)
            </button>
          </div>
        </div>

        {/* Interactive Mock Frame */}
        {previewMode === "chat_window" ? (
          /* 1. Open Chat Widget Preview */
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="w-full max-w-[380px] mx-auto rounded-2xl overflow-hidden shadow-xl border border-slate-200 bg-white text-slate-800 animate-in fade-in duration-200">
              {/* Header */}
              <div
                className="p-4 text-white flex items-center justify-between transition-colors duration-300"
                style={{ backgroundColor: isValidHex ? brandColor : "#2563eb" }}
              >
                <div className="flex items-center gap-2.5">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={workspace.name}
                      className="h-8 w-8 rounded-lg object-cover bg-white/20 shadow-2xs border border-white/20"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                      <LifeBuoy className="h-4.5 w-4.5" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-xs leading-tight text-white drop-shadow-xs">
                      {workspace.name}
                    </div>
                    <div className="text-[10px] text-white/90 flex items-center gap-1 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      Typically replies in minutes
                    </div>
                  </div>
                </div>

                <div className="h-7 w-7 rounded-full bg-black/10 flex items-center justify-center text-white/90">
                  <X className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Chat Body */}
              <div className="p-4 bg-slate-50 space-y-3 min-h-[340px] flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Welcome Bubble */}
                  <div className="flex items-start gap-2">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-6 w-6 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200"
                      />
                    ) : (
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                        style={{ backgroundColor: isValidHex ? brandColor : "#2563eb" }}
                      >
                        {workspace.name.charAt(0)}
                      </div>
                    )}
                    <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3 text-xs shadow-2xs max-w-[88%] space-y-1">
                      <p className="font-bold text-slate-900 leading-snug">
                        {welcomeTitle}
                      </p>
                      <p className="text-slate-500 text-[11px] leading-snug">
                        {welcomeSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Sample Mock Input Fields */}
                  <div className="bg-white rounded-xl border border-slate-200/80 p-3 space-y-2 text-[11px] shadow-2xs">
                    <div className="h-7 bg-slate-50 border border-slate-200 rounded px-2.5 flex items-center text-slate-400">
                      Customer Full Name
                    </div>
                    <div className="h-7 bg-slate-50 border border-slate-200 rounded px-2.5 flex items-center text-slate-400">
                      name@company.com
                    </div>
                    <div className="h-14 bg-slate-50 border border-slate-200 rounded p-2 text-slate-400">
                      How can we help?
                    </div>
                    <div
                      className="h-8 rounded-lg text-white font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                      style={{ backgroundColor: isValidHex ? brandColor : "#2563eb" }}
                    >
                      <span>Send Message</span>
                      <Send className="h-3 w-3" />
                    </div>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400">
                  Powered by <strong className="text-slate-600">FluxDesk</strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 2. Closed Launcher Bubble Preview */
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-md relative min-h-[380px] flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
            {/* Background simulated website page */}
            <div className="space-y-3 opacity-30 select-none pointer-events-none">
              <div className="h-3 w-1/3 bg-slate-600 rounded"></div>
              <div className="h-2 w-3/4 bg-slate-700 rounded"></div>
              <div className="h-2 w-1/2 bg-slate-700 rounded"></div>
              <div className="h-20 w-full bg-slate-800/80 rounded-xl mt-4"></div>
            </div>

            <div className="text-center">
              <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700 px-2.5 py-1 rounded-full">
                Simulated Bottom-Right Corner
              </span>
            </div>

            {/* Bottom-Right Launcher Bubble */}
            <div className="flex justify-end pt-8">
              <div
                className="flex items-center justify-center text-white cursor-pointer transition-all duration-300 shadow-xl hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: isValidHex ? brandColor : "#2563eb",
                  height: "56px",
                  borderRadius: "28px",
                  padding: showLauncherText && launcherText ? "0 20px 0 16px" : "0",
                  width: showLauncherText && launcherText ? "auto" : "56px",
                  gap: "9px",
                  boxShadow: `0 8px 28px ${isValidHex ? brandColor : "#2563eb"}77`,
                }}
              >
                {launcherIconUrl ? (
                  <img
                    src={launcherIconUrl}
                    alt="Custom Launcher"
                    className="h-6 w-6 rounded-md object-cover"
                  />
                ) : (
                  <MessageSquare className="h-6 w-6" />
                )}

                {showLauncherText && launcherText && (
                  <span className="font-semibold text-sm leading-none whitespace-nowrap">
                    {launcherText}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
