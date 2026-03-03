"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff, ExternalLink, X } from "lucide-react";
import type { ApiKeys } from "@/lib/types";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: ApiKeys) => void;
  initialKeys: ApiKeys;
  isFirstTime: boolean;
}

export default function ApiKeyModal({ isOpen, onClose, onSave, initialKeys, isFirstTime }: ApiKeyModalProps) {
  const [anthropic, setAnthropic] = useState(initialKeys.anthropic);
  const [google, setGoogle] = useState(initialKeys.google);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);

  if (!isOpen) return null;

  const canSave = anthropic.trim().length > 10 && google.trim().length > 10;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ anthropic: anthropic.trim(), google: google.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={isFirstTime ? undefined : onClose} />

      {/* Modal */}
      <div className="relative bg-brand-dark border border-brand-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header gradient bar */}
        <div className="h-1 bg-gradient-to-r from-brand-teal via-brand-green to-brand-teal" />

        <div className="p-6">
          {/* Close button (not on first time) */}
          {!isFirstTime && (
            <button onClick={onClose} className="absolute top-4 right-4 p-1 text-brand-muted hover:text-white">
              <X size={18} />
            </button>
          )}

          {/* Icon + Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/15 border border-brand-teal/30 flex items-center justify-center">
              <KeyRound size={20} className="text-brand-teal" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isFirstTime ? "Welcome to IsoForge" : "API Keys"}
              </h2>
              <p className="text-xs text-brand-muted">
                {isFirstTime
                  ? "Enter your API keys to get started"
                  : "Update your API keys"}
              </p>
            </div>
          </div>

          {/* Anthropic Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-brand-muted mb-1.5">
              Anthropic API Key
              <span className="text-brand-muted/60 font-normal ml-1">(Claude Opus — prompt generation)</span>
            </label>
            <div className="relative">
              <input
                type={showAnthropic ? "text" : "password"}
                value={anthropic}
                onChange={(e) => setAnthropic(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full bg-brand-darker border border-brand-border rounded-lg px-3 py-2.5 pr-10 text-sm font-mono text-white placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/30"
              />
              <button
                type="button"
                onClick={() => setShowAnthropic(!showAnthropic)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
              >
                {showAnthropic ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-teal/70 hover:text-brand-teal mt-1"
            >
              Get an API key <ExternalLink size={10} />
            </a>
          </div>

          {/* Google Key */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-brand-muted mb-1.5">
              Google AI API Key
              <span className="text-brand-muted/60 font-normal ml-1">(Imagen 4 Ultra — image generation)</span>
            </label>
            <div className="relative">
              <input
                type={showGoogle ? "text" : "password"}
                value={google}
                onChange={(e) => setGoogle(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-brand-darker border border-brand-border rounded-lg px-3 py-2.5 pr-10 text-sm font-mono text-white placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/30"
              />
              <button
                type="button"
                onClick={() => setShowGoogle(!showGoogle)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-white"
              >
                {showGoogle ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand-teal/70 hover:text-brand-teal mt-1"
            >
              Get an API key <ExternalLink size={10} />
            </a>
          </div>

          {/* Info notice */}
          <div className="bg-brand-card border border-brand-border rounded-lg p-3 mb-6">
            <p className="text-xs text-brand-muted leading-relaxed">
              Keys are stored only in your browser session and sent directly to Anthropic/Google.
              They are never saved on the server or logged.
            </p>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all ${
              canSave
                ? "bg-brand-green text-white hover:bg-brand-green/90 active:scale-[0.98]"
                : "bg-brand-card text-brand-muted cursor-not-allowed border border-brand-border"
            }`}
          >
            {isFirstTime ? "Start Forging" : "Save Keys"}
          </button>
        </div>
      </div>
    </div>
  );
}
