"use client";

import { useState } from "react";
import { KeyRound, X, Loader2 } from "lucide-react";

interface PassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (passphrase: string) => void;
  isFirstTime: boolean;
}

export default function PassphraseModal({ isOpen, onClose, onVerified, isFirstTime }: PassphraseModalProps) {
  const [passphrase, setPassphrase] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!passphrase.trim()) return;
    setIsVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/verify-passphrase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: passphrase.trim() }),
      });

      const data = await res.json();
      if (data.valid) {
        onVerified(passphrase.trim());
      } else {
        setError("Incorrect passphrase. Please try again.");
      }
    } catch {
      setError("Could not verify passphrase. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={isFirstTime ? undefined : onClose} />

      {/* Modal */}
      <div className="relative bg-brand-dark border border-brand-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
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
                {isFirstTime ? "Welcome to IsoForge" : "Enter Passphrase"}
              </h2>
              <p className="text-xs text-brand-muted">
                Enter the team passphrase to continue
              </p>
            </div>
          </div>

          {/* Passphrase input */}
          <div className="mb-4">
            <input
              type="password"
              value={passphrase}
              onChange={(e) => {
                setPassphrase(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Team passphrase..."
              disabled={isVerifying}
              autoFocus
              className="w-full bg-brand-darker border border-brand-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal/30 disabled:opacity-50"
            />
            {error && (
              <p className="text-xs text-red-400 mt-1.5">{error}</p>
            )}
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!passphrase.trim() || isVerifying}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              passphrase.trim() && !isVerifying
                ? "bg-brand-green text-white hover:bg-brand-green/90 active:scale-[0.98]"
                : "bg-brand-card text-brand-muted cursor-not-allowed border border-brand-border"
            }`}
          >
            {isVerifying ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Verifying...
              </>
            ) : (
              isFirstTime ? "Start Forging" : "Unlock"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
