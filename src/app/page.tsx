"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import PassphraseModal from "@/components/ApiKeyModal";
import GeneratorForm from "@/components/GeneratorForm";
import ImageGallery from "@/components/ImageGallery";
import { generateFilename } from "@/lib/naming";
import { cropToCanvas } from "@/lib/imageCrop";
import type { BatchItem, CropMode, GeneratedImage } from "@/lib/types";

export default function Home() {
  const [passphrase, setPassphrase] = useState("");
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cropMode, setCropMode] = useState<CropMode>("natural");
  const processingRef = useRef(false);

  const authenticated = passphrase.length > 0;

  // Auth headers for all API calls
  const authHeaders = useCallback(
    (): Record<string, string> => ({
      "Content-Type": "application/json",
      "x-app-passphrase": passphrase,
    }),
    [passphrase]
  );

  // Check for stored passphrase on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("isoforge_passphrase");
    if (stored) {
      setPassphrase(stored);
      setIsFirstTime(false);
    } else {
      setShowPassphraseModal(true);
    }
  }, []);

  const handleVerified = (verifiedPassphrase: string) => {
    setPassphrase(verifiedPassphrase);
    sessionStorage.setItem("isoforge_passphrase", verifiedPassphrase);
    setIsFirstTime(false);
    setShowPassphraseModal(false);
  };

  // Update a specific image in state
  const updateImage = useCallback((id: string, updates: Partial<GeneratedImage>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...updates } : img))
    );
  }, []);

  // Process a single image: prompt → generate → (auto bg removal) → crop
  const processOne = useCallback(
    async (item: BatchItem): Promise<void> => {
      const filename = generateFilename(item.weight, item.description);
      const imageId = item.id;

      // Create the image entry
      const newImage: GeneratedImage = {
        id: imageId,
        filename,
        weight: item.weight,
        description: item.description,
        prompt: "",
        imageDataUrl: null,
        transparentDataUrl: null,
        status: "prompting",
        createdAt: new Date().toISOString(),
      };

      setImages((prev) => [newImage, ...prev]);

      try {
        // Step 1: Generate prompt via Claude
        const promptRes = await fetch("/api/generate-prompt", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            weight: item.weight,
            description: item.description,
          }),
        });

        if (!promptRes.ok) {
          const err = await promptRes.json();
          throw new Error(err.error || `Prompt generation failed: ${promptRes.status}`);
        }

        const { prompt } = await promptRes.json();
        updateImage(imageId, { prompt, status: "generating" });

        // Step 2: Generate image via Imagen 4 Ultra
        const imageRes = await fetch("/api/generate-image", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ prompt }),
        });

        if (!imageRes.ok) {
          const err = await imageRes.json();
          throw new Error(err.error || `Image generation failed: ${imageRes.status}`);
        }

        const { imageBase64, mimeType } = await imageRes.json();
        const dataUrl = `data:${mimeType || "image/png"};base64,${imageBase64}`;

        updateImage(imageId, {
          imageDataUrl: dataUrl,
          status: "removing-bg",
        });

        // Step 3: Auto background removal (client-side)
        try {
          const { removeBackground } = await import("@imgly/background-removal");
          const blob = await fetch(dataUrl).then((r) => r.blob());
          const resultBlob = await removeBackground(blob, {
            output: { format: "image/png" },
          });

          // Convert blob URL to data URL for download
          const reader = new FileReader();
          const transparentDataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(resultBlob);
          });

          // Auto-crop to canvas
          const croppedDataUrl = await cropToCanvas(transparentDataUrl, cropMode).catch(() => transparentDataUrl);

          updateImage(imageId, {
            transparentDataUrl: croppedDataUrl,
            status: "done",
          });
        } catch (bgError) {
          // Background removal failed — still mark as done with original image
          console.warn("Background removal failed, using original:", bgError);
          updateImage(imageId, { status: "done" });
        }

        // Track generated item for suggestion freshness (fire-and-forget)
        fetch("/api/track-generated", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ weight: item.weight, description: item.description }),
        }).catch(() => {});
      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        updateImage(imageId, {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [authHeaders, updateImage, cropMode]
  );

  // Handle batch generation (processes in series)
  const handleGenerate = useCallback(
    async (items: BatchItem[]) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setIsProcessing(true);

      for (const item of items) {
        await processOne(item);
      }

      processingRef.current = false;
      setIsProcessing(false);
    },
    [processOne]
  );

  // Handle regeneration with feedback
  const handleRegenerate = useCallback(
    async (image: GeneratedImage, feedback: string) => {
      const newId = `${Date.now()}-regen`;

      const newImage: GeneratedImage = {
        id: newId,
        filename: image.filename,
        weight: image.weight,
        description: image.description,
        prompt: "",
        imageDataUrl: null,
        transparentDataUrl: null,
        status: "prompting",
        createdAt: new Date().toISOString(),
      };

      setImages((prev) => [newImage, ...prev]);

      try {
        // Step 1: Remix prompt via Claude (with feedback)
        const promptRes = await fetch("/api/generate-prompt", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            weight: image.weight,
            description: image.description,
            feedback,
            previousPrompt: image.prompt,
          }),
        });

        if (!promptRes.ok) {
          const err = await promptRes.json();
          throw new Error(err.error || "Prompt remix failed");
        }

        const { prompt } = await promptRes.json();
        updateImage(newId, { prompt, status: "generating" });

        // Step 2: Generate
        const imageRes = await fetch("/api/generate-image", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ prompt }),
        });

        if (!imageRes.ok) {
          const err = await imageRes.json();
          throw new Error(err.error || "Image generation failed");
        }

        const { imageBase64, mimeType } = await imageRes.json();
        const dataUrl = `data:${mimeType || "image/png"};base64,${imageBase64}`;
        updateImage(newId, { imageDataUrl: dataUrl, status: "removing-bg" });

        // Step 3: Background removal
        try {
          const { removeBackground } = await import("@imgly/background-removal");
          const blob = await fetch(dataUrl).then((r) => r.blob());
          const resultBlob = await removeBackground(blob, {
            output: { format: "image/png" },
          });
          const reader = new FileReader();
          const transparentDataUrl = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(resultBlob);
          });
          const croppedDataUrl = await cropToCanvas(transparentDataUrl, cropMode).catch(() => transparentDataUrl);
          updateImage(newId, { transparentDataUrl: croppedDataUrl, status: "done" });
        } catch {
          updateImage(newId, { status: "done" });
        }
      } catch (error) {
        updateImage(newId, {
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [authHeaders, updateImage, cropMode]
  );

  // Manual background removal trigger
  const handleRemoveBackground = useCallback(
    async (image: GeneratedImage) => {
      if (!image.imageDataUrl) return;
      updateImage(image.id, { status: "removing-bg" });

      try {
        const { removeBackground } = await import("@imgly/background-removal");
        const blob = await fetch(image.imageDataUrl).then((r) => r.blob());
        const resultBlob = await removeBackground(blob, {
          output: { format: "image/png" },
        });
        const reader = new FileReader();
        const transparentDataUrl = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(resultBlob);
        });
        const croppedDataUrl = await cropToCanvas(transparentDataUrl, cropMode).catch(() => transparentDataUrl);
        updateImage(image.id, { transparentDataUrl: croppedDataUrl, status: "done" });
      } catch (error) {
        console.error("Background removal failed:", error);
        updateImage(image.id, { status: "done" });
      }
    },
    [updateImage, cropMode]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        onSettingsClick={() => setShowPassphraseModal(true)}
        keysConfigured={authenticated}
      />

      <PassphraseModal
        isOpen={showPassphraseModal}
        onClose={() => setShowPassphraseModal(false)}
        onVerified={handleVerified}
        isFirstTime={isFirstTime}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
        {/* Hero tagline */}
        <div className="mb-6">
          <p className="text-brand-muted text-sm">
            Isometric asset generator for the <span className="text-brand-green font-medium">InBioDyn Lift Training System</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* Left: Generator form */}
          <div className="space-y-4">
            <GeneratorForm
              onGenerate={handleGenerate}
              isProcessing={isProcessing}
              authenticated={authenticated}
              passphrase={passphrase}
              cropMode={cropMode}
              onCropModeChange={setCropMode}
            />

            {/* Stats card */}
            {images.length > 0 && (
              <div className="bg-brand-card border border-brand-border rounded-xl p-4">
                <h3 className="text-xs font-medium text-brand-muted mb-3">Session Stats</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">{images.length}</div>
                    <div className="text-[10px] text-brand-muted">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-brand-green">
                      {images.filter((i) => i.status === "done").length}
                    </div>
                    <div className="text-[10px] text-brand-muted">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-amber-400">
                      {images.filter((i) => !["done", "error"].includes(i.status)).length}
                    </div>
                    <div className="text-[10px] text-brand-muted">Processing</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Gallery */}
          <ImageGallery
            images={images}
            onRegenerate={handleRegenerate}
            onRemoveBackground={handleRemoveBackground}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-[10px] text-brand-muted/50">
          <span>IsoForge v1.0 — InBioDyn LTS Internal Tool</span>
          <span>Claude Opus 4.5 + Imagen 4 Ultra</span>
        </div>
      </footer>
    </div>
  );
}
