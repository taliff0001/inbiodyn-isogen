/**
 * Crop a transparent PNG to its content bounding box, then output to a canvas.
 *
 * @param dataUrl  - Source image as a data URL (must have transparency for best results)
 * @param mode     - "square": output is always 1024×1024
 *                   "natural": output is 1024px wide, height scales to preserve proportions
 * @param canvasWidth  - Output width in pixels (default 1024)
 * @param paddingPct   - Fractional padding added on each side (default 0.05 = 5%)
 */
export async function cropToCanvas(
  dataUrl: string,
  mode: "square" | "natural" = "square",
  canvasWidth = 1024,
  paddingPct = 0.05
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Draw source image to a temp canvas to read pixels
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = img.naturalWidth;
      srcCanvas.height = img.naturalHeight;
      const srcCtx = srcCanvas.getContext("2d")!;
      srcCtx.drawImage(img, 0, 0);

      const { width: W, height: H } = srcCanvas;
      const pixels = srcCtx.getImageData(0, 0, W, H).data;

      // Find the bounding box of non-transparent pixels (alpha > 10)
      let minX = W, maxX = 0, minY = H, maxY = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const alpha = pixels[(y * W + x) * 4 + 3];
          if (alpha > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      // If fully transparent or no content found, return original unchanged
      if (minX >= maxX || minY >= maxY) {
        resolve(dataUrl);
        return;
      }

      const contentW = maxX - minX + 1;
      const contentH = maxY - minY + 1;

      // Add padding based on the larger dimension
      const pad = Math.round(Math.max(contentW, contentH) * paddingPct);
      const srcX = Math.max(0, minX - pad);
      const srcY = Math.max(0, minY - pad);
      const srcW = Math.min(W - srcX, contentW + pad * 2);
      const srcH = Math.min(H - srcY, contentH + pad * 2);

      // Determine output canvas size
      const outW = canvasWidth;
      let outH: number;

      if (mode === "square") {
        outH = canvasWidth;
      } else {
        // Natural mode: preserve aspect ratio, width = canvasWidth
        outH = Math.round((srcH / srcW) * canvasWidth);
      }

      // In square mode, fit the cropped region inside the square (letterbox if needed)
      let destX = 0, destY = 0, destW = outW, destH = outH;
      if (mode === "square") {
        const scale = Math.min(outW / srcW, outH / srcH);
        destW = Math.round(srcW * scale);
        destH = Math.round(srcH * scale);
        destX = Math.round((outW - destW) / 2);
        destY = Math.round((outH - destH) / 2);
      }

      const outCanvas = document.createElement("canvas");
      outCanvas.width = outW;
      outCanvas.height = outH;
      const outCtx = outCanvas.getContext("2d")!;

      // Transparent background
      outCtx.clearRect(0, 0, outW, outH);
      outCtx.drawImage(srcCanvas, srcX, srcY, srcW, srcH, destX, destY, destW, destH);

      resolve(outCanvas.toDataURL("image/png"));
    };

    img.onerror = () => resolve(dataUrl); // Fallback: return original on error
    img.src = dataUrl;
  });
}
