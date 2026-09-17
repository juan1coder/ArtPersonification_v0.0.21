import { useState, useMemo } from "react";
import { OllamaModelSpec } from "../types";
import { calculateVram, POPULAR_GPUS } from "../utils/vramCalculator";
import { Cpu, AlertTriangle, CheckCircle2, XCircle, Info, Zap, Layers } from "lucide-react";

interface VramAdvisorTabProps {
  models: OllamaModelSpec[];
  gpuVramGB: number;
  setGpuVramGB: (gb: number) => void;
  selectedModelName: string;
  setSelectedModelName: (name: string) => void;
}

export default function VramAdvisorTab({
  models,
  gpuVramGB,
  setGpuVramGB,
  selectedModelName,
  setSelectedModelName,
}: VramAdvisorTabProps) {
  const [contextTokens, setContextTokens] = useState<number>(7168);

  const selectedModel =
    models.find((m) => m.name === selectedModelName) || models[0];

  const diskSizeNum = parseFloat(selectedModel?.diskSize.replace(/[^0-9.]/g, "") || "17");

  const calculation = useMemo(() => {
    return calculateVram(
      diskSizeNum,
      selectedModel.parameterSize,
      contextTokens,
      gpuVramGB
    );
  }, [diskSizeNum, selectedModel.parameterSize, contextTokens, gpuVramGB]);

  const ctxPresets = [
    { label: "4,096 (Truncation Risk)", value: 4096, note: "Input ~2,800 + Output hits limit!" },
    { label: "6,144 (Conservative)", value: 6144, note: "Leaves 3,300 tokens for output" },
    { label: "7,168 (Golden Sweet Spot ⭐)", value: 7168, note: "Safe in 16GB + Full Output" },
    { label: "8,192 (Max 16GB)", value: 8192, note: "Tight fit on 16GB VRAM" },
    { label: "16,384 (CUDA OOM Crash)", value: 16384, note: "Requires ~21.5 GB VRAM!" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Top Banner: The Anatomy of the Bug & Fix */}
      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
            <Zap className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold text-amber-300">
              Diagnostic Report: Why 16k Crashed & Why 4k Cut Off Mid-Sentence
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="rounded-lg border border-red-500/20 bg-stone-950 p-3">
                <span className="font-semibold text-red-400 block mb-1">
                  1. The 16,384 Crash (CUDA OOM)
                </span>
                <p className="text-stone-300 leading-relaxed text-[11px]">
                  Qwen-27B weighs <strong>17 GB</strong>. At 16,384 context, the KV cache alone demands <strong>~4.8 GB</strong>. Total needed was <strong>~21.8 GB</strong>. On your 16 GB RTX 5070 Ti, Ollama failed with{" "}
                  <code className="text-red-300 bg-red-950/60 px-1 py-0.5 rounded">cudaMalloc failed: out of memory</code>.
                </p>
              </div>

              <div className="rounded-lg border border-yellow-500/20 bg-stone-950 p-3">
                <span className="font-semibold text-yellow-400 block mb-1">
                  2. The 4,096 Truncation (Hit Context Ceiling)
                </span>
                <p className="text-stone-300 leading-relaxed text-[11px]">
                  Input: Persona JSON (~2,200) + 3 styles (~450) + prompt (~200) = <strong>~2,850 tokens</strong>. That left only <strong>~1,246 tokens</strong> for output. When reaching <code>camera_tech</code>, total tokens hit 4,096 and Ollama exited with <code className="text-yellow-300 bg-yellow-950/60 px-1 py-0.5 rounded">done_reason: length</code>.
                </p>
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-stone-950 p-3">
                <span className="font-semibold text-emerald-400 block mb-1">
                  3. The 7,168 Solution (The Golden Balance)
                </span>
                <p className="text-stone-300 leading-relaxed text-[11px]">
                  At <strong>7,168 context</strong>, KV cache is only <strong>~2.0 GB</strong>. Ollama comfortably fits 14.5 GB in VRAM with zero CUDA errors, while providing <strong>~4,300 tokens</strong> of free runway for the model to finish all compartments!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Parameters */}
        <div className="lg:col-span-5 space-y-5">
          {/* Hardware & GPU Selection */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-2">
              Target Hardware GPU
            </label>
            <div className="space-y-2">
              <select
                value={gpuVramGB}
                onChange={(e) => setGpuVramGB(Number(e.target.value))}
                className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
              >
                {POPULAR_GPUS.map((g) => (
                  <option key={g.name} value={g.vramGB}>
                    {g.name} ({g.vramGB} GB VRAM)
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-between text-xs text-stone-400 px-1">
                <span>Custom VRAM:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={4}
                    max={64}
                    value={gpuVramGB}
                    onChange={(e) => setGpuVramGB(Number(e.target.value))}
                    className="w-16 rounded border border-stone-700 bg-stone-950 px-2 py-1 text-center font-mono text-xs text-stone-100"
                  />
                  <span>GB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Selector */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-amber-400 block mb-2">
              Select Ollama Model
            </label>
            <select
              value={selectedModelName}
              onChange={(e) => setSelectedModelName(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-mono text-stone-100 focus:border-amber-500 focus:outline-none"
            >
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({m.parameterSize} - {m.diskSize})
                </option>
              ))}
            </select>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-stone-300">
              <div className="rounded border border-stone-800 bg-stone-950 p-2">
                <span className="text-stone-400 block">Parameter Class</span>
                <span className="font-semibold text-stone-100 font-mono text-xs">
                  {selectedModel.parameterSize}
                </span>
              </div>
              <div className="rounded border border-stone-800 bg-stone-950 p-2">
                <span className="text-stone-400 block">Model Weight on Disk</span>
                <span className="font-semibold text-stone-100 font-mono text-xs">
                  {selectedModel.diskSize}
                </span>
              </div>
            </div>
          </div>

          {/* Context Slider & Presets */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Context Window (num_ctx)
              </label>
              <span className="font-mono text-xs font-semibold text-stone-100 bg-stone-800 px-2 py-0.5 rounded">
                {contextTokens.toLocaleString()} tokens
              </span>
            </div>

            <input
              type="range"
              min={2048}
              max={16384}
              step={512}
              value={contextTokens}
              onChange={(e) => setContextTokens(Number(e.target.value))}
              className="w-full accent-amber-500"
            />

            {/* Presets */}
            <div className="mt-3 space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-stone-400 block">
                Quick Calibration Presets:
              </span>
              <div className="space-y-1">
                {ctxPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setContextTokens(preset.value)}
                    className={`w-full flex items-center justify-between rounded px-2.5 py-1.5 text-xs text-left border transition-colors ${
                      contextTokens === preset.value
                        ? "border-amber-500/70 bg-amber-500/10 text-amber-200"
                        : "border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                    }`}
                  >
                    <span className="font-mono">{preset.label}</span>
                    <span className="text-[10px] text-stone-400">{preset.note}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Gauge & Analysis */}
        <div className="lg:col-span-7 space-y-5">
          {/* VRAM Gauge */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
            <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-200">
                  Calculated VRAM Footprint
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {calculation.status === "safe" && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Safe Fit in VRAM
                  </span>
                )}
                {calculation.status === "caution" && (
                  <span className="flex items-center gap-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Tight Headroom
                  </span>
                )}
                {calculation.status === "oom_risk" && (
                  <span className="flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 text-xs font-medium text-red-400 animate-pulse">
                    <XCircle className="h-3.5 w-3.5" /> Out of Memory Risk
                  </span>
                )}
              </div>
            </div>

            {/* Visual Bar Indicator */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-stone-300 font-mono">
                <span>
                  Total Projected: <strong>{calculation.totalEstimatedVramGB} GB</strong>
                </span>
                <span>
                  Limit: <strong>{gpuVramGB} GB</strong>
                </span>
              </div>

              <div className="relative h-6 w-full overflow-hidden rounded-lg bg-stone-950 border border-stone-800 flex">
                {/* Model weights */}
                <div
                  style={{
                    width: `${Math.min(
                      (calculation.modelWeightsVramGB / gpuVramGB) * 100,
                      100
                    )}%`,
                  }}
                  className="bg-indigo-600/90 h-full flex items-center justify-center text-[10px] font-mono text-white font-medium"
                  title={`Model Weights: ${calculation.modelWeightsVramGB} GB`}
                >
                  Weights ({calculation.modelWeightsVramGB}G)
                </div>

                {/* KV Cache */}
                <div
                  style={{
                    width: `${Math.min(
                      (calculation.kvCacheVramGB / gpuVramGB) * 100,
                      Math.max(0, 100 - (calculation.modelWeightsVramGB / gpuVramGB) * 100)
                    )}%`,
                  }}
                  className={`h-full flex items-center justify-center text-[10px] font-mono text-white font-medium ${
                    calculation.status === "oom_risk" ? "bg-red-600" : "bg-cyan-600"
                  }`}
                  title={`KV Cache: ${calculation.kvCacheVramGB} GB`}
                >
                  KV ({calculation.kvCacheVramGB}G)
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-indigo-600" />
                  <span>Model Weights (~{calculation.modelWeightsVramGB} GB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-cyan-600" />
                  <span>KV Cache (~{calculation.kvCacheVramGB} GB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-stone-800 border border-stone-600" />
                  <span>
                    Headroom ({calculation.headroomGB > 0 ? calculation.headroomGB : 0} GB)
                  </span>
                </div>
              </div>
            </div>

            {/* Explanation box */}
            <div
              className={`mt-4 rounded-lg p-3.5 text-xs leading-relaxed border ${
                calculation.status === "safe"
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"
                  : calculation.status === "caution"
                  ? "border-yellow-500/20 bg-yellow-500/5 text-yellow-200"
                  : "border-red-500/20 bg-red-500/5 text-red-200"
              }`}
            >
              {calculation.explanation}
            </div>
          </div>

          {/* Model-by-Model Recommended Matrix */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-200 mb-2.5 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-amber-400" />
              Auto-Config Matrix for Your Models (RTX 5070 Ti 16GB)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="border-b border-stone-800 text-[11px] uppercase tracking-wider text-stone-400">
                  <tr>
                    <th className="py-2 px-2.5">Model</th>
                    <th className="py-2 px-2.5">Params</th>
                    <th className="py-2 px-2.5">Rec. num_ctx</th>
                    <th className="py-2 px-2.5">Est. VRAM</th>
                    <th className="py-2 px-2.5">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
                  {models.slice(0, 7).map((m) => {
                    const is27B = parseInt(m.parameterSize, 10) >= 24;
                    return (
                      <tr key={m.name} className="hover:bg-stone-800/30">
                        <td className="py-2 px-2.5 font-sans truncate max-w-[200px]" title={m.name}>
                          {m.name.split("/").pop()}
                        </td>
                        <td className="py-2 px-2.5">{m.parameterSize}</td>
                        <td className="py-2 px-2.5 font-bold text-amber-400">
                          {m.defaultCtxRecommended}
                        </td>
                        <td className="py-2 px-2.5">{m.vramRequirementGB} GB</td>
                        <td className="py-2 px-2.5 font-sans">
                          {is27B ? (
                            <span className="text-emerald-400 font-medium">Sweet Spot (7168)</span>
                          ) : (
                            <span className="text-cyan-400 font-medium">Full 16k Safe</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
