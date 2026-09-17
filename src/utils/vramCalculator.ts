import { VramCalculation } from "../types";

export interface GpuSpec {
  name: string;
  vramGB: number;
}

export const POPULAR_GPUS: GpuSpec[] = [
  { name: "NVIDIA GeForce RTX 5070 Ti", vramGB: 16 },
  { name: "NVIDIA GeForce RTX 4090", vramGB: 24 },
  { name: "NVIDIA GeForce RTX 4080", vramGB: 16 },
  { name: "NVIDIA GeForce RTX 4070 Ti Super", vramGB: 16 },
  { name: "NVIDIA GeForce RTX 4070", vramGB: 12 },
  { name: "NVIDIA GeForce RTX 3090", vramGB: 24 },
  { name: "NVIDIA GeForce RTX 3060", vramGB: 12 },
  { name: "Apple M-Series Unified (36GB)", vramGB: 36 },
];

/**
 * Calculates VRAM breakdown for a given model size and context length
 * Formula:
 * Model VRAM = weight file size on disk (~1.05x to 1.1x with runtime overhead)
 * KV Cache VRAM = 2 * n_layers * n_kv_heads * head_dim * context_tokens * bytes_per_element
 * For modern GQA architectures (like Qwen 27B / Gemma 26B):
 * 27B FP16 KV Cache = ~0.28 MB per token -> 4096 = 1.15 GB, 7168 = 2.01 GB, 8192 = 2.30 GB, 16384 = 4.60 GB
 */
export function calculateVram(
  modelDiskSizeGB: number,
  parameterSize: string,
  contextTokens: number,
  gpuVramGB: number = 16
): VramCalculation {
  // Runtime CUDA runtime overhead + base weights in memory
  const baseRuntimeOverheadGB = 0.6;
  const modelWeightsVramGB = Math.max(modelDiskSizeGB * 0.95, 2.0) + baseRuntimeOverheadGB;

  // KV cache multiplier based on parameter count
  let kvCachePer1000TokensGB = 0.15; // default ~7B - 12B GQA
  const paramNum = parseInt(parameterSize.replace(/[^0-9]/g, "") || "14", 10);

  if (paramNum >= 26) {
    kvCachePer1000TokensGB = 0.28; // 26B-32B (Qwen 27B, Gemma 26B)
  } else if (paramNum >= 14) {
    kvCachePer1000TokensGB = 0.19; // 14B models
  } else {
    kvCachePer1000TokensGB = 0.12; // 8B-9B models
  }

  const kvCacheVramGB = (contextTokens / 1000) * kvCachePer1000TokensGB;
  const totalEstimatedVramGB = modelWeightsVramGB + kvCacheVramGB;
  const headroomGB = gpuVramGB - totalEstimatedVramGB;

  let status: "safe" | "caution" | "oom_risk" = "safe";
  let explanation = "";

  if (totalEstimatedVramGB > gpuVramGB) {
    status = "oom_risk";
    const excess = (totalEstimatedVramGB - gpuVramGB).toFixed(2);
    explanation = `Critical VRAM limit exceeded by ~${excess} GB! Ollama's cudaMalloc will fail (error 500 / out of memory) because the ${gpuVramGB} GB VRAM cannot hold the ${modelDiskSizeGB} GB weights plus ${kvCacheVramGB.toFixed(2)} GB KV cache simultaneously.`;
  } else if (headroomGB < 1.2) {
    status = "caution";
    explanation = `Tight fit: Only ${headroomGB.toFixed(2)} GB VRAM headroom. Ollama may offload 1-2 layers into system RAM. Safe for prompt generation, but don't increase context without testing.`;
  } else {
    status = "safe";
    explanation = `Comfortable fit: ${headroomGB.toFixed(2)} GB VRAM headroom remaining on your ${gpuVramGB} GB GPU. Fast 100% GPU offload with zero RAM fallback lag.`;
  }

  return {
    modelWeightsVramGB: parseFloat(modelWeightsVramGB.toFixed(2)),
    kvCacheVramGB: parseFloat(kvCacheVramGB.toFixed(2)),
    totalEstimatedVramGB: parseFloat(totalEstimatedVramGB.toFixed(2)),
    headroomGB: parseFloat(headroomGB.toFixed(2)),
    status,
    explanation,
  };
}

/**
 * Minifies JSON-based system prompts to strip whitespace tokens,
 * saving ~800 to 1,200 tokens of context without changing a single character of instruction!
 */
export function minifySystemPrompt(content: string): string {
  try {
    const trimmed = content.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed);
    }
  } catch {
    // If not strict JSON, return clean trimmed
  }
  return content.trim();
}

export function formatSystemPrompt(content: string): string {
  try {
    const trimmed = content.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Return original if parsing fails
  }
  return content;
}
