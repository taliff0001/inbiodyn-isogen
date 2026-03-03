"use client";

import Image from "next/image";
import { Settings, Zap } from "lucide-react";

interface HeaderProps {
  onSettingsClick: () => void;
  keysConfigured: boolean;
}

export default function Header({ onSettingsClick, keysConfigured }: HeaderProps) {
  return (
    <header className="border-b border-brand-border bg-brand-dark/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="InBioDyn" width={36} height={36} className="rounded-lg" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Iso<span className="text-brand-green">Forge</span>
            </h1>
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-muted bg-brand-card px-2 py-0.5 rounded-full border border-brand-border">
              InBioDyn LTS
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${keysConfigured ? "bg-brand-green" : "bg-amber-500 animate-pulse"}`} />
            <span className="text-brand-muted">
              {keysConfigured ? "Ready" : "Keys needed"}
            </span>
          </div>

          {/* Settings button */}
          <button
            onClick={onSettingsClick}
            className="p-2 rounded-lg hover:bg-brand-card border border-transparent hover:border-brand-border text-brand-muted hover:text-white"
            title="API Key Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
