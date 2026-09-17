import { useState, Dispatch, SetStateAction } from "react";
import { Persona, StyleTag } from "../types";
import { minifySystemPrompt } from "../utils/vramCalculator";
import { Sliders, Copy, Check, FileText, Minimize2, Sparkles, Plus, Trash2 } from "lucide-react";

interface PersonaVaultTabProps {
  personas: Persona[];
  setPersonas: Dispatch<SetStateAction<Persona[]>>;
  styles: StyleTag[];
  setStyles: Dispatch<SetStateAction<StyleTag[]>>;
}

export default function PersonaVaultTab({
  personas,
  setPersonas,
  styles,
  setStyles,
}: PersonaVaultTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"personas" | "styles">("personas");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(personas[0]?.id || "");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || personas[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Minify current persona
  const handleMinify = (personaId: string) => {
    setPersonas((prev) =>
      prev.map((p) => {
        if (p.id === personaId) {
          const minified = minifySystemPrompt(p.rawContent);
          const newTokens = Math.round(minified.length / 4);
          return {
            ...p,
            minifiedContent: minified,
            estimatedTokens: newTokens,
          };
        }
        return p;
      })
    );
  };

  // Export all personas in base64 format matching ~/.config/ollama_artgenerate/personas.txt
  const generatePersonasTxt = () => {
    return personas
      .map((p) => {
        const content = p.minifiedContent || p.rawContent;
        const b64 = btoa(unescape(encodeURIComponent(content)));
        return `${p.name}:::${b64}`;
      })
      .join("\n");
  };

  // Export all styles matching ~/.config/ollama_artgenerate/styles.txt
  const generateStylesTxt = () => {
    return styles
      .map((s) => {
        const b64 = btoa(unescape(encodeURIComponent(s.description)));
        return `${s.name}:::${b64}`;
      })
      .join("\n");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Sub-navigation */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("personas")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeSubTab === "personas"
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            System Personas ({personas.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("styles")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeSubTab === "styles"
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Aesthetic Styles ({styles.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              handleCopy(
                activeSubTab === "personas" ? generatePersonasTxt() : generateStylesTxt(),
                "export_txt"
              )
            }
            className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-200 hover:bg-stone-800 transition-colors"
          >
            {copiedKey === "export_txt" ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-cyan-400" />
            )}
            <span>Export to {activeSubTab === "personas" ? "personas.txt" : "styles.txt"}</span>
          </button>
        </div>
      </div>

      {activeSubTab === "personas" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Persona List */}
          <div className="lg:col-span-4 space-y-2">
            <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold block px-1 mb-1">
              Registered Personas
            </span>
            {personas.map((p) => {
              const isSelected = p.id === selectedPersonaId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPersonaId(p.id)}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-colors ${
                    isSelected
                      ? "border-amber-500/60 bg-stone-900 text-stone-100"
                      : "border-stone-800 bg-stone-900/40 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-semibold text-amber-300 truncate max-w-[200px]">
                      {p.name}
                    </span>
                    <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] font-mono text-stone-300">
                      ~{p.estimatedTokens} tokens
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Persona Detail & Optimizer */}
          <div className="lg:col-span-8 flex flex-col min-h-[500px]">
            {selectedPersona && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold font-mono text-stone-100">
                      {selectedPersona.name}
                    </h3>
                    <p className="text-xs text-stone-400">{selectedPersona.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedPersona.isJson && (
                      <button
                        type="button"
                        onClick={() => handleMinify(selectedPersona.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                      >
                        <Minimize2 className="h-3.5 w-3.5" />
                        Minify JSON (~950 Tokens Saved)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          selectedPersona.minifiedContent || selectedPersona.rawContent,
                          "persona_code"
                        )
                      }
                      className="flex items-center gap-1 rounded bg-stone-800 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                    >
                      {copiedKey === "persona_code" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copy
                    </button>
                  </div>
                </div>

                {/* Token stats callout */}
                <div className="flex items-center justify-between rounded-lg bg-stone-950 border border-stone-800 px-3 py-2 text-xs">
                  <span className="text-stone-400">Context footprint:</span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-stone-300">
                      Characters:{" "}
                      <strong className="text-stone-100">
                        {(selectedPersona.minifiedContent || selectedPersona.rawContent).length}
                      </strong>
                    </span>
                    <span className="text-amber-400">
                      Est. Tokens: <strong>~{selectedPersona.estimatedTokens}</strong>
                    </span>
                  </div>
                </div>

                {/* Content Editor / Viewer */}
                <div className="flex-1 overflow-y-auto rounded-lg border border-stone-800 bg-stone-950 p-3">
                  <textarea
                    value={selectedPersona.minifiedContent || selectedPersona.rawContent}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      setPersonas((prev) =>
                        prev.map((p) =>
                          p.id === selectedPersona.id
                            ? {
                                ...p,
                                rawContent: newContent,
                                minifiedContent: undefined,
                                estimatedTokens: Math.round(newContent.length / 4),
                              }
                            : p
                        )
                      );
                    }}
                    rows={18}
                    className="w-full font-mono text-xs text-stone-300 leading-relaxed bg-transparent border-none focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Styles Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {styles.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-stone-800 bg-stone-900/60 p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-amber-300 font-mono">
                    {s.name}
                  </span>
                  <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] text-stone-400 capitalize">
                    {s.category}
                  </span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed mt-1">
                  {s.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-stone-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleCopy(s.description, `style_${s.id}`)}
                  className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-200"
                >
                  {copiedKey === `style_${s.id}` ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy Description
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
