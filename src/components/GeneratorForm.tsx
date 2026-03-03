"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Zap, Layers, Loader2, Sparkles, Square, RectangleVertical } from "lucide-react";
import { WEIGHT_CLASSES, type BatchItem } from "@/lib/types";
import type { CropMode } from "@/lib/types";

interface GeneratorFormProps {
  onGenerate: (items: BatchItem[]) => void;
  isProcessing: boolean;
  anthropicKey: string;
  cropMode: CropMode;
  onCropModeChange: (mode: CropMode) => void;
}

export default function GeneratorForm({
  onGenerate,
  isProcessing,
  anthropicKey,
  cropMode,
  onCropModeChange,
}: GeneratorFormProps) {
  const [weight, setWeight] = useState<number>(25);
  const [description, setDescription] = useState("");
  const [queue, setQueue] = useState<BatchItem[]>([]);

  // Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [customSuggestions, setCustomSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  // Cache suggestions per weight class to avoid redundant fetches within a session
  const suggestionsCache = useRef<Record<number, { ai: string[]; custom: string[] }>>({});

  const keyReady = anthropicKey.length > 10;

  useEffect(() => {
    if (!keyReady) return;

    // Check cache first
    if (suggestionsCache.current[weight]) {
      const cached = suggestionsCache.current[weight];
      setAiSuggestions(cached.ai);
      setCustomSuggestions(cached.custom);
      return;
    }

    let cancelled = false;
    setIsSuggesting(true);
    setAiSuggestions([]);

    fetch("/api/suggest-items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-anthropic-key": anthropicKey,
      },
      body: JSON.stringify({ weight }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const ai: string[] = data.suggestions ?? [];
        const custom: string[] = data.custom ?? [];
        suggestionsCache.current[weight] = { ai, custom };
        setAiSuggestions(ai);
        setCustomSuggestions(custom);
      })
      .catch(() => {
        // Silently fail — suggestions are a nice-to-have
      })
      .finally(() => {
        if (!cancelled) setIsSuggesting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [weight, keyReady, anthropicKey]);

  const saveCustomSuggestion = async () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    // Optimistically add to UI
    setCustomSuggestions((prev) => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
    if (suggestionsCache.current[weight]) {
      const cached = suggestionsCache.current[weight];
      if (!cached.custom.includes(trimmed)) {
        cached.custom = [...cached.custom, trimmed];
      }
    }
    setCustomInput("");

    setIsSavingCustom(true);
    try {
      await fetch("/api/save-custom-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weight, description: trimmed }),
      });
    } catch {
      // Non-critical
    } finally {
      setIsSavingCustom(false);
    }
  };

  const addToQueue = () => {
    if (!description.trim()) return;
    const item: BatchItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      weight,
      description: description.trim(),
    };
    setQueue((prev) => [...prev, item]);
    setDescription("");
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const generateSingle = () => {
    if (!description.trim()) return;
    const item: BatchItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      weight,
      description: description.trim(),
    };
    setDescription("");
    onGenerate([item]);
  };

  const generateBatch = () => {
    if (queue.length === 0) return;
    const items = [...queue];
    setQueue([]);
    onGenerate(items);
  };

  const allSuggestions = [...aiSuggestions, ...customSuggestions];
  const showSuggestions = keyReady && (isSuggesting || allSuggestions.length > 0);

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Zap size={16} className="text-brand-green" />
        Generate Asset
      </h2>

      {/* Weight selector */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-brand-muted mb-2">
          Weight Class (lbs)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {WEIGHT_CLASSES.map((w) => (
            <button
              key={w}
              onClick={() => setWeight(w)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                weight === w
                  ? "bg-brand-green text-white shadow-md shadow-brand-green/20"
                  : "bg-brand-darker text-brand-muted border border-brand-border hover:border-brand-green/40 hover:text-white"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* AI + Custom Suggestions */}
      {showSuggestions && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={11} className="text-brand-teal" />
            <label className="text-xs font-medium text-brand-muted">
              Suggestions for {weight} lbs
            </label>
            {isSuggesting && <Loader2 size={11} className="text-brand-teal animate-spin ml-1" />}
          </div>

          {allSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {aiSuggestions.map((s) => (
                <button
                  key={`ai-${s}`}
                  onClick={() => setDescription(s)}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-lg text-xs bg-brand-teal/10 text-brand-teal border border-brand-teal/20 hover:bg-brand-teal/20 hover:border-brand-teal/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {s}
                </button>
              ))}
              {customSuggestions.map((s) => (
                <button
                  key={`custom-${s}`}
                  onClick={() => setDescription(s)}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-lg text-xs bg-brand-green/10 text-brand-green border border-brand-green/20 hover:bg-brand-green/20 hover:border-brand-green/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Custom suggestion input */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveCustomSuggestion();
                }
              }}
              placeholder="Save your own idea..."
              disabled={isSavingCustom}
              className="flex-1 bg-brand-darker border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-green/50 focus:ring-1 focus:ring-brand-green/20 disabled:opacity-50"
            />
            <button
              onClick={saveCustomSuggestion}
              disabled={!customInput.trim() || isSavingCustom}
              className="px-2.5 py-1.5 rounded-lg bg-brand-darker border border-brand-border text-brand-muted hover:text-brand-green hover:border-brand-green/40 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Save as custom suggestion"
            >
              {isSavingCustom ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
          <p className="text-[10px] text-brand-muted/40 mt-1">
            Teal chips = AI suggestions · Green chips = your saved ideas
          </p>
        </div>
      )}

      {/* Description input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-brand-muted mb-2">
          Object Description
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey) {
                e.preventDefault();
                addToQueue();
              } else if (e.key === "Enter") {
                e.preventDefault();
                generateSingle();
              }
            }}
            placeholder="e.g., bag of cat litter, sledgehammer, holiday ham..."
            disabled={isProcessing}
            className="flex-1 bg-brand-darker border border-brand-border rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 disabled:opacity-50"
          />
          <button
            onClick={addToQueue}
            disabled={!description.trim() || isProcessing}
            className="px-3 py-2.5 rounded-lg bg-brand-darker border border-brand-border text-brand-muted hover:text-brand-green hover:border-brand-green/40 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Add to batch queue (Shift+Enter)"
          >
            <Plus size={18} />
          </button>
        </div>
        <p className="text-[10px] text-brand-muted/60 mt-1.5">
          Press <kbd className="px-1 py-0.5 bg-brand-darker rounded text-brand-muted border border-brand-border">Enter</kbd> to generate one ·{" "}
          <kbd className="px-1 py-0.5 bg-brand-darker rounded text-brand-muted border border-brand-border">Shift+Enter</kbd> to add to batch
        </p>
      </div>

      {/* Crop mode toggle */}
      <div className="mb-4 pb-4 border-b border-brand-border">
        <label className="block text-xs font-medium text-brand-muted mb-2">
          Canvas Output
        </label>
        <div className="flex gap-1.5">
          <button
            onClick={() => onCropModeChange("square")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${
              cropMode === "square"
                ? "bg-brand-green/15 text-brand-green border-brand-green/40"
                : "bg-brand-darker text-brand-muted border-brand-border hover:border-brand-green/30 hover:text-white"
            }`}
          >
            <Square size={13} />
            1024 × 1024
          </button>
          <button
            onClick={() => onCropModeChange("natural")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all border ${
              cropMode === "natural"
                ? "bg-brand-teal/15 text-brand-teal border-brand-teal/40"
                : "bg-brand-darker text-brand-muted border-brand-border hover:border-brand-teal/30 hover:text-white"
            }`}
          >
            <RectangleVertical size={13} />
            1024 × auto
          </button>
        </div>
        <p className="text-[10px] text-brand-muted/40 mt-1.5">
          {cropMode === "square"
            ? "Square canvas — object centered with padding"
            : "Natural height — fills edge to edge, best for stacking animation"}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={generateSingle}
          disabled={!description.trim() || isProcessing}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            !description.trim() || isProcessing
              ? "bg-brand-card text-brand-muted border border-brand-border cursor-not-allowed"
              : "bg-brand-green text-white hover:bg-brand-green/90 active:scale-[0.98] shadow-lg shadow-brand-green/20"
          }`}
        >
          <Zap size={15} />
          {isProcessing ? "Processing..." : "Forge Image"}
        </button>
      </div>

      {/* Batch queue */}
      {queue.length > 0 && (
        <div className="mt-4 pt-4 border-t border-brand-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-brand-muted flex items-center gap-1.5">
              <Layers size={13} />
              Batch Queue ({queue.length})
            </h3>
            <button
              onClick={generateBatch}
              disabled={isProcessing}
              className="text-xs px-3 py-1.5 rounded-lg bg-brand-teal text-white hover:bg-brand-teal/90 disabled:opacity-50 font-medium"
            >
              Forge All
            </button>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-brand-darker rounded-lg px-3 py-2 group"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-brand-green font-medium">
                    {String(item.weight).padStart(3, "0")}
                  </span>
                  <span className="text-white">{item.description}</span>
                </div>
                <button
                  onClick={() => removeFromQueue(item.id)}
                  className="text-brand-muted/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
