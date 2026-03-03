export interface GeneratedImage {
  id: string;
  filename: string;
  weight: number;
  description: string;
  prompt: string;
  imageDataUrl: string | null;        // Original with background
  transparentDataUrl: string | null;  // Background removed
  status: "queued" | "prompting" | "generating" | "removing-bg" | "done" | "error";
  error?: string;
  createdAt: string;
}

export interface BatchItem {
  id: string;
  weight: number;
  description: string;
}

export interface ApiKeys {
  anthropic: string;
  google: string;
}

export const WEIGHT_CLASSES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70] as const;

export type WeightClass = (typeof WEIGHT_CLASSES)[number];

export type CropMode = "square" | "natural";
