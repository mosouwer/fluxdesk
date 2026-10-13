"use client";

import React, { useState } from "react";
import { updateWorkspaceBrandColorAction } from "@/app/actions/workspace";
import {
  Palette,
  Check,
  Save,
  Loader2,
  Sparkles,
  LifeBuoy,
  MessageSquare,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrandColorCustomizerProps {
  workspaceId: string;
  initialColor: string;
  workspaceName: string;
}

const PRESET_COLORS = [
  { name: "Flux Blue", hex: "#2563eb" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Emerald", hex: "#059669" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Amber", hex: "#d97706" },
  { name: "Cyan", hex: "#0891b2" },
  { name: "Dark Slate", hex: "#1e293b" },
];

export function BrandColorCustomizer({
  workspaceId,
  initialColor,
  workspaceName,
}: BrandColorCustomizerProps) {
  const [color, setColor] = useState(initialColor || "#2563eb");
  const [savedColor, setSavedColor] = useState(initialColor || "#2563eb");
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color.trim());

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    setStatusMessage(null);
  };

  const handleSave = async () => {
    if (!isValidHex) {
      setStatusMessage({
        type: "error",
        text: "Please enter a valid hex color code (e.g. #2563eb).",
      });
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const res = await updateWorkspaceBrandColorAction({
        workspaceId,
        brandColor: color.trim(),
      });

      if (res.success && res.brandColor) {
        setSavedColor(res.brandColor);
        setStatusMessage({
          type: "success",
          text: `Brand color updated to ${res.brandColor}. Widget styles updated instantly!`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.error || "Failed to update brand color.",
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || "An unexpected error occurred while saving.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setColor(savedColor);
    setStatusMessage(null);
  };

  const hasUnsavedChanges = color.trim().toLowerCase() !== savedColor.trim().toLowerCase();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/80 flex items-center justify-center">
            <Palette className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight text-slate-900">
              Widget Brand Styling
            </h3>
            <p className="text-xs text-slate-500">
              Customize the theme color applied to your launcher bubble and chat headers.
            </p>
          </div>
        </div>

        {hasUnsavedChanges && (
          <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
            Unsaved Changes
          </span>
        )}
      </div>

      {/* Main Grid: Picker & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Controls */}
        <div className="lg:col-span-7 space-y-5">
          {/* Hex Input and Native Color Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Primary Brand Color (Hex)
            </label>
            <div className="flex items-center gap-3">
              {/* Native Eyedropper / Color Circle */}
              <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden shadow-2xs border border-slate-200 cursor-pointer">
                <input
                  type="color"
                  value={isValidHex ? color : "#2563eb"}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="absolute -top-3 -left-3 w-16 h-16 cursor-pointer border-0 p-0"
                  title="Pick color"
                />
              </div>

              {/* Text Input */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400 select-none">
                  #
                </span>
                <input
                  type="text"
                  value={color.startsWith("#") ? color.slice(1) : color}
                  onChange={(e) => handleColorChange("#" + e.target.value.replace(/[^0-9a-fA-F]/g, ""))}
                  placeholder="2563eb"
                  maxLength={6}
                  className="w-full h-10 pl-7 pr-3 text-xs font-mono font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 transition-all uppercase"
                />
              </div>

              {/* Color Preview Swatch */}
              <div
                className="h-10 px-3.5 rounded-xl flex items-center justify-center text-white text-xs font-semibold shadow-2xs transition-colors shrink-0"
                style={{ backgroundColor: isValidHex ? color : "#2563eb" }}
              >
                Sample
              </div>
            </div>
          </div>

          {/* Quick Presets Palette */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Preset Brand Palettes
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PRESET_COLORS.map((preset) => {
                const isSelected = color.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => handleColorChange(preset.hex)}
                    title={`${preset.name} (${preset.hex})`}
                    className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer relative shadow-2xs hover:scale-105 ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-slate-900 scale-105"
                        : "opacity-90 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white drop-shadow-xs" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {statusMessage.type === "success" ? (
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <Button
              onClick={handleSave}
              disabled={isSaving || !isValidHex || !hasUnsavedChanges}
              className="h-9 px-4 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Color</span>
                </>
              )}
            </Button>

            {hasUnsavedChanges && (
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSaving}
                className="h-9 text-xs font-medium text-slate-600"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>

        {/* Right: Realtime Preview Box */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Live Widget Preview
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{color}</span>
          </div>

          {/* Mini Mockup Window */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            {/* Mock Header */}
            <div
              className="p-3 text-white flex items-center justify-between transition-colors duration-300"
              style={{ backgroundColor: isValidHex ? color : "#2563eb" }}
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center">
                  <LifeBuoy className="h-3.5 w-3.5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-[11px] leading-tight text-white">{workspaceName}</div>
                  <div className="text-[9px] text-white/90 leading-none">Online &bull; Instant Support</div>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            </div>

            {/* Mock Chat Body */}
            <div className="p-3 bg-slate-50/50 space-y-2">
              <div className="bg-white border border-slate-200/80 rounded-lg p-2 text-[10px] text-slate-600 max-w-[85%] shadow-2xs">
                Hi! 👋 Leave us a message and we will respond right away.
              </div>
              <div
                className="h-6 rounded-md text-[10px] font-bold text-white flex items-center justify-center transition-colors shadow-2xs"
                style={{ backgroundColor: isValidHex ? color : "#2563eb" }}
              >
                Send Message &rarr;
              </div>
            </div>
          </div>

          {/* Mock Floating Bubble */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500 font-medium">Launcher Bubble:</span>
            <div
              className="h-10 w-10 rounded-full text-white flex items-center justify-center shadow-md transition-all duration-300 cursor-pointer hover:scale-105"
              style={{
                backgroundColor: isValidHex ? color : "#2563eb",
                boxShadow: `0 4px 14px ${isValidHex ? color : "#2563eb"}55`,
              }}
            >
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
