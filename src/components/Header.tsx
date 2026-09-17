import { Sparkles, Cpu, Terminal, FileCode, History, Sliders } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  gpuName: string;
  gpuVram: number;
}

export default function Header({
  activeTab,
  setActiveTab,
  gpuName,
  gpuVram,
}: HeaderProps) {
  const tabs = [
    { id: "workshop", label: "Prompt Workshop", icon: Sparkles },
    { id: "vram", label: "VRAM & Context Advisor", icon: Cpu },
    { id: "script", label: "Ollama Script Exporter", icon: FileCode },
    { id: "personas", label: "Persona & Style Vault", icon: Sliders },
    { id: "history", label: "Lossless History", icon: History },
  ];

  return (
    <header className="border-b border-stone-800 bg-stone-950 text-stone-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-stone-100">
                ArtPersona Studio
              </h1>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-medium text-emerald-400">
                Ollama v0.12+ Ready
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Local LLM Art Prompts, Dynamic VRAM Calibration & Anti-Data Loss
            </p>
          </div>
        </div>

        {/* GPU Specs Badge */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-stone-800 bg-stone-900/80 px-3 py-1.5 text-stone-300">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-stone-200">{gpuName}</span>
            <span className="rounded bg-cyan-950 border border-cyan-800/60 px-1.5 py-0.2 font-mono text-cyan-300 font-semibold">
              {gpuVram} GB VRAM
            </span>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-amber-400 text-amber-300 bg-stone-900/50 rounded-t-md"
                    : "border-transparent text-stone-400 hover:border-stone-700 hover:text-stone-200"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-amber-400" : "text-stone-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
