import { useState, useMemo, Dispatch, SetStateAction } from "react";
import { Persona, StyleTag, PromptLogEntry } from "../types";
import { minifySystemPrompt, formatSystemPrompt } from "../utils/vramCalculator";
import { synthesizePromptLocally } from "../utils/localPromptSynthesizer";
import {
  Sparkles,
  Copy,
  Check,
  Terminal,
  Brain,
  ShieldCheck,
  RefreshCw,
  Layers,
  AlertTriangle,
  Zap,
  Minimize2,
  Maximize2,
  Cpu,
  Info,
  Gauge,
  Coins,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";

export type ModelOptionId = "flash_38" | "flash_36" | "flash_35_lite" | "pro_31";

export interface StudioModelSpec {
  id: ModelOptionId;
  name: string;
  badge: string;
  badgeClass: string;
  tagline: string;
  description: string;
  isDefault?: boolean;
  defaultTemperature: number;
  defaultTopP: number;
  defaultMaxOutputTokens: number;
  supportsThinking: boolean;
  costTier: string;
  latency: string;
  recommendedUse: string;
  accentColor: "amber" | "sky" | "emerald" | "cyan";
}

export const STUDIO_MODELS: StudioModelSpec[] = [
  {
    id: "flash_38",
    name: "Flash 3.8",
    badge: "Recommended · Default",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    tagline: "Default Workhorse",
    description: "High-velocity everyday workhorse with balanced nuance, rich prompt expansion, and instant turnaround.",
    isDefault: true,
    defaultTemperature: 0.85,
    defaultTopP: 0.95,
    defaultMaxOutputTokens: 2048,
    supportsThinking: false,
    costTier: "Balanced ($$)",
    latency: "< 1.5s",
    recommendedUse: "Default workhorse for all creative styling, daily image prompts & photo aesthetics.",
    accentColor: "amber",
  },
  {
    id: "flash_36",
    name: "Flash 3.6",
    badge: "High-Agility",
    badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    tagline: "Agile Generation",
    description: "Agile prompt engine optimized for high-throughput generation and disciplined structured prompt syntax.",
    defaultTemperature: 0.80,
    defaultTopP: 0.95,
    defaultMaxOutputTokens: 2048,
    supportsThinking: false,
    costTier: "Fast ($$)",
    latency: "< 1.2s",
    recommendedUse: "Fast iterative experimentation and structured prompt prototyping.",
    accentColor: "sky",
  },
  {
    id: "flash_35_lite",
    name: "Flash 3.5 Lite",
    badge: "Cost-Effective",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    tagline: "Cost-Effective Model",
    description: "Ultra-lean token footprint and minimal latency for cost-effective, high-volume prompt generation.",
    defaultTemperature: 0.70,
    defaultTopP: 0.90,
    defaultMaxOutputTokens: 1024,
    supportsThinking: false,
    costTier: "Lowest ($)",
    latency: "< 0.8s",
    recommendedUse: "High-frequency testing, lean budgets, and rapid initial concept drafts.",
    accentColor: "emerald",
  },
  {
    id: "pro_31",
    name: "Pro 3.1",
    badge: "Heavy Thinking",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    tagline: "Heavy Thinking Tasks",
    description: "Advanced reasoning protocol analyzing historical emulsion, lighting physics, and multi-layer compositions.",
    defaultTemperature: 0.75,
    defaultTopP: 0.95,
    defaultMaxOutputTokens: 4096,
    supportsThinking: true,
    costTier: "Heavy Compute ($$$)",
    latency: "3–5s",
    recommendedUse: "Museum-grade fine art, chiaroscuro subtleties, and complex cinematic directions.",
    accentColor: "cyan",
  },
];

interface WorkshopTabProps {
  personas: Persona[];
  setPersonas: Dispatch<SetStateAction<Persona[]>>;
  styles: StyleTag[];
  onSaveToHistory: (entry: Omit<PromptLogEntry, "id" | "timestamp">) => void;
  selectedModel: string;
}

const PRELOAD_PROMPTS = [
  {
    title: "Vegas Cocktail & Bunnies",
    prompt:
      "a full body potrit view of fleshy blonde woman in her mid twenties, with a golden chpagne pencil dress and heeels, sipping on a drink in a cicktail party in las Vegas red carpet as as ssettign near a bar while she stand sin cou ter psoto surrounded by a villague ox bunnyes wearign tux suits.",
  },
  {
    title: "Slavic Folk Costume in Snow",
    prompt:
      "Slavic woman in Eastern European folk costume with linen embroidery, dark emerald velvet vest, pleated wool skirt, ornate kokoshnik headpiece with pearls, snow-covered pine tree staircase, remote log treehouse at dusk with warm amber interior light.",
  },
  {
    title: "Euro-Asian Albino in Copy Room",
    prompt:
      "a woman euro asian stands inside a copy room, relaxed trance expression, high neckline, long sleeves, living celluloid flesh treated with silver-nitrate emulsion, decaying office transformed into surreal altar, peeling distressed gold leaf.",
  },
];

export default function WorkshopTab({
  personas,
  setPersonas,
  styles,
  onSaveToHistory,
  selectedModel,
}: WorkshopTabProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(personas[0]?.id || "");
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([
    "s_roversi",
    "s_35mm",
    "s_pinup",
  ]);
  const [rawPrompt, setRawPrompt] = useState<string>(PRELOAD_PROMPTS[0].prompt);
  
  // Model selection: Flash 3.8 (default workhorse, recommended), Flash 3.6, Flash 3.5 Lite, and Pro 3.1
  const [modelTier, setModelTier] = useState<ModelOptionId>("flash_38");
  const [thinkMode, setThinkMode] = useState<boolean>(false);
  
  // Dynamic API Configuration parameters synchronized with model tier selection
  const [temperature, setTemperature] = useState<number>(0.85);
  const [topP, setTopP] = useState<number>(0.95);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number>(2048);

  // Context ceiling target for real-time calculation
  const [targetContextLimit, setTargetContextLimit] = useState<number>(7168);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedOutput, setGeneratedOutput] = useState<string>("");
  const [lastModelUsed, setLastModelUsed] = useState<string>("");
  const [fallbackNotice, setFallbackNotice] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];
  const activeStyles = styles.filter((s) => selectedStyleIds.includes(s.id));

  // Current active model specification
  const currentModelSpec = useMemo(
    () => STUDIO_MODELS.find((m) => m.id === modelTier) || STUDIO_MODELS[0],
    [modelTier]
  );

  // Toggle style selections
  const toggleStyle = (id: string) => {
    setSelectedStyleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Dynamically update API configuration parameters whenever a model is selected
  const handleModelTierSelect = (tier: ModelOptionId) => {
    const spec = STUDIO_MODELS.find((m) => m.id === tier) || STUDIO_MODELS[0];
    setModelTier(tier);
    setTemperature(spec.defaultTemperature);
    setTopP(spec.defaultTopP);
    setMaxOutputTokens(spec.defaultMaxOutputTokens);
    setThinkMode(spec.supportsThinking);
  };

  const handleResetModelDefaults = () => {
    setTemperature(currentModelSpec.defaultTemperature);
    setTopP(currentModelSpec.defaultTopP);
    setMaxOutputTokens(currentModelSpec.defaultMaxOutputTokens);
    setThinkMode(currentModelSpec.supportsThinking);
  };

  // Sync think mode with heavy thinking model
  const handleThinkModeToggle = (checked: boolean) => {
    setThinkMode(checked);
    if (checked && modelTier !== "pro_31") {
      handleModelTierSelect("pro_31");
    } else if (!checked && modelTier === "pro_31") {
      handleModelTierSelect("flash_38");
    }
  };

  // Real-time Token Math Calculation
  const personaContent = selectedPersona?.minifiedContent || selectedPersona?.rawContent || "";
  const isPersonaMinified = Boolean(selectedPersona?.minifiedContent);

  const tokenUsage = useMemo(() => {
    // 1 token ~= 3.8 characters for descriptive English and JSON schemas
    const personaTokens = Math.max(1, Math.round(personaContent.length / 3.8));
    const styleDescriptions = activeStyles.map((s) => s.description).join(" ");
    const styleTokens = styleDescriptions ? Math.max(1, Math.round(styleDescriptions.length / 3.8)) : 0;
    const userInputTokens = rawPrompt.trim() ? Math.max(1, Math.round(rawPrompt.length / 3.8)) : 0;

    const totalInputTokens = personaTokens + styleTokens + userInputTokens;
    const headroomTokens = Math.max(0, targetContextLimit - totalInputTokens);
    const consumptionPercent = Math.min(100, Math.round((totalInputTokens / targetContextLimit) * 100));

    const personaPercent = Math.min(100, (personaTokens / targetContextLimit) * 100);
    const stylePercent = Math.min(100, (styleTokens / targetContextLimit) * 100);
    const userPercent = Math.min(100, (userInputTokens / targetContextLimit) * 100);

    let severity: "safe" | "warning" | "critical" = "safe";
    let warningMsg = "";

    if (consumptionPercent >= 80) {
      severity = "critical";
      warningMsg = `🚨 Critical Context Saturation (${consumptionPercent}%): Input consumes ${totalInputTokens} of ${targetContextLimit} tokens, leaving only ${headroomTokens} tokens for output! The generation will likely hit length cutoff mid-sentence.`;
    } else if (consumptionPercent >= 55) {
      severity = "warning";
      warningMsg = `⚠️ High Context Usage (${consumptionPercent}%): Persona schema consumes ${personaTokens} tokens (${Math.round(personaPercent)}% of context). This leaves ${headroomTokens} tokens for output generation. Large schemas (like DS_AVANT_PICTORIAL_SUPERMODEL) may risk truncation if output is verbose.`;
    } else {
      severity = "safe";
      warningMsg = `✅ Ample Output Runway: ${headroomTokens} tokens remaining (${100 - consumptionPercent}% headroom) for full multi-compartment JSON generation.`;
    }

    return {
      personaTokens,
      styleTokens,
      userInputTokens,
      totalInputTokens,
      headroomTokens,
      consumptionPercent,
      personaPercent,
      stylePercent,
      userPercent,
      severity,
      warningMsg,
    };
  }, [personaContent, activeStyles, rawPrompt, targetContextLimit]);

  // Quick action: Minify / unminify persona right from WorkshopTab
  const handleToggleMinifyPersona = () => {
    if (!selectedPersona) return;
    setPersonas((prev) =>
      prev.map((p) => {
        if (p.id === selectedPersona.id) {
          if (p.minifiedContent) {
            // Restore pretty format
            const formatted = formatSystemPrompt(p.rawContent);
            return {
              ...p,
              minifiedContent: undefined,
              rawContent: formatted,
              estimatedTokens: Math.round(formatted.length / 3.8),
            };
          } else {
            // Minify JSON
            const minified = minifySystemPrompt(p.rawContent);
            return {
              ...p,
              minifiedContent: minified,
              estimatedTokens: Math.round(minified.length / 3.8),
            };
          }
        }
        return p;
      })
    );
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run generation via Gemini API server endpoint with bullet-proof error handling & zero-downtime fallback
  const handleGenerate = async (overrideTier?: ModelOptionId) => {
    if (!rawPrompt.trim()) return;
    // Guard against DOM click events or unknown values being mistakenly passed as tier
    const validTier: ModelOptionId =
      overrideTier && STUDIO_MODELS.some((m) => m.id === overrideTier)
        ? overrideTier
        : modelTier;

    if (overrideTier && STUDIO_MODELS.some((m) => m.id === overrideTier)) {
      handleModelTierSelect(overrideTier);
    }

    setIsGenerating(true);
    setErrorMessage("");
    setFallbackNotice("");
    setGeneratedOutput("");

    try {
      const styleDescriptions = activeStyles.map((s) => `${s.name}: ${s.description}`);
      let response: Response;
      try {
        response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: rawPrompt,
            persona: personaContent,
            styles: styleDescriptions,
            thinkMode: validTier === "pro_31" ? true : thinkMode,
            modelTier: validTier,
            temperature: temperature,
            topP: topP,
            maxOutputTokens: maxOutputTokens || 2048,
          }),
        });
      } catch (fetchErr: any) {
        // Offline or connection dropped: invoke local studio synthesizer
        console.warn("API route unreachable, activating zero-downtime local synthesis fallback:", fetchErr);
        const localRes = synthesizePromptLocally(
          rawPrompt,
          selectedPersona?.name || "Custom Persona",
          personaContent,
          activeStyles
        );
        setGeneratedOutput(localRes.result);
        setLastModelUsed(localRes.modelNameDisplay);
        setFallbackNotice("⚡ Zero-Downtime Fallback: Cloud endpoint was temporarily offline. Synthesized instantly using Local Studio Engine.");
        onSaveToHistory({
          model: localRes.modelNameDisplay,
          persona: selectedPersona?.name || "Custom Persona",
          styles: activeStyles.map((s) => s.name),
          rawPrompt: rawPrompt,
          generatedOutput: localRes.result,
          status: "success",
          tokensUsed: tokenUsage.totalInputTokens,
        });
        return;
      }

      // Safely extract text to prevent 'Unexpected token <' parsing exceptions
      const responseText = await response.text();
      const isHtmlResponse =
        responseText.trim().startsWith("<") ||
        responseText.toLowerCase().includes("<!doctype html") ||
        responseText.toLowerCase().includes("<html");

      if (isHtmlResponse) {
        // Reverse proxy or container reboot returned an HTML gateway page
        console.warn("Gateway returned HTML response. Activating zero-downtime local studio synthesizer.");
        const localRes = synthesizePromptLocally(
          rawPrompt,
          selectedPersona?.name || "Custom Persona",
          personaContent,
          activeStyles
        );
        setGeneratedOutput(localRes.result);
        setLastModelUsed(localRes.modelNameDisplay);
        setFallbackNotice(
          "⚡ Zero-Downtime Fallback: Server container was reloading, so your prompt was synthesized instantly by the Local Studio Engine."
        );
        onSaveToHistory({
          model: localRes.modelNameDisplay,
          persona: selectedPersona?.name || "Custom Persona",
          styles: activeStyles.map((s) => s.name),
          rawPrompt: rawPrompt,
          generatedOutput: localRes.result,
          status: "success",
          tokensUsed: tokenUsage.totalInputTokens,
        });
        return;
      }

      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        // Non-JSON response: fall back cleanly
        const localRes = synthesizePromptLocally(
          rawPrompt,
          selectedPersona?.name || "Custom Persona",
          personaContent,
          activeStyles
        );
        setGeneratedOutput(localRes.result);
        setLastModelUsed(localRes.modelNameDisplay);
        setFallbackNotice("⚡ Synthesized via Local Studio Engine.");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status} Error: Unable to complete prompt generation.`);
      }

      const activeSpec = STUDIO_MODELS.find((m) => m.id === validTier) || STUDIO_MODELS[0];
      setGeneratedOutput(data.result || "");
      setLastModelUsed(data.modelNameDisplay || `${activeSpec.name} (${activeSpec.tagline})`);
      if (data.fallbackNotice) {
        setFallbackNotice(data.fallbackNotice);
      }

      // Save to lossless history
      onSaveToHistory({
        model: data.modelNameDisplay || `${activeSpec.name} (${activeSpec.tagline})`,
        persona: selectedPersona?.name || "Custom Persona",
        styles: activeStyles.map((s) => s.name),
        rawPrompt: rawPrompt,
        generatedOutput: data.result || "",
        status: "success",
        tokensUsed: tokenUsage.totalInputTokens,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Instant local synthesis (zero API dependency)
  const handleLocalSynthesize = () => {
    if (!rawPrompt.trim()) return;
    setIsGenerating(true);
    setErrorMessage("");
    setFallbackNotice("");
    try {
      const localRes = synthesizePromptLocally(
        rawPrompt,
        selectedPersona?.name || "Custom Persona",
        personaContent,
        activeStyles
      );
      setGeneratedOutput(localRes.result);
      setLastModelUsed(localRes.modelNameDisplay);
      setFallbackNotice("Synthesized via Local Studio Engine (Zero Cloud API Dependencies).");
      onSaveToHistory({
        model: localRes.modelNameDisplay,
        persona: selectedPersona?.name || "Custom Persona",
        styles: activeStyles.map((s) => s.name),
        rawPrompt: rawPrompt,
        generatedOutput: localRes.result,
        status: "success",
        tokensUsed: tokenUsage.totalInputTokens,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to synthesize prompt locally.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Attempt to parse JSON response for compartment breakdown
  let parsedJson: any = null;
  if (generatedOutput) {
    try {
      const match = generatedOutput.match(/\{[\s\S]*\}/);
      if (match) {
        parsedJson = JSON.parse(match[0]);
      }
    } catch {
      parsedJson = null;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* ── TOP: REAL-TIME TOKEN USAGE & CONTEXT HEADROOM MONITOR ── */}
      <div
        className={`mb-6 rounded-xl border p-4 transition-all ${
          tokenUsage.severity === "critical"
            ? "border-red-500/50 bg-red-950/20 shadow-lg shadow-red-950/20"
            : tokenUsage.severity === "warning"
            ? "border-amber-500/50 bg-amber-950/15"
            : "border-stone-800 bg-stone-900/60"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                tokenUsage.severity === "critical"
                  ? "bg-red-500/20 text-red-400 animate-pulse"
                  : tokenUsage.severity === "warning"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-emerald-500/15 text-emerald-400"
              }`}
            >
              {tokenUsage.severity === "critical" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : tokenUsage.severity === "warning" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Cpu className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-100">
                  Real-Time Context Budget Monitor
                </span>
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] font-mono font-semibold ${
                    tokenUsage.severity === "critical"
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : tokenUsage.severity === "warning"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {tokenUsage.consumptionPercent}% Consumed
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Persona Schema vs. User Input vs. Available Generation Runway
              </p>
            </div>
          </div>

          {/* Context Ceiling Target Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400 text-[11px] shrink-0">Target Window:</span>
            <select
              value={targetContextLimit}
              onChange={(e) => setTargetContextLimit(Number(e.target.value))}
              className="rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1 font-mono text-xs text-amber-300 focus:border-amber-500 focus:outline-none"
            >
              <option value={4096}>4,096 tokens (Legacy Danger Zone ⚠️)</option>
              <option value={7168}>7,168 tokens (RTX 5070 Ti Sweet Spot ⭐)</option>
              <option value={8192}>8,192 tokens (16GB Max)</option>
              <option value={12288}>12,288 tokens (14B Models)</option>
              <option value={16384}>16,384 tokens (Full Window)</option>
            </select>
          </div>
        </div>

        {/* Multi-segment visual token bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-stone-300">
            <span>
              Total Input: <strong>{tokenUsage.totalInputTokens.toLocaleString()}</strong> tokens
            </span>
            <span>
              Output Runway:{" "}
              <strong
                className={
                  tokenUsage.severity === "critical"
                    ? "text-red-400"
                    : tokenUsage.severity === "warning"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }
              >
                {tokenUsage.headroomTokens.toLocaleString()}
              </strong>{" "}
              tokens of {targetContextLimit.toLocaleString()}
            </span>
          </div>

          <div className="relative h-4 w-full overflow-hidden rounded-md bg-stone-950 border border-stone-800 flex">
            {/* Persona Segment */}
            <div
              style={{ width: `${tokenUsage.personaPercent}%` }}
              className="bg-indigo-600/90 transition-all duration-300"
              title={`Persona Schema: ${tokenUsage.personaTokens} tokens (${Math.round(tokenUsage.personaPercent)}%)`}
            />

            {/* Styles Segment */}
            <div
              style={{ width: `${tokenUsage.stylePercent}%` }}
              className="bg-amber-600/90 transition-all duration-300"
              title={`Styles: ${tokenUsage.styleTokens} tokens (${Math.round(tokenUsage.stylePercent)}%)`}
            />

            {/* User Input Segment */}
            <div
              style={{ width: `${tokenUsage.userPercent}%` }}
              className="bg-cyan-500/90 transition-all duration-300"
              title={`User Prompt: ${tokenUsage.userInputTokens} tokens (${Math.round(tokenUsage.userPercent)}%)`}
            />

            {/* Remaining Output Runway */}
            <div
              style={{
                width: `${Math.max(
                  0,
                  100 - (tokenUsage.personaPercent + tokenUsage.stylePercent + tokenUsage.userPercent)
                )}%`,
              }}
              className="bg-emerald-950/40"
              title={`Available Output Runway: ${tokenUsage.headroomTokens} tokens`}
            />
          </div>

          {/* Breakdown Legend with Real-time Numbers */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-400">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block" />
                <span>
                  Persona Schema:{" "}
                  <strong className="text-stone-200 font-mono">
                    {tokenUsage.personaTokens} tokens
                  </strong>{" "}
                  ({Math.round(tokenUsage.personaPercent)}%)
                </span>
              </span>

              {tokenUsage.styleTokens > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                  <span>
                    Styles:{" "}
                    <strong className="text-stone-200 font-mono">
                      {tokenUsage.styleTokens} tokens
                    </strong>
                  </span>
                </span>
              )}

              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block" />
                <span>
                  User Input:{" "}
                  <strong className="text-stone-200 font-mono">
                    {tokenUsage.userInputTokens} tokens
                  </strong>
                </span>
              </span>
            </div>

            {/* In-bar Quick Minify / Elevate Actions */}
            {selectedPersona?.isJson && (
              <button
                type="button"
                onClick={handleToggleMinifyPersona}
                className="flex items-center gap-1 rounded bg-stone-800 px-2 py-0.5 text-[11px] text-amber-300 hover:bg-stone-700 hover:text-white transition-colors border border-stone-700"
              >
                {isPersonaMinified ? (
                  <>
                    <Maximize2 className="h-3 w-3" />
                    Expand Persona Schema
                  </>
                ) : (
                  <>
                    <Minimize2 className="h-3 w-3 text-emerald-400" />
                    ⚡ Minify Persona JSON (~950 Tokens Saved)
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Context Warning Alert Box */}
        {tokenUsage.severity !== "safe" && (
          <div
            className={`mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-lg p-3 text-xs leading-relaxed border ${
              tokenUsage.severity === "critical"
                ? "border-red-500/40 bg-red-500/10 text-red-200"
                : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200"
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <span>{tokenUsage.warningMsg}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {targetContextLimit === 4096 && (
                <button
                  type="button"
                  onClick={() => setTargetContextLimit(7168)}
                  className="rounded bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-stone-950 hover:bg-amber-400"
                >
                  Switch to 7,168 Sweet Spot
                </button>
              )}
              {selectedPersona?.isJson && !isPersonaMinified && (
                <button
                  type="button"
                  onClick={handleToggleMinifyPersona}
                  className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500"
                >
                  ⚡ Minify Persona Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Input and Configurations */}
        <div className="flex flex-col gap-5 lg:col-span-6">
          {/* 4-Tier Model Selector & Dynamic Parameter Matrix */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Active Model Engine & Generator
              </label>
              <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
                Active:{" "}
                <span className={`rounded border px-2 py-0.5 text-[11px] font-bold font-mono ${currentModelSpec.badgeClass}`}>
                  {currentModelSpec.name} · {currentModelSpec.tagline}
                </span>
              </span>
            </div>

            {/* 4 Models Interactive Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STUDIO_MODELS.map((spec) => {
                const isSelected = modelTier === spec.id;
                let activeBorderClass = "border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700 hover:text-stone-200";
                if (isSelected) {
                  if (spec.accentColor === "amber") {
                    activeBorderClass = "border-amber-500/80 bg-amber-500/10 text-stone-100 ring-1 ring-amber-500/50";
                  } else if (spec.accentColor === "sky") {
                    activeBorderClass = "border-sky-500/80 bg-sky-500/10 text-stone-100 ring-1 ring-sky-500/50";
                  } else if (spec.accentColor === "emerald") {
                    activeBorderClass = "border-emerald-500/80 bg-emerald-500/10 text-stone-100 ring-1 ring-emerald-500/50";
                  } else {
                    activeBorderClass = "border-cyan-500/80 bg-cyan-500/10 text-stone-100 ring-1 ring-cyan-500/50";
                  }
                }

                return (
                  <button
                    key={spec.id}
                    type="button"
                    id={`btn-model-${spec.id}`}
                    onClick={() => handleModelTierSelect(spec.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all relative ${activeBorderClass}`}
                  >
                    <div className="flex items-center gap-1.5 w-full justify-between mb-1.5">
                      <span className="text-xs font-bold flex items-center gap-1 text-stone-100">
                        {spec.id === "pro_31" ? (
                          <Brain className="h-3.5 w-3.5 text-cyan-400" />
                        ) : spec.id === "flash_35_lite" ? (
                          <Coins className="h-3.5 w-3.5 text-emerald-400" />
                        ) : spec.id === "flash_36" ? (
                          <Gauge className="h-3.5 w-3.5 text-sky-400" />
                        ) : (
                          <Zap className="h-3.5 w-3.5 text-amber-400" />
                        )}
                        {spec.name}
                      </span>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${spec.badgeClass}`}>
                        {spec.badge}
                      </span>
                    </div>

                    <div className="text-[11px] font-medium text-stone-300 mb-1">
                      {spec.tagline}
                    </div>

                    <p className="text-[11px] text-stone-400 leading-snug mb-2.5">
                      {spec.description}
                    </p>

                    <div className="mt-auto pt-2 border-t border-stone-800/80 w-full flex items-center justify-between text-[10px] font-mono text-stone-400">
                      <span>T:{spec.defaultTemperature} · P:{spec.defaultTopP}</span>
                      <span className="text-stone-300">{spec.costTier}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic API Configuration Parameters Panel */}
            <div className="mt-3.5 rounded-xl border border-stone-800 bg-stone-950/80 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-stone-800/70">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-semibold text-stone-200">
                    API Parameters (Dynamically Updated)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                    ⚡ Auto-tuned for {currentModelSpec.name}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetModelDefaults}
                    title="Reset parameters to model's recommended defaults"
                    className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-stone-200 border border-stone-800 hover:border-stone-700 rounded px-1.5 py-0.5 transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Defaults
                  </button>
                </div>
              </div>

              {/* Parameter Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Temperature */}
                <div className="rounded-lg border border-stone-800/60 bg-stone-900/50 p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-stone-300 font-medium">Temperature</span>
                    <span className="text-[11px] font-mono font-bold text-amber-400">
                      {temperature.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-stone-800 rounded cursor-pointer mb-2"
                  />
                  <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono">
                    <span>Focused (0.4)</span>
                    <span>Creative (1.2)</span>
                  </div>
                </div>

                {/* Top-P */}
                <div className="rounded-lg border border-stone-800/60 bg-stone-900/50 p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-stone-300 font-medium">Top-P Sampling</span>
                    <span className="text-[11px] font-mono font-bold text-sky-400">
                      {topP.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 mb-1">
                    {[0.85, 0.90, 0.95, 1.0].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTopP(val)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                          Math.abs(topP - val) < 0.01
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold"
                            : "bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200"
                        }`}
                      >
                        {val.toFixed(2)}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono text-center">
                    Nucleus distribution
                  </div>
                </div>

                {/* Output Budget */}
                <div className="rounded-lg border border-stone-800/60 bg-stone-900/50 p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-stone-300 font-medium">Output Budget</span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400">
                      {maxOutputTokens} tok
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 mb-1">
                    {[1024, 2048, 4096, 8192].map((tokens) => (
                      <button
                        key={tokens}
                        type="button"
                        onClick={() => setMaxOutputTokens(tokens)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono transition-colors ${
                          maxOutputTokens === tokens
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                            : "bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200"
                        }`}
                      >
                        {tokens >= 1024 ? `${tokens / 1024}k` : tokens}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono text-center">
                    num_predict ceiling
                  </div>
                </div>
              </div>

              {/* Model Capability & Recommendation Footnote */}
              <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-400">
                <span className="text-stone-300 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-stone-400" />
                  <strong>Recommended Use:</strong> {currentModelSpec.recommendedUse}
                </span>
                <span className="font-mono text-[10px] text-stone-500">
                  Latency: {currentModelSpec.latency} · Cost: {currentModelSpec.costTier}
                </span>
              </div>
            </div>
          </div>

          {/* Persona Card */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                1. System Persona (Prompt Engine)
              </label>
              <div className="flex items-center gap-2">
                {selectedPersona?.isJson && (
                  <button
                    type="button"
                    onClick={handleToggleMinifyPersona}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 underline"
                  >
                    {isPersonaMinified ? "Expand JSON" : "⚡ Minify JSON"}
                  </button>
                )}
                <span className="rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-300 font-mono">
                  ~{tokenUsage.personaTokens} tokens
                </span>
              </div>
            </div>

            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
            >
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isJson ? (p.minifiedContent ? "(Minified JSON ⚡)" : "(JSON Schema)") : ""}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-stone-400 leading-relaxed">
              {selectedPersona?.description}
            </p>
          </div>

          {/* Styles Selection */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                2. Aesthetic Styles & Inflections
              </label>
              <span className="text-xs text-stone-400">
                {activeStyles.length} selected ({tokenUsage.styleTokens} tokens)
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {styles.map((style) => {
                const isSelected = selectedStyleIds.includes(style.id);
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleStyle(style.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition-colors border ${
                      isSelected
                        ? "border-amber-500/70 bg-amber-500/15 text-amber-300 font-medium"
                        : "border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                    }`}
                  >
                    {style.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Base Prompt Input with Zero-Loss Pre-fill */}
          <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                3. Base User Prompt
              </label>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Lossless Auto-Save Active</span>
              </div>
            </div>

            {/* Quick Templates */}
            <div className="mb-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-stone-400 text-[11px] shrink-0">Preload:</span>
              {PRELOAD_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRawPrompt(item.prompt)}
                  className="rounded border border-stone-800 bg-stone-950 px-2 py-0.5 text-stone-300 hover:border-stone-600 hover:text-stone-100 whitespace-nowrap text-[11px]"
                >
                  {item.title}
                </button>
              ))}
            </div>

            <textarea
              value={rawPrompt}
              onChange={(e) => setRawPrompt(e.target.value)}
              rows={5}
              placeholder="Describe your raw image vision here..."
              className="w-full rounded-lg border border-stone-700 bg-stone-950 p-3 text-xs leading-relaxed text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800/80 pt-3">
              {/* Thinking Mode Switch */}
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={thinkMode}
                  onChange={(e) => handleThinkModeToggle(e.target.checked)}
                  className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-0 focus:ring-offset-0"
                />
                <Brain className={`h-4 w-4 ${thinkMode ? "text-cyan-400" : "text-stone-500"}`} />
                <span>Deep Thinking Protocol ({modelTier === "pro" ? "Gemini 3.1 Pro" : "Standard"})</span>
              </label>

              {/* Input Token Indicator */}
              <div className="text-[11px] font-mono text-stone-400">
                User Input Tokens:{" "}
                <span className="text-cyan-400 font-semibold">{tokenUsage.userInputTokens}</span>
              </div>
            </div>

            {/* Token Allocation Controls */}
            <div className="mt-3 rounded-lg border border-stone-800/80 bg-stone-950/70 p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-medium text-stone-300 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Target Output Budget (num_predict):
                </span>
                <div className="flex items-center gap-1 text-[11px]">
                  {[1024, 2048, 4096, 8192].map((tokens) => (
                    <button
                      key={tokens}
                      type="button"
                      onClick={() => setMaxOutputTokens(tokens)}
                      className={`px-2 py-0.5 rounded font-mono transition-colors ${
                        maxOutputTokens === tokens
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 font-semibold"
                          : "bg-stone-900 text-stone-400 border border-stone-800 hover:text-stone-200"
                      }`}
                    >
                      {tokens >= 1024 ? `${tokens / 1024}k` : tokens}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-stone-400 pt-1.5 border-t border-stone-800/50">
                <span>Context Ceiling Limit:</span>
                <div className="flex items-center gap-1">
                  {[4096, 7168, 16384, 32768].map((limit) => (
                    <button
                      key={limit}
                      type="button"
                      onClick={() => setTargetContextLimit(limit)}
                      className={`px-1.5 py-0.5 rounded font-mono ${
                        targetContextLimit === limit
                          ? "bg-stone-700 text-stone-100 font-medium"
                          : "text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      {limit === 7168 ? "7.1k (Sweet Spot)" : `${Math.round(limit / 1024)}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                id="btn-generate-prompt"
                onClick={() => handleGenerate()}
                disabled={isGenerating || !rawPrompt.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-xs font-semibold text-stone-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating with {currentModelSpec.name}...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Prompt ({currentModelSpec.name})
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-local-synth"
                onClick={handleLocalSynthesize}
                disabled={isGenerating || !rawPrompt.trim()}
                title="Synthesize instantly with Local Studio Engine (No network or external API dependency)"
                className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-800 hover:text-stone-100 transition-colors disabled:opacity-50"
              >
                <Cpu className="h-4 w-4 text-emerald-400" />
                Local Synth
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Results & Compartment Visualizer */}
        <div className="flex flex-col gap-4 lg:col-span-6">
          <div className="flex-1 rounded-xl border border-stone-800 bg-stone-900/60 p-4 flex flex-col min-h-[480px]">
            <div className="mb-3 flex items-center justify-between border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-200">
                  Prompt Output & Compartments
                </h2>
                {lastModelUsed && (
                  <span className="rounded bg-stone-800 border border-stone-700 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                    {lastModelUsed}
                  </span>
                )}
              </div>

              {generatedOutput && (
                <div className="flex items-center gap-2">
                  <div className="flex rounded-md border border-stone-800 bg-stone-950 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setViewMode("formatted")}
                      className={`px-2 py-0.5 rounded ${
                        viewMode === "formatted"
                          ? "bg-stone-800 text-stone-100 font-medium"
                          : "text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Compartments
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("raw")}
                      className={`px-2 py-0.5 rounded ${
                        viewMode === "raw"
                          ? "bg-stone-800 text-stone-100 font-medium"
                          : "text-stone-400 hover:text-stone-200"
                      }`}
                    >
                      Raw Text
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(generatedOutput, "full")}
                    className="flex items-center gap-1 rounded bg-stone-800 px-2 py-1 text-xs text-stone-300 hover:bg-stone-700"
                  >
                    {copiedKey === "full" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy All
                  </button>
                </div>
              )}
            </div>

            {/* Fallback Notice */}
            {fallbackNotice && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                <Info className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{fallbackNotice}</span>
              </div>
            )}

            {/* Error banner with smart retry options */}
            {errorMessage && (
              <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3.5 text-xs text-red-200">
                <div className="flex items-start gap-2 mb-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <span className="font-mono">{errorMessage}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-500/20">
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    className="flex items-center gap-1.5 rounded bg-red-500/20 border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-200 hover:bg-red-500/30"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry Now
                  </button>
                  <button
                    type="button"
                    onClick={handleLocalSynthesize}
                    className="flex items-center gap-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
                  >
                    <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                    Synthesize with Local Engine
                  </button>
                  {modelTier !== "flash_38" && (
                    <button
                      type="button"
                      onClick={() => handleGenerate("flash_38")}
                      className="flex items-center gap-1.5 rounded bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/30"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      Switch to Flash 3.8 (Default Workhorse)
                    </button>
                  )}
                  {modelTier !== "flash_35_lite" && (
                    <button
                      type="button"
                      onClick={() => handleGenerate("flash_35_lite")}
                      className="flex items-center gap-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
                    >
                      <Coins className="h-3.5 w-3.5 text-emerald-400" />
                      Switch to Flash 3.5 Lite (Cost-Effective)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Output Display */}
            {!generatedOutput && !isGenerating && (
              <div className="flex flex-1 flex-col items-center justify-center text-center p-8 text-stone-500">
                <Layers className="h-10 w-10 text-stone-600 mb-3" />
                <p className="text-xs font-medium text-stone-400">Ready to Expand Vision</p>
                <p className="text-[11px] text-stone-500 max-w-sm mt-1">
                  Choose your persona, select desired styles, select your model engine, and click "Generate Prompt" to synthesize the final pipeline-ready art prompt.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-stone-400">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Zap className="h-3.5 w-3.5" /> Flash 3.8 (Default)
                  </span>
                  <span className="flex items-center gap-1 text-sky-400">
                    <Gauge className="h-3.5 w-3.5" /> Flash 3.6 (Agile)
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Coins className="h-3.5 w-3.5" /> Flash 3.5 Lite (Cost-Effective)
                  </span>
                  <span className="flex items-center gap-1 text-cyan-400">
                    <Brain className="h-3.5 w-3.5" /> Pro 3.1 (Heavy Thinking)
                  </span>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-amber-400">
                <RefreshCw className="h-8 w-8 animate-spin text-amber-400 mb-3" />
                <p className="text-xs font-medium text-stone-300">
                  Synthesizing with {currentModelSpec.name} ({currentModelSpec.tagline})...
                </p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Harmonizing lighting, materials, optics, and photographic composition...
                </p>
              </div>
            )}

            {generatedOutput && (
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {viewMode === "formatted" && parsedJson ? (
                  <>
                    {/* Final Compounded Prompt (Priority Callout) */}
                    {parsedJson.final_compounded_prompt && (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                            Final Compounded Prompt (SD / Midjourney / FLUX)
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(parsedJson.final_compounded_prompt, "final_compounded")
                            }
                            className="flex items-center gap-1 rounded bg-emerald-950 border border-emerald-700/50 px-2 py-0.5 text-[11px] text-emerald-200 hover:bg-emerald-900"
                          >
                            {copiedKey === "final_compounded" ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Copy Prompt
                          </button>
                        </div>
                        <p className="text-xs text-emerald-100 font-serif leading-relaxed">
                          {parsedJson.final_compounded_prompt}
                        </p>
                      </div>
                    )}

                    {/* Negative Prompt */}
                    {parsedJson.negative_prompt && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                            Negative Prompt
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(parsedJson.negative_prompt, "negative")}
                            className="flex items-center gap-1 text-[11px] text-red-300 hover:text-red-200"
                          >
                            {copiedKey === "negative" ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Copy
                          </button>
                        </div>
                        <p className="text-[11px] text-stone-300 font-mono leading-normal">
                          {parsedJson.negative_prompt}
                        </p>
                      </div>
                    )}

                    {/* Detailed Compartments Accordion Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {parsedJson.subject && (
                        <div className="rounded-lg border border-stone-800 bg-stone-950 p-2.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                            01. Subject
                          </span>
                          <p className="text-stone-300 text-[11px] leading-relaxed">
                            {parsedJson.subject}
                          </p>
                        </div>
                      )}

                      {parsedJson.environment && (
                        <div className="rounded-lg border border-stone-800 bg-stone-950 p-2.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                            02. Environment
                          </span>
                          <p className="text-stone-300 text-[11px] leading-relaxed">
                            {parsedJson.environment}
                          </p>
                        </div>
                      )}

                      {parsedJson.lighting && (
                        <div className="rounded-lg border border-stone-800 bg-stone-950 p-2.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                            03. Lighting
                          </span>
                          <p className="text-stone-300 text-[11px] leading-relaxed">
                            {parsedJson.lighting}
                          </p>
                        </div>
                      )}

                      {parsedJson.color && (
                        <div className="rounded-lg border border-stone-800 bg-stone-950 p-2.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                            04. Color & Palette
                          </span>
                          <p className="text-stone-300 text-[11px] leading-relaxed">
                            {parsedJson.color}
                          </p>
                        </div>
                      )}

                      {parsedJson.materials && (
                        <div className="rounded-lg border border-stone-800 bg-stone-950 p-2.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                            05. Materials & Texture
                          </span>
                          <p className="text-stone-300 text-[11px] leading-relaxed">
                            {parsedJson.materials}
                          </p>
                        </div>
                      )}

                      {parsedJson.camera_tech && (
                        <div className="rounded-lg border border-stone-800 bg-stone-950 p-2.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block mb-1">
                            06. Camera & Optics
                          </span>
                          <p className="text-stone-300 text-[11px] leading-relaxed">
                            {parsedJson.camera_tech}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <pre className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-xs font-mono text-stone-200 whitespace-pre-wrap leading-relaxed">
                    {generatedOutput}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
