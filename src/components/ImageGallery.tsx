"use client";

import { useState } from "react";
import {
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Eraser,
  Image as ImageIcon,
} from "lucide-react";
import type { GeneratedImage } from "@/lib/types";

interface ImageGalleryProps {
  images: GeneratedImage[];
  onRegenerate: (image: GeneratedImage, feedback: string) => void;
  onRemoveBackground: (image: GeneratedImage) => void;
}

const STATUS_LABELS: Record<GeneratedImage["status"], string> = {
  queued: "In queue",
  prompting: "Crafting prompt...",
  generating: "Rendering image...",
  "removing-bg": "Removing background...",
  done: "Complete",
  error: "Error",
};

const STATUS_COLORS: Record<GeneratedImage["status"], string> = {
  queued: "text-brand-muted",
  prompting: "text-brand-teal",
  generating: "text-amber-400",
  "removing-bg": "text-purple-400",
  done: "text-brand-green",
  error: "text-red-400",
};

export default function ImageGallery({ images, onRegenerate, onRemoveBackground }: ImageGalleryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [showTransparent, setShowTransparent] = useState<Record<string, boolean>>({});

  if (images.length === 0) {
    return (
      <div className="bg-brand-card border border-brand-border rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
        <div className="w-14 h-14 rounded-2xl bg-brand-darker border border-brand-border flex items-center justify-center mb-4">
          <ImageIcon size={24} className="text-brand-muted/40" />
        </div>
        <p className="text-sm text-brand-muted mb-1">No images yet</p>
        <p className="text-xs text-brand-muted/60">
          Configure your object and hit Forge to get started
        </p>
      </div>
    );
  }

  const downloadImage = (image: GeneratedImage) => {
    const dataUrl = showTransparent[image.id] && image.transparentDataUrl
      ? image.transparentDataUrl
      : image.imageDataUrl;
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    const doneImages = images.filter((img) => img.status === "done");
    doneImages.forEach((img, i) => {
      setTimeout(() => downloadImage(img), i * 300);
    });
  };

  const doneCount = images.filter((img) => img.status === "done").length;

  return (
    <div className="bg-brand-card border border-brand-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <ImageIcon size={16} className="text-brand-green" />
          Generated Assets ({images.length})
        </h2>
        {doneCount > 1 && (
          <button
            onClick={downloadAll}
            className="text-xs px-3 py-1.5 rounded-lg bg-brand-darker border border-brand-border text-brand-muted hover:text-brand-green hover:border-brand-green/40 flex items-center gap-1.5"
          >
            <Download size={12} />
            Download All ({doneCount})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {images.map((image) => {
          const isExpanded = expandedId === image.id;
          const isActive = ["prompting", "generating", "removing-bg"].includes(image.status);
          const isDone = image.status === "done";
          const isError = image.status === "error";
          const viewing = showTransparent[image.id] && image.transparentDataUrl;

          return (
            <div
              key={image.id}
              className={`bg-brand-darker rounded-xl border overflow-hidden transition-all ${
                isActive ? "border-brand-teal/40 pulse-glow" : "border-brand-border"
              }`}
            >
              {/* Image preview area */}
              <div className={`relative aspect-square ${viewing ? "checkerboard" : "bg-brand-darker"} flex items-center justify-center`}>
                {image.imageDataUrl ? (
                  <img
                    src={viewing ? image.transparentDataUrl! : image.imageDataUrl}
                    alt={image.description}
                    className="w-full h-full object-contain p-4"
                  />
                ) : isActive ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="text-brand-teal animate-spin" />
                    <span className={`text-xs font-medium ${STATUS_COLORS[image.status]}`}>
                      {STATUS_LABELS[image.status]}
                    </span>
                  </div>
                ) : isError ? (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <AlertCircle size={28} className="text-red-400" />
                    <span className="text-xs text-red-400">{image.error || "Generation failed"}</span>
                  </div>
                ) : (
                  <div className="text-brand-muted/30 text-xs">Queued</div>
                )}

                {/* Toggle transparent view */}
                {isDone && image.transparentDataUrl && (
                  <button
                    onClick={() =>
                      setShowTransparent((prev) => ({ ...prev, [image.id]: !prev[image.id] }))
                    }
                    className={`absolute top-2 right-2 p-1.5 rounded-lg text-xs backdrop-blur-sm ${
                      viewing
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-black/40 text-white/70 border border-white/10 hover:text-white"
                    }`}
                    title={viewing ? "Show original" : "Show transparent"}
                  >
                    <Eraser size={14} />
                  </button>
                )}
              </div>

              {/* Info bar */}
              <div className="p-3 border-t border-brand-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-brand-green font-medium truncate mr-2">
                    {image.filename}
                  </span>
                  <span className={`text-[10px] font-medium ${STATUS_COLORS[image.status]}`}>
                    {isDone ? "✓" : STATUS_LABELS[image.status]}
                  </span>
                </div>

                {/* Action buttons (shown when done or error) */}
                {(isDone || isError) && (
                  <div className="flex gap-1.5 mt-2">
                    {isDone && (
                      <button
                        onClick={() => downloadImage(image)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-brand-green/10 text-brand-green hover:bg-brand-green/20 text-xs font-medium"
                      >
                        <Download size={12} />
                        Download
                      </button>
                    )}
                    {isDone && !image.transparentDataUrl && (
                      <button
                        onClick={() => onRemoveBackground(image)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-medium"
                      >
                        <Eraser size={12} />
                        Remove BG
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : image.id)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-brand-card text-brand-muted hover:text-white text-xs"
                    >
                      <RefreshCw size={12} />
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                )}

                {/* Expanded: regenerate with feedback */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-brand-border">
                    <p className="text-[10px] text-brand-muted mb-1.5">
                      Describe what you'd like different:
                    </p>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={feedbackText[image.id] || ""}
                        onChange={(e) =>
                          setFeedbackText((prev) => ({ ...prev, [image.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && feedbackText[image.id]?.trim()) {
                            onRegenerate(image, feedbackText[image.id].trim());
                            setFeedbackText((prev) => ({ ...prev, [image.id]: "" }));
                            setExpandedId(null);
                          }
                        }}
                        placeholder="e.g., make it more colorful, different angle..."
                        className="flex-1 bg-brand-darker border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-teal"
                      />
                      <button
                        onClick={() => {
                          if (feedbackText[image.id]?.trim()) {
                            onRegenerate(image, feedbackText[image.id].trim());
                            setFeedbackText((prev) => ({ ...prev, [image.id]: "" }));
                            setExpandedId(null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-brand-teal text-white text-xs font-medium hover:bg-brand-teal/90"
                      >
                        Remix
                      </button>
                    </div>
                    {/* Show the prompt that was used */}
                    {image.prompt && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-brand-muted/60 cursor-pointer hover:text-brand-muted">
                          View prompt used
                        </summary>
                        <p className="text-[10px] text-brand-muted/50 mt-1 font-mono leading-relaxed bg-brand-darker rounded-lg p-2 border border-brand-border">
                          {image.prompt}
                        </p>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
