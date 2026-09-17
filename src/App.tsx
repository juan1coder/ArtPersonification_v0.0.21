import { useState, useEffect } from "react";
import Header from "./components/Header";
import WorkshopTab from "./components/WorkshopTab";
import VramAdvisorTab from "./components/VramAdvisorTab";
import ScriptExporterTab from "./components/ScriptExporterTab";
import PersonaVaultTab from "./components/PersonaVaultTab";
import HistoryTab from "./components/HistoryTab";
import { DEFAULT_PERSONAS, DEFAULT_STYLES, DEFAULT_MODELS } from "./data/defaultData";
import { Persona, StyleTag, OllamaModelSpec, PromptLogEntry } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("vram");
  const [gpuName] = useState<string>("NVIDIA GeForce RTX 5070 Ti");
  const [gpuVramGB, setGpuVramGB] = useState<number>(16);

  const [models] = useState<OllamaModelSpec[]>(DEFAULT_MODELS);
  const [selectedModelName, setSelectedModelName] = useState<string>(
    "hf.co/unsloth/Qwen3.8-27B-GGUF:UD-Q4_K_M"
  );

  const [personas, setPersonas] = useState<Persona[]>(() => {
    try {
      const saved = localStorage.getItem("artpersona_personas");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_PERSONAS;
  });

  const [styles, setStyles] = useState<StyleTag[]>(() => {
    try {
      const saved = localStorage.getItem("artpersona_styles");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_STYLES;
  });

  const [history, setHistory] = useState<PromptLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem("artpersona_history");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "log_initial_1",
        timestamp: "Today, 19:00:48",
        model: "hf.co/unsloth/Qwen3.8-27B-GGUF:UD-Q4_K_M",
        persona: "DS_AVANT_PICTORIAL_SUPERMODEL",
        styles: [
          "Roversi-Cameron 2.0 Pictorialist Haze",
          "35mm",
          "Pinup Reinassance Beauty",
        ],
        rawPrompt:
          "a full body potrit view of fleshy blonde woman in her mid twenties, with a golden chpagne pencil dress and heeels, sipping on a drink in a cicktail party in las Vegas red carpet as as ssettign near a bar while she stand sin cou ter psoto surrounded by a villague ox bunnyes wearign tux suits.",
        generatedOutput:
          "{\n  \"subject\": \"A fleshy blonde woman in her mid-twenties, poised with languid yet controlled social confidence...\",\n  \"environment\": \"A decadent Las Vegas cocktail reception on an opulent crimson red carpet near an obsidian polished lacquer bar...\",\n  \"pose_inflection\": \"Standing in subtle counterposto contrapposto, sipping champagne from a delicate coupe crystal glass...\",\n  \"lighting\": \"Soft north window ambient base fused with warm halogen amber downlights and blooming specular silver nitrate highlights...\",\n  \"color\": \"Golden champagne, ivory, faded rose, deep tobacco shadows, rich ruby red carpet...\",\n  \"materials\": \"Liquid metallic champagne satin pencil dress, fine tailored wool tuxedo suits on surrounding anthropomorphic bunny attendants...\",\n  \"camera_tech\": \"Shot on large format 8x10 Polaroid emulsion with 1970s pictorialist lens softness...\",\n  \"final_compounded_prompt\": \"Cinematic 1970s pictorialist photograph, full body portrait of a voluptuous woman in her mid-twenties wearing a form-fitting golden champagne satin pencil dress and stiletto heels, sipping a cocktail with subtle haughty confidence, standing in counterposto contrapposto surrounded by an uncanny society of anthropomorphic rabbits in tailored black tuxedos, lavish Las Vegas cocktail gala, plush red carpet, atmospheric smoke haze, soft amber lighting with silver nitrate blooming highlights, analog film texture.\",\n  \"negative_prompt\": \"plastic skin, digital CGI render, 3D polygon, watermark, cartoon, oversaturated\"\n}",
        status: "success",
      },
    ];
  });

  // Persist changes
  useEffect(() => {
    try {
      localStorage.setItem("artpersona_personas", JSON.stringify(personas));
    } catch {}
  }, [personas]);

  useEffect(() => {
    try {
      localStorage.setItem("artpersona_styles", JSON.stringify(styles));
    } catch {}
  }, [styles]);

  useEffect(() => {
    try {
      localStorage.setItem("artpersona_history", JSON.stringify(history));
    } catch {}
  }, [history]);

  const handleSaveToHistory = (
    entry: Omit<PromptLogEntry, "id" | "timestamp">
  ) => {
    const newEntry: PromptLogEntry = {
      ...entry,
      id: `log_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setHistory((prev) => [newEntry, ...prev]);
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("artpersona_history");
    } catch {}
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 selection:bg-amber-500/30 selection:text-amber-200">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        gpuName={gpuName}
        gpuVram={gpuVramGB}
      />

      <main className="pb-16">
        {activeTab === "workshop" && (
          <WorkshopTab
            personas={personas}
            setPersonas={setPersonas}
            styles={styles}
            onSaveToHistory={handleSaveToHistory}
            selectedModel={selectedModelName}
          />
        )}

        {activeTab === "vram" && (
          <VramAdvisorTab
            models={models}
            gpuVramGB={gpuVramGB}
            setGpuVramGB={setGpuVramGB}
            selectedModelName={selectedModelName}
            setSelectedModelName={setSelectedModelName}
          />
        )}

        {activeTab === "script" && (
          <ScriptExporterTab gpuVramGB={gpuVramGB} />
        )}

        {activeTab === "personas" && (
          <PersonaVaultTab
            personas={personas}
            setPersonas={setPersonas}
            styles={styles}
            setStyles={setStyles}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            history={history}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>
    </div>
  );
}
