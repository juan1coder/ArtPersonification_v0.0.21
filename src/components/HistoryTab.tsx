import { useState } from "react";
import { PromptLogEntry } from "../types";
import { History, Copy, Check, Trash2, Clock, Sparkles, Terminal, FileText } from "lucide-react";

interface HistoryTabProps {
  history: PromptLogEntry[];
  onClearHistory: () => void;
}

export default function HistoryTab({ history, onClearHistory }: HistoryTabProps) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    history[0]?.id || null
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const selectedEntry = history.find((h) => h.id === selectedEntryId) || history[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-5">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-200">
            Lossless Prompt Logs & Archive
          </h2>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-400">
            {history.length} Saved Prompts
          </span>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Archive
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-stone-800 bg-stone-900/40 text-stone-500">
          <FileText className="h-10 w-10 text-stone-600 mb-3" />
          <p className="text-xs font-medium text-stone-300">No Prompt Logs Yet</p>
          <p className="text-[11px] text-stone-500 max-w-sm mt-1">
            Every prompt you generate or test is automatically preserved here in local storage with zero data loss.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* History list */}
          <div className="lg:col-span-4 space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {history.map((entry) => {
              const isSelected = entry.id === (selectedEntryId || history[0].id);
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntryId(entry.id)}
                  className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                    isSelected
                      ? "border-amber-500/60 bg-stone-900 text-stone-100"
                      : "border-stone-800 bg-stone-900/40 text-stone-400 hover:border-stone-700 hover:text-stone-200"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {entry.timestamp}
                    </span>
                    <span className="font-mono text-amber-400 text-[10px] truncate max-w-[120px]">
                      {entry.persona}
                    </span>
                  </div>

                  <p className="text-xs text-stone-200 line-clamp-2 leading-relaxed font-sans">
                    {entry.rawPrompt}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-stone-500">
                    <span className="truncate max-w-[140px]">{entry.model}</span>
                    <span className="text-emerald-400 font-mono">Preserved ✓</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Entry Detail */}
          <div className="lg:col-span-8 flex flex-col min-h-[500px]">
            {selectedEntry && (
              <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-4 flex-1 flex flex-col space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-100">
                        Log Entry Details
                      </span>
                      <span className="text-xs text-stone-400">({selectedEntry.timestamp})</span>
                    </div>
                    <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                      Model: {selectedEntry.model} • Persona: {selectedEntry.persona}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(selectedEntry.generatedOutput, `hist_${selectedEntry.id}`)
                    }
                    className="flex items-center gap-1 rounded bg-stone-800 px-2.5 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
                  >
                    {copiedKey === `hist_${selectedEntry.id}` ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy Generated Output
                  </button>
                </div>

                {/* Raw Prompt Section */}
                <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                      Raw User Prompt (No-Loss Backup)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedEntry.rawPrompt, "raw_copy")}
                      className="text-[10px] text-stone-400 hover:text-stone-200"
                    >
                      Copy Prompt
                    </button>
                  </div>
                  <p className="text-xs text-stone-200 font-sans leading-relaxed">
                    {selectedEntry.rawPrompt}
                  </p>
                </div>

                {/* Styles applied */}
                {selectedEntry.styles && selectedEntry.styles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-stone-400">Applied Styles:</span>
                    {selectedEntry.styles.map((s, idx) => (
                      <span
                        key={idx}
                        className="rounded border border-stone-800 bg-stone-900 px-2 py-0.5 text-[10px] text-stone-300"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                {/* Generated Output */}
                <div className="flex-1 flex flex-col rounded-lg border border-stone-800 bg-stone-950 p-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mb-1.5">
                    Generated Art Prompt Response
                  </span>
                  <div className="flex-1 overflow-y-auto">
                    <pre className="text-xs font-mono text-stone-300 whitespace-pre-wrap leading-relaxed">
                      {selectedEntry.generatedOutput}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
